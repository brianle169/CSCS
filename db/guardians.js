import db from "./pool.js";

// Guardianship lives across three tables — FamilyMembers (the person),
// GuardianOf (the dated link to a minor, carrying Primary/Secondary), and
// LocatedAt (which branch a new guardian is registered at) — so every write
// here runs in a transaction.
//
// Two club rules shape this module, and neither can be a CHECK constraint:
//   1. A minor has exactly one ACTIVE Primary guardian. Half of this IS
//      enforced by the schema, via the uq_guardianof_one_active_primary
//      functional unique index, which is why promoting a guardian must demote
//      the incumbent FIRST — MySQL checks uniqueness per statement, so the
//      two-step order matters.
//   2. A minor has at least two ACTIVE guardians. Nothing in the database
//      enforces this, so endGuardianship() below is the only thing standing
//      between the data and a minor with one guardian.

export async function getGuardiansByMinor() {
  try {
    const [rows] = await db.execute(
      "SELECT g.MembershipNumber AS MembershipNumber, g.FamilyMemberID AS FamilyMemberID, " +
        "g.RelationshipType AS RelationshipType, g.GuardianType AS GuardianType, " +
        "DATE_FORMAT(g.StartDate, '%Y-%m-%d') AS StartDate, " +
        "fm.FirstName AS FirstName, fm.LastName AS LastName, " +
        "fm.PhoneNumber AS PhoneNumber, fm.Email AS Email " +
        "FROM `GuardianOf` g " +
        "JOIN `FamilyMembers` fm ON fm.FamilyMemberID = g.FamilyMemberID " +
        "WHERE g.EndDate IS NULL " +
        // Primary first so each minor's card reads primary-then-secondaries.
        "ORDER BY g.MembershipNumber, g.GuardianType = 'Primary' DESC, fm.LastName",
    );

    return rows.reduce((acc, row) => {
      (acc[row.MembershipNumber] = acc[row.MembershipNumber] || []).push(row);
      return acc;
    }, {});
  } catch (err) {
    console.error("Error fetching guardians:", err);
    return {};
  }
}

async function assertMinor(connection, membershipNumber) {
  const [rows] = await connection.execute(
    "SELECT MembershipNumber FROM `MinorMembers` WHERE MembershipNumber = ?",
    [membershipNumber],
  );
  if (rows.length === 0) {
    throw new Error("Only minor members can have guardians.");
  }
}

// Demote whoever currently holds Primary for this minor. Must run BEFORE the
// new Primary is written, or the unique index rejects the second one.
async function clearPrimary(connection, membershipNumber, exceptFamilyMemberId) {
  await connection.execute(
    "UPDATE `GuardianOf` SET GuardianType = 'Secondary' " +
      "WHERE MembershipNumber = ? AND EndDate IS NULL AND GuardianType = 'Primary' " +
      "AND FamilyMemberID <> ?",
    [membershipNumber, exceptFamilyMemberId],
  );
}

// Attaches one guardian to a minor on an ALREADY-OPEN transaction. Shared by
// the "add a guardian to an existing member" flow and by member registration,
// which needs the guardians created in the same transaction as the member.
//
// `locationId` is where a brand-new person gets registered (LocatedAt). The two
// callers source it differently — an existing member's current BelongsTo row,
// versus the location of the team a new member is joining — so it is passed in
// rather than looked up here. Pass null to skip the LocatedAt row.
export async function attachGuardian(connection, membershipNumber, locationId, spec) {
  const guardianType = spec.guardianType === "Primary" ? "Primary" : "Secondary";
  if (!spec.relationshipType) {
    throw new Error("Each guardian needs a relationship type.");
  }

  let familyMemberId;

  if (spec.mode === "existing") {
    familyMemberId = Number(spec.familyMemberId);
    if (!familyMemberId) {
      throw new Error("Select an existing family member to link.");
    }
    const [rows] = await connection.execute(
      "SELECT FamilyMemberID FROM `FamilyMembers` WHERE FamilyMemberID = ?",
      [familyMemberId],
    );
    if (rows.length === 0) {
      throw new Error("That family member no longer exists.");
    }
    // Re-linking someone who already guards this minor would collide on the
    // primary key (FamilyMemberID, MembershipNumber, StartDate).
    const [dupe] = await connection.execute(
      "SELECT FamilyMemberID FROM `GuardianOf` " +
        "WHERE FamilyMemberID = ? AND MembershipNumber = ? AND EndDate IS NULL",
      [familyMemberId, membershipNumber],
    );
    if (dupe.length > 0) {
      throw new Error("That person is already an active guardian of this member.");
    }
  } else {
    if (!spec.firstName || !spec.lastName || !spec.dateOfBirth || !spec.ssn) {
      throw new Error(
        "A new guardian needs a first name, last name, date of birth and SSN.",
      );
    }
    const [result] = await connection.execute(
      "INSERT INTO `FamilyMembers` (SSN, MedicareCardNumber, FirstName, LastName, DateOfBirth, PhoneNumber, Address, City, Province, PostalCode, Email) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        spec.ssn,
        spec.medicareCardNumber || null,
        spec.firstName,
        spec.lastName,
        spec.dateOfBirth,
        spec.phoneNumber || null,
        spec.address || null,
        spec.city || null,
        spec.province || null,
        spec.postalCode || null,
        spec.email || null,
      ],
    );
    familyMemberId = result.insertId;

    // Only brand-new people get a LocatedAt row — someone being linked already
    // has their own history there.
    if (locationId) {
      await connection.execute(
        "INSERT INTO `LocatedAt` (FamilyMemberID, LocationID, StartDate, EndDate) VALUES (?, ?, CURDATE(), NULL)",
        [familyMemberId, locationId],
      );
    }
  }

  if (guardianType === "Primary") {
    await clearPrimary(connection, membershipNumber, familyMemberId);
  }

  await connection.execute(
    "INSERT INTO `GuardianOf` (FamilyMemberID, MembershipNumber, RelationshipType, GuardianType, StartDate, EndDate) " +
      "VALUES (?, ?, ?, ?, CURDATE(), NULL)",
    [familyMemberId, membershipNumber, spec.relationshipType, guardianType],
  );

  return familyMemberId;
}

export async function addGuardian(membershipNumber, data) {
  if (!membershipNumber || !data) {
    throw new Error("Membership number and guardian details are required.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await assertMinor(connection, membershipNumber);

    const [locationRows] = await connection.execute(
      "SELECT LocationID FROM `BelongsTo` " +
        "WHERE MembershipNumber = ? AND EndDate IS NULL " +
        "ORDER BY StartDate DESC LIMIT 1",
      [membershipNumber],
    );

    const familyMemberId = await attachGuardian(
      connection,
      membershipNumber,
      locationRows[0] ? locationRows[0].LocationID : null,
      data,
    );

    await connection.commit();
    return { familyMemberId };
  } catch (err) {
    await connection.rollback();
    console.error("Error adding guardian:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// Promotion only. There is deliberately no "make secondary" — demoting the
// primary directly would leave the minor with no primary at all, so the way to
// change primaries is to promote someone else and let this demote the incumbent.
export async function makePrimaryGuardian(membershipNumber, familyMemberId) {
  if (!membershipNumber || !familyMemberId) {
    throw new Error("Membership number and family member are required.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT GuardianType FROM `GuardianOf` " +
        "WHERE FamilyMemberID = ? AND MembershipNumber = ? AND EndDate IS NULL",
      [familyMemberId, membershipNumber],
    );
    if (rows.length === 0) {
      throw new Error("That person is not an active guardian of this member.");
    }
    if (rows[0].GuardianType === "Primary") {
      await connection.commit();
      return { changed: false };
    }

    await clearPrimary(connection, membershipNumber, familyMemberId);
    await connection.execute(
      "UPDATE `GuardianOf` SET GuardianType = 'Primary' " +
        "WHERE FamilyMemberID = ? AND MembershipNumber = ? AND EndDate IS NULL",
      [familyMemberId, membershipNumber],
    );

    await connection.commit();
    return { changed: true };
  } catch (err) {
    await connection.rollback();
    console.error("Error changing guardian priority:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// Closes the guardianship rather than deleting it, so the history of who was
// responsible for a minor and when survives.
export async function endGuardianship(membershipNumber, familyMemberId) {
  if (!membershipNumber || !familyMemberId) {
    throw new Error("Membership number and family member are required.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [active] = await connection.execute(
      "SELECT FamilyMemberID, GuardianType FROM `GuardianOf` " +
        "WHERE MembershipNumber = ? AND EndDate IS NULL",
      [membershipNumber],
    );
    const target = active.find((g) => g.FamilyMemberID === Number(familyMemberId));
    if (!target) {
      throw new Error("That person is not an active guardian of this member.");
    }
    if (active.length <= 2) {
      throw new Error(
        "A minor member must keep at least two guardians. Add a replacement before ending this one.",
      );
    }
    if (target.GuardianType === "Primary") {
      throw new Error(
        "This is the primary guardian. Make another guardian primary first, then end this one.",
      );
    }

    await connection.execute(
      "UPDATE `GuardianOf` SET EndDate = CURDATE() " +
        "WHERE FamilyMemberID = ? AND MembershipNumber = ? AND EndDate IS NULL",
      [familyMemberId, membershipNumber],
    );

    await connection.commit();
    return { ended: true };
  } catch (err) {
    await connection.rollback();
    console.error("Error ending guardianship:", err);
    throw err;
  } finally {
    connection.release();
  }
}

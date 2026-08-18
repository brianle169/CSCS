import db from "./pool.js";
import { attachGuardian } from "./guardians.js";

// Annual fee; not in the schema, so this is the single source of truth.
const MEMBERSHIP_FEES = { Major: 200, Minor: 100 };

export async function getClubMembers() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `ClubMembers`");
    return results;
  } catch (err) {
    return [];
  }
}

export async function getClubMembersWithLocationsAndTeams() {
  try {
    const [results] = await db.execute(
      "SELECT l.LocationID AS LocationID, l.Name AS LocationName, " +
        "t.TeamID AS TeamID, t.Name AS TeamName, t.Gender AS TeamGender, " +
        "cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "DATE_FORMAT(cm.DateOfBirth, '%Y-%m-%d') AS DateOfBirth, cm.Gender AS Gender, " +
        "cm.Height AS Height, cm.Weight AS Weight, " +
        "cm.SSN AS SSN, cm.MedicareCardNumber AS MedicareCardNumber, " +
        "cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, cm.Address AS Address, cm.City AS City, " +
        "cm.Province AS Province, cm.PostalCode AS PostalCode, " +
        "CASE WHEN cm.MembershipNumber IS NULL THEN NULL " +
        "     WHEN mj.MembershipNumber IS NOT NULL THEN 'Major' ELSE 'Minor' END AS MemberType, " +
        "(SELECT COALESCE(SUM(p.Amount), 0) FROM `Payments` p WHERE p.MembershipNumber = cm.MembershipNumber AND p.MembershipYear = YEAR(CURDATE())) AS CurrentYearPaid, " +
        "(SELECT COALESCE(SUM(p.Amount), 0) FROM `Payments` p WHERE p.MembershipNumber = cm.MembershipNumber AND p.MembershipYear = YEAR(CURDATE()) - 1) AS PreviousYearPaid " +
        "FROM `Teams` t " +
        "JOIN `Locations` l ON t.LocationID = l.LocationID " +
        "LEFT JOIN `PlaysFor` pf ON pf.TeamID = t.TeamID AND pf.EndDate IS NULL " +
        "LEFT JOIN `ClubMembers` cm ON cm.MembershipNumber = pf.MembershipNumber " +
        "LEFT JOIN `MajorMembers` mj ON cm.MembershipNumber = mj.MembershipNumber " +
        "LEFT JOIN `MinorMembers` mn ON cm.MembershipNumber = mn.MembershipNumber " +
        "ORDER BY l.Name, t.Name",
    );

    const groupedResults = results.reduce((acc, row) => {
      if (!acc[row.LocationID]) {
        acc[row.LocationID] = {
          LocationID: row.LocationID,
          LocationName: row.LocationName,
          Teams: {},
        };
      }
      const location = acc[row.LocationID];

      if (!location.Teams[row.TeamID]) {
        location.Teams[row.TeamID] = {
          TeamID: row.TeamID,
          TeamName: row.TeamName,
          TeamGender: row.TeamGender,
          Major: [],
          Minor: [],
        };
      }
      const team = location.Teams[row.TeamID];

      // LEFT JOIN gives an all-null row for an empty team; skip it.
      if (row.MembershipNumber === null) return acc;

      const fee = MEMBERSHIP_FEES[row.MemberType];

      const member = {
        MembershipNumber: row.MembershipNumber,
        MemberType: row.MemberType,
        FirstName: row.FirstName,
        LastName: row.LastName,
        DateOfBirth: row.DateOfBirth,
        Gender: row.Gender,
        Height: row.Height,
        Weight: row.Weight,
        SSN: row.SSN,
        MedicareCardNumber: row.MedicareCardNumber,
        PhoneNumber: row.PhoneNumber,
        Email: row.Email,
        Address: row.Address,
        City: row.City,
        Province: row.Province,
        PostalCode: row.PostalCode,
        TeamID: row.TeamID,
        Fee: fee,
        CurrentYearPaid: Number(row.CurrentYearPaid),
        IsFullyPaidThisYear: Number(row.CurrentYearPaid) >= fee,
        // Simplification: checks last year's payment against the current
        // fee, since past status isn't tracked.
        IsActive: Number(row.PreviousYearPaid) >= fee,
      };

      (row.MemberType === "Major" ? team.Major : team.Minor).push(member);

      return acc;
    }, {});

    return groupedResults;
  } catch (err) {
    console.error("Error fetching club members grouped by location/team:", err);
    return {};
  }
}

export async function getTeams() {
  try {
    const [results] = await db.execute("SELECT * FROM `Teams`");
    return results;
  } catch (err) {
    return [];
  }
}

export async function getTeamCount() {
  try {
    const [[{ n }]] = await db.execute("SELECT COUNT(*) AS n FROM `Teams`");
    return n;
  } catch (err) {
    console.error("Error counting teams:", err);
    return 0;
  }
}

export async function getActiveClubMemberCount() {
  try {
    const [[{ n }]] = await db.execute(
      "SELECT COUNT(*) AS n FROM `ClubMembers` cm " +
        "LEFT JOIN `MajorMembers` mj ON mj.MembershipNumber = cm.MembershipNumber " +
        "LEFT JOIN (" +
        "  SELECT MembershipNumber, SUM(Amount) AS PreviousYearPaid " +
        "  FROM `Payments` WHERE MembershipYear = YEAR(CURDATE()) - 1 " +
        "  GROUP BY MembershipNumber" +
        ") py ON py.MembershipNumber = cm.MembershipNumber " +
        "WHERE COALESCE(py.PreviousYearPaid, 0) >= " +
        "  CASE WHEN mj.MembershipNumber IS NOT NULL THEN ? ELSE ? END",
      [MEMBERSHIP_FEES.Major, MEMBERSHIP_FEES.Minor],
    );
    return n;
  } catch (err) {
    console.error("Error counting active club members:", err);
    return 0;
  }
}

function calculateAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export async function addClubMember(data) {
  if (!data) {
    throw new Error("No data provided for adding club member");
  }

  const age = calculateAge(data.dateOfBirth);
  if (age < 4) {
    throw new Error(
      "A new club member must be at least 4 years old at the time of registration.",
    );
  }

  const isMinor = age < 18;
  const guardians = isMinor ? data.guardians || [] : [];

  if (isMinor) {
    if (guardians.length < 2) {
      throw new Error(
        "A minor member needs two guardians at registration: one primary and one secondary.",
      );
    }
    const linked = guardians
      .filter((g) => g.mode === "existing")
      .map((g) => String(g.familyMemberId));
    if (new Set(linked).size !== linked.length) {
      throw new Error("The two guardians must be different people.");
    }
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "INSERT INTO `ClubMembers` (FirstName, LastName, DateOfBirth, Gender, Height, Weight, SSN, MedicareCardNumber, PhoneNumber, Email, Address, City, Province, PostalCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.gender,
        data.height || null,
        data.weight || null,
        data.ssn,
        data.medicareCardNumber || null,
        data.phoneNumber || null,
        data.email || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
      ],
    );

    const membershipNumber = result.insertId;

    await connection.execute(
      age >= 18
        ? "INSERT INTO `MajorMembers` (MembershipNumber) VALUES (?)"
        : "INSERT INTO `MinorMembers` (MembershipNumber) VALUES (?)",
      [membershipNumber],
    );

    // Team assignment is a PlaysFor spell, not a column on the member.
    await connection.execute(
      "INSERT INTO `PlaysFor` (MembershipNumber, StartDate, TeamID, EndDate) VALUES (?, CURDATE(), ?, NULL)",
      [membershipNumber, data.teamId],
    );

    if (isMinor) {
      // New member has no BelongsTo row yet, so use the team's branch.
      const [teamRows] = await connection.execute(
        "SELECT LocationID FROM `Teams` WHERE TeamID = ?",
        [data.teamId],
      );
      const locationId = teamRows[0] ? teamRows[0].LocationID : null;

      // Primary first, so attachGuardian's demote-on-write isn't a no-op.
      await attachGuardian(connection, membershipNumber, locationId, {
        ...guardians[0],
        guardianType: "Primary",
      });
      await attachGuardian(connection, membershipNumber, locationId, {
        ...guardians[1],
        guardianType: "Secondary",
      });
    }

    await connection.commit();
    return { membershipNumber };
  } catch (err) {
    await connection.rollback();
    console.error("Error adding club member:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function deleteClubMember(membershipNumber) {
  if (!membershipNumber) {
    throw new Error("No membership number provided for deletion");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // The other subtype DELETE is a harmless no-op.
    await connection.execute(
      "DELETE FROM `MajorMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );
    await connection.execute(
      "DELETE FROM `MinorMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );

    // PlaysFor's FK means spells must go before the member row.
    await connection.execute(
      "DELETE FROM `PlaysFor` WHERE MembershipNumber = ?",
      [membershipNumber],
    );

    const [results] = await connection.execute(
      "DELETE FROM `ClubMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );

    await connection.commit();
    return results;
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting club member:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function editClubMember(membershipNumber, data) {
  if (!membershipNumber || !data) {
    throw new Error("Membership number and data are required for editing");
  }

  const age = calculateAge(data.dateOfBirth);

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE `ClubMembers` SET FirstName = ?, LastName = ?, DateOfBirth = ?, Gender = ?, Height = ?, Weight = ?, SSN = ?, MedicareCardNumber = ?, PhoneNumber = ?, Email = ?, Address = ?, City = ?, Province = ?, PostalCode = ? WHERE MembershipNumber = ?",
      [
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.gender,
        data.height || null,
        data.weight || null,
        data.ssn,
        data.medicareCardNumber || null,
        data.phoneNumber || null,
        data.email || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
        membershipNumber,
      ],
    );

    const [openSpells] = await connection.execute(
      "SELECT TeamID, DATE_FORMAT(StartDate, '%Y-%m-%d') AS StartDate, StartDate = CURDATE() AS StartedToday " +
        "FROM `PlaysFor` WHERE MembershipNumber = ? AND EndDate IS NULL " +
        "ORDER BY StartDate DESC LIMIT 1",
      [membershipNumber],
    );
    const currentSpell = openSpells[0];
    const newTeamId = Number(data.teamId);

    if (!currentSpell) {
      await connection.execute(
        "INSERT INTO `PlaysFor` (MembershipNumber, StartDate, TeamID, EndDate) VALUES (?, CURDATE(), ?, NULL)",
        [membershipNumber, newTeamId],
      );
    } else if (currentSpell.TeamID !== newTeamId) {
      if (Number(currentSpell.StartedToday) === 1) {
        await connection.execute(
          "UPDATE `PlaysFor` SET TeamID = ? WHERE MembershipNumber = ? AND StartDate = ?",
          [newTeamId, membershipNumber, currentSpell.StartDate],
        );
      } else {
        await connection.execute(
          "UPDATE `PlaysFor` SET EndDate = CURDATE() WHERE MembershipNumber = ? AND StartDate = ?",
          [membershipNumber, currentSpell.StartDate],
        );
        await connection.execute(
          "INSERT INTO `PlaysFor` (MembershipNumber, StartDate, TeamID, EndDate) VALUES (?, CURDATE(), ?, NULL)",
          [membershipNumber, newTeamId],
        );
      }
    }

    // Recompute Major/Minor in case DateOfBirth changed their status.
    await connection.execute(
      "DELETE FROM `MajorMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );
    await connection.execute(
      "DELETE FROM `MinorMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );
    await connection.execute(
      age >= 18
        ? "INSERT INTO `MajorMembers` (MembershipNumber) VALUES (?)"
        : "INSERT INTO `MinorMembers` (MembershipNumber) VALUES (?)",
      [membershipNumber],
    );

    await connection.commit();
    return { membershipNumber };
  } catch (err) {
    await connection.rollback();
    console.error("Error editing club member:", err);
    throw err;
  } finally {
    connection.release();
  }
}

// --- Payments (kept here: uses MEMBERSHIP_FEES, only called from a member's Pay action) ---

export async function addPayment(data) {
  if (!data) {
    throw new Error("No data provided for adding payment");
  }

  const amount = parseFloat(data.amount);
  if (!amount || amount <= 0) {
    throw new Error("Payment amount must be greater than 0.");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [majorRows] = await connection.execute(
      "SELECT MembershipNumber FROM `MajorMembers` WHERE MembershipNumber = ?",
      [data.membershipNumber],
    );
    const fee =
      majorRows.length > 0 ? MEMBERSHIP_FEES.Major : MEMBERSHIP_FEES.Minor;

    const [[existing]] = await connection.execute(
      "SELECT COUNT(*) AS installments, COALESCE(SUM(Amount), 0) AS totalPaid " +
        "FROM `Payments` WHERE MembershipNumber = ? AND MembershipYear = ?",
      [data.membershipNumber, data.membershipYear],
    );

    if (Number(existing.totalPaid) >= fee) {
      throw new Error(
        "This member is already fully paid for this membership year.",
      );
    }
    if (existing.installments >= 4) {
      throw new Error(
        "This member has already reached the maximum of 4 installments for this membership year.",
      );
    }

    const installmentNumber = existing.installments + 1;

    await connection.execute(
      "INSERT INTO `Payments` (MembershipNumber, PaymentDate, MembershipYear, Amount, PaymentMethod, InstallmentNumber) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.membershipNumber,
        data.paymentDate,
        data.membershipYear,
        amount,
        data.paymentMethod,
        installmentNumber,
      ],
    );

    const newTotal = Number(existing.totalPaid) + amount;
    const donation = newTotal > fee ? Number((newTotal - fee).toFixed(2)) : 0;

    await connection.commit();
    return { installmentNumber, newTotal, fee, donation };
  } catch (err) {
    await connection.rollback();
    console.error("Error adding payment:", err);
    throw err;
  } finally {
    connection.release();
  }
}

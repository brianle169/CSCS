import db from "./pool.js";

// Annual membership fee, per the club's rules — not stored in the schema
// anywhere, so it lives here as the single source of truth for both the
// club-members display (fee/active status) and payment validation.
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
        "DATE_FORMAT(cm.DateOfBirth, '%Y-%m-%d') AS DateOfBirth, cm.Height AS Height, cm.Weight AS Weight, " +
        "cm.SSN AS SSN, cm.MedicareCardNumber AS MedicareCardNumber, " +
        "cm.PhoneNumber AS PhoneNumber, cm.Address AS Address, cm.City AS City, " +
        "cm.Province AS Province, cm.PostalCode AS PostalCode, " +
        "CASE WHEN mj.MembershipNumber IS NOT NULL THEN 'Major' ELSE 'Minor' END AS MemberType, " +
        "(SELECT COALESCE(SUM(p.Amount), 0) FROM `Payments` p WHERE p.MembershipNumber = cm.MembershipNumber AND p.MembershipYear = YEAR(CURDATE())) AS CurrentYearPaid, " +
        "(SELECT COALESCE(SUM(p.Amount), 0) FROM `Payments` p WHERE p.MembershipNumber = cm.MembershipNumber AND p.MembershipYear = YEAR(CURDATE()) - 1) AS PreviousYearPaid " +
        "FROM `ClubMembers` cm " +
        "JOIN `Teams` t ON cm.TeamID = t.TeamID " +
        "JOIN `Locations` l ON t.LocationID = l.LocationID " +
        "LEFT JOIN `MajorMembers` mj ON cm.MembershipNumber = mj.MembershipNumber " +
        "LEFT JOIN `MinorMembers` mn ON cm.MembershipNumber = mn.MembershipNumber " +
        "ORDER BY l.Name, t.Name",
    );

    // Transform the flat rows into Location -> Team -> {Major, Minor} groups.
    // Note: ClubMembers.TeamID is nullable, so a member with no team assigned
    // would be silently excluded by the JOIN to Teams above — accepted for
    // now, to be enforced/handled once that situation is possible.
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

      const fee = MEMBERSHIP_FEES[row.MemberType];

      const member = {
        MembershipNumber: row.MembershipNumber,
        FirstName: row.FirstName,
        LastName: row.LastName,
        DateOfBirth: row.DateOfBirth,
        Height: row.Height,
        Weight: row.Weight,
        SSN: row.SSN,
        MedicareCardNumber: row.MedicareCardNumber,
        PhoneNumber: row.PhoneNumber,
        Address: row.Address,
        City: row.City,
        Province: row.Province,
        PostalCode: row.PostalCode,
        TeamID: row.TeamID,
        Fee: fee,
        CurrentYearPaid: Number(row.CurrentYearPaid),
        IsFullyPaidThisYear: Number(row.CurrentYearPaid) >= fee,
        // Simplification: previous year's completeness is checked against
        // this member's *current* Major/Minor fee, since the schema doesn't
        // track what their status was specifically last year.
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

// Major/Minor status (per the club's rules: 18+ is Major, 4-17 is Minor) is
// derived from date of birth, not a field the user picks — this computes it
// the same way both addClubMember and editClubMember need it.
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

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "INSERT INTO `ClubMembers` (FirstName, LastName, DateOfBirth, Height, Weight, SSN, MedicareCardNumber, PhoneNumber, Address, City, Province, PostalCode, TeamID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.height || null,
        data.weight || null,
        data.ssn,
        data.medicareCardNumber || null,
        data.phoneNumber || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
        data.teamId,
      ],
    );

    const membershipNumber = result.insertId;

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

    // Whichever subtype table this member is actually in, the other DELETE
    // is just a harmless no-op.
    await connection.execute(
      "DELETE FROM `MajorMembers` WHERE MembershipNumber = ?",
      [membershipNumber],
    );
    await connection.execute(
      "DELETE FROM `MinorMembers` WHERE MembershipNumber = ?",
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
      "UPDATE `ClubMembers` SET FirstName = ?, LastName = ?, DateOfBirth = ?, Height = ?, Weight = ?, SSN = ?, MedicareCardNumber = ?, PhoneNumber = ?, Address = ?, City = ?, Province = ?, PostalCode = ?, TeamID = ? WHERE MembershipNumber = ?",
      [
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.height || null,
        data.weight || null,
        data.ssn,
        data.medicareCardNumber || null,
        data.phoneNumber || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
        data.teamId,
        membershipNumber,
      ],
    );

    // DateOfBirth may have changed, so recompute Major/Minor and move them
    // between subtype tables if their status flipped.
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

// --- Payments (kept in this file since it's tightly coupled to club
// members: uses MEMBERSHIP_FEES above, only ever called from a club
// member's "Pay" action) ---

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

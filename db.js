// DB file to connect and communicate with the database
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const MEMBERSHIP_FEES = { Major: 200, Minor: 100 };

export async function getLocations() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `Locations`");

    return results;
  } catch (err) {
    return [];
  }
}

export async function addLocation(data) {
  if (!data) {
    throw new Error("No data provided for adding location");
  }

  try {
    const [results, fields] = await db.execute(
      "INSERT INTO `Locations` (Type, Name, Address, City, Province, PostalCode, WebAddress, MaxCapacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.type,
        data.name,
        data.address,
        data.city,
        data.province,
        data.postalCode,
        data.webAddress,
        data.maxCapacity,
      ],
    );
    return results;
  } catch (err) {
    console.error("Error adding location:", err);
    throw err;
  }
}

export async function deleteLocation(locationId) {
  if (!locationId) {
    throw new Error("No location ID provided for deletion");
  }
  try {
    const [results, fields] = await db.execute(
      "DELETE FROM `Locations` WHERE LocationID = ?",
      [locationId],
    );
    return results;
  } catch (err) {
    console.error("Error deleting location:", err);
    throw err;
  }
}

export async function editLocation(locationId, data) {
  if (!locationId || !data) {
    throw new Error("Location ID and data are required for editing");
  }
  try {
    const [results, fields] = await db.execute(
      "UPDATE `Locations` SET Type = ?, Name = ?, Address = ?, City = ?, Province = ?, PostalCode = ?, WebAddress = ?, MaxCapacity = ? WHERE LocationID = ?",
      [
        data.type,
        data.name,
        data.address,
        data.city,
        data.province,
        data.postalCode,
        data.webAddress,
        data.maxCapacity,
        locationId,
      ],
    );
    return results;
  } catch (err) {
    console.error("Error editing location:", err);
    throw err;
  }
}

export async function getPersonnels() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `Personnel`");
    return results;
  } catch (err) {
    return [];
  }
}

export async function getPersonnelsWithLocations() {
  try {
    const [results, fields] = await db.execute(
      "SELECT l.LocationID AS LocationID, l.Type AS LocationType, l.Name AS LocationName, " +
        "p.PersonnelID AS PersonnelID, p.SSN AS SSN, p.FirstName AS FirstName, p.LastName AS LastName, " +
        "p.DateOfBirth AS DateOfBirth, p.MedicareCardNumber AS MedicareCardNumber, p.PhoneNumber AS PhoneNumber, " +
        "p.Address AS Address, p.City AS City, p.Province AS Province, p.PostalCode AS PostalCode, " +
        "p.Email AS Email, p.Role AS Role, p.Mandate AS Mandate " +
        "FROM `Personnel` p " +
        "JOIN `WorksAt` w ON p.PersonnelID = w.PersonnelID " +
        "JOIN `Locations` l ON w.LocationID = l.LocationID " +
        "WHERE w.EndDate IS NULL",
    );

    // Transform the results into a structured format grouped by location
    const groupedResults = results.reduce((acc, curr) => {
      const locationId = curr.LocationID;
      if (!acc[locationId]) {
        acc[locationId] = {
          LocationID: curr.LocationID,
          LocationType: curr.LocationType,
          LocationName: curr.LocationName,
          Personnels: [],
        };
      }
      acc[locationId].Personnels.push({
        PersonnelID: curr.PersonnelID,
        SSN: curr.SSN,
        FirstName: curr.FirstName,
        LastName: curr.LastName,
        DateOfBirth: curr.DateOfBirth,
        MedicareCardNumber: curr.MedicareCardNumber,
        PhoneNumber: curr.PhoneNumber,
        Address: curr.Address,
        City: curr.City,
        Province: curr.Province,
        PostalCode: curr.PostalCode,
        Email: curr.Email,
        Role: curr.Role,
        Mandate: curr.Mandate,
      });
      return acc;
    }, {});
    return groupedResults;
  } catch (err) {
    console.error("Error fetching personnels grouped by location:", err);
    return [];
  }
}

export async function addPersonnel(data) {
  if (!data) {
    throw new Error("No data provided for adding personnel");
  }

  // Since adding a new personnel implies inserting into Personnel and WorksAt tables,
  // we need to use a transaction to ensure that if one fails, everything fails, and we could roll back.
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check for existing SSN to avoid duplicates.
    // This is a typical case of re-hiring personnel, so we should allow the same SSN to be added again.

    const [existingPersonnel] = await connection.execute(
      "SELECT PersonnelID FROM `Personnel` WHERE SSN = ?",
      [data.ssn],
    );

    let personnelId;
    if (existingPersonnel.length > 0) {
      personnelId = existingPersonnel[0].PersonnelID;

      const [active] = await connection.execute(
        "SELECT LocationID FROM `WorksAt` WHERE PersonnelID = ? AND EndDate IS NULL",
        [personnelId],
      );

      if (active.length > 0) {
        throw new Error(
          "Personnel with this SSN is already active at a location. End the current contract before adding a new one.",
        );
      }

      await connection.execute(
        "UPDATE `Personnel` SET FirstName = ?, LastName = ?, DateOfBirth = ?, MedicareCardNumber = ?, PhoneNumber = ?, Address = ?, City = ?, Province = ?, PostalCode = ?, Email = ?, Role = ?, Mandate = ? WHERE PersonnelID = ?",
        [
          data.firstName,
          data.lastName,
          data.dateOfBirth,
          data.medicareCardNumber || null,
          data.phoneNumber || null,
          data.address || null,
          data.city || null,
          data.province || null,
          data.postalCode || null,
          data.email || null,
          data.role,
          data.mandate,
          personnelId,
        ],
      );
    } else {
      const [personnelResult] = await connection.execute(
        "INSERT INTO `Personnel` (SSN, FirstName, LastName, DateOfBirth, MedicareCardNumber, PhoneNumber, Address, City, Province, PostalCode, Email, Role, Mandate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          data.ssn,
          data.firstName,
          data.lastName,
          data.dateOfBirth,
          data.medicareCardNumber || null,
          data.phoneNumber || null,
          data.address || null,
          data.city || null,
          data.province || null,
          data.postalCode || null,
          data.email || null,
          data.role,
          data.mandate,
        ],
      );
      personnelId = personnelResult.insertId;
    }

    await connection.execute(
      "INSERT INTO `WorksAt` (PersonnelID, LocationID, StartDate) VALUES (?, ?, ?)",
      [personnelId, data.locationId, data.startDate],
    );

    await connection.commit();
    return { personnelId };
  } catch (err) {
    await connection.rollback();
    console.error("Error adding personnel:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function deletePersonnel(personnelId) {
  if (!personnelId) {
    throw new Error("No personnel ID provided for deletion");
  }

  // Same for deleting personnel, we need to operate on both tables.
  // We should also use a transaction here to ensure data integrity.
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute("DELETE FROM `WorksAt` WHERE PersonnelID = ?", [
      personnelId,
    ]);

    const [results, fields] = await connection.execute(
      "DELETE FROM `Personnel` WHERE PersonnelID = ?",
      [personnelId],
    );
    await connection.commit();
    return results;
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting personnel:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function endPersonnelContract(personnelId) {
  if (!personnelId) {
    throw new Error("No personnel ID provided for ending contract");
  }
  try {
    const [results] = await db.execute(
      "UPDATE `WorksAt` SET EndDate = CURDATE() WHERE PersonnelID = ? AND EndDate IS NULL",
      [personnelId],
    );
    return results;
  } catch (err) {
    console.error("Error ending personnel contract:", err);
    throw err;
  }
}

export async function editPersonnel(personnelId, data) {
  if (!personnelId || !data) {
    throw new Error("Personnel ID and data are required for editing");
  }
  const connection = await db.getConnection();
  try {
    // Start a transaction to ensure data integrity
    await connection.beginTransaction();

    const [results, fields] = await connection.execute(
      "UPDATE `Personnel` SET SSN = ?, FirstName = ?, LastName = ?, DateOfBirth = ?, MedicareCardNumber = ?, PhoneNumber = ?, Address = ?, City = ?, Province = ?, PostalCode = ?, Email = ?, Role = ?, Mandate = ? WHERE PersonnelID = ?",
      [
        data.ssn,
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.medicareCardNumber || null,
        data.phoneNumber || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
        data.email || null,
        data.role,
        data.mandate,
        personnelId,
      ],
    );
    await connection.commit();
    return results;
  } catch (err) {
    await connection.rollback();
    console.error("Error editing personnel:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function getFamilyMembers() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `FamilyMembers`");
    return results;
  } catch (err) {
    return [];
  }
}

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

// close the connection
// await db.end();

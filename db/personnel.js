import db from "./pool.js";

export async function getPersonnels() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `Personnel`");
    return results;
  } catch (err) {
    return [];
  }
}

// Counts personnel currently active at a location
export async function getActivePersonnelCount() {
  try {
    const [[{ n }]] = await db.execute(
      "SELECT COUNT(DISTINCT PersonnelID) AS n FROM `WorksAt` WHERE EndDate IS NULL",
    );
    return n;
  } catch (err) {
    console.error("Error counting active personnel:", err);
    return 0;
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
    // Ends whichever WorksAt assignment is currently active (EndDate IS NULL)
    // for this personnel, rather than deleting their record — this keeps
    // their history intact and matches how the schema already tracks
    // active vs. past assignments.
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

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

    const personnelId = personnelResult.insertId;

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
  try {
    const [results, fields] = await db.execute(
      "DELETE FROM `Personnel` WHERE PersonnelID = ?",
      [personnelId],
    );
    return results;
  } catch (err) {
    console.error("Error deleting personnel:", err);
    throw err;
  }
}

export async function editPersonnel(personnelId, data) {
  if (!personnelId || !data) {
    throw new Error("Personnel ID and data are required for editing");
  }
  try {
    const [results, fields] = await db.execute(
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
    return results;
  } catch (err) {
    console.error("Error editing personnel:", err);
    throw err;
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

// close the connection
// await db.end();

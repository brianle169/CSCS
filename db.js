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

export async function getPersonnels() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `Personnel`");
    return results;
  } catch (err) {
    return [];
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

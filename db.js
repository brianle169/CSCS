// DB file to connect and communicate with the database
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function getLocations() {
  try {
    const [results, fields] = await db.query("SELECT * FROM `Locations`");

    console.log(results); // results contains rows returned by server
    console.log(fields); // fields contains extra meta data about results, if available
    return results;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getPersonnels() {
  try {
    const [results, fields] = await db.query("SELECT * FROM `Personnel`");
    console.log(results);
    console.log(fields);
    return results;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getFamilyMembers() {
  try {
    const [results, fields] = await db.query("SELECT * FROM `FamilyMembers`");
    console.log(results);
    console.log(fields);
    return results;
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getClubMembers() {
  try {
    const [results, fields] = await db.query("SELECT * FROM `ClubMembers`");
    console.log(results);
    console.log(fields);
    return results;
  } catch (err) {
    console.log(err);
    return [];
  }
}

// close the connection
// await db.end();

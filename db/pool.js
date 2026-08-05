// Shared MySQL connection pool — every db/*.js module imports this same
// instance, so the app only ever opens one pool (connectionLimit: 10 total),
// not one pool per module.
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

export default db;

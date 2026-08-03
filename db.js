// DB file to connect and communicate with the database
const mysql = require("mysql2");

const db = mysql.createConnection({
  //   host: "localhost",
  //   user: "your_username",
  //   password: "your_password",
  //   database: "your_database"
});

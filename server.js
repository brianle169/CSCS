import express from "express";
import path from "path";
import { testConnection } from "./db.js";

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
const port = 3000;

app.get("/", async (req, res) => {
  const data = await testConnection();
  res.render("locations", { locations: data });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

import express from "express";
import path from "path";
import {
  getLocations,
  getPersonnels,
  getFamilyMembers,
  getClubMembers,
} from "./db.js";

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
const port = 3000;

app.get("/", (req, res) => {
  res.render("pages/home-page");
});

app.get("/locations", async (req, res) => {
  const data = await getLocations();
  res.render("pages/locations", { locations: data });
});

app.get("/personnels", async (req, res) => {
  const data = await getPersonnels();
  res.render("pages/personnels", { personnels: data });
});

app.get("/familymembers", async (req, res) => {
  const data = await getFamilyMembers();
  res.render("pages/familymembers", { familyMembers: data });
});

app.get("/clubmembers", async (req, res) => {
  const data = await getClubMembers();
  res.render("pages/clubmembers", { clubMembers: data });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

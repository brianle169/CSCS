import express from "express";
import { getFamilyMembers } from "../db.js";

const familyMembersRoute = express.Router({ mergeParams: true });

familyMembersRoute.get("/", async (req, res) => {
  const data = await getFamilyMembers();
  res.render("pages/familymembers", { familyMembers: data });
});

export default familyMembersRoute;

import express from "express";
import { getClubMembers } from "../db.js";

const clubMembersRoute = express.Router();

clubMembersRoute.get("/", async (req, res) => {
  const data = await getClubMembers();
  res.render("pages/clubmembers", { clubMembers: data });
});

export default clubMembersRoute;

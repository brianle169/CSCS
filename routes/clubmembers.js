import express from "express";
import {
  getClubMembersWithLocationsAndTeams,
  addClubMember,
  deleteClubMember,
  editClubMember,
  addPayment,
  getTeams,
} from "../db.js";

const clubMembersRoute = express.Router({ mergeParams: true });

clubMembersRoute
  .get("/", async (req, res) => {
    const data = await getClubMembersWithLocationsAndTeams();
    const teams = await getTeams();
    res.render("pages/clubmembers", { clubMembers: data, teams });
  })
  .post("/", async (req, res) => {
    try {
      const result = await addClubMember(req.body);
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error adding club member:", err);
      res.status(400).send("Error adding club member: " + err.message);
    }
  })
  .post("/:id/delete", async (req, res) => {
    try {
      const membershipNumber = req.params.id;
      const result = await deleteClubMember(membershipNumber);
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error deleting club member:", err);
      res.status(400).send("Error deleting club member");
    }
  })
  .post("/:id/edit", async (req, res) => {
    try {
      const membershipNumber = req.params.id;
      const data = req.body;
      const result = await editClubMember(membershipNumber, data);
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error editing club member:", err);
      res.status(400).send("Error editing club member: " + err.message);
    }
  })
  .post("/:id/pay", async (req, res) => {
    try {
      const membershipNumber = req.params.id;
      const data = { ...req.body, membershipNumber };
      const result = await addPayment(data);
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error adding payment:", err);
      res.status(400).send("Error adding payment: " + err.message);
    }
  });

export default clubMembersRoute;

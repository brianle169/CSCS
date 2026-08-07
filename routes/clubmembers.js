import express from "express";
import {
  getClubMembersWithLocationsAndTeams,
  addClubMember,
  deleteClubMember,
  editClubMember,
  addPayment,
  getTeams,
} from "../db/clubMembers.js";
import {
  getGuardiansByMinor,
  addGuardian,
  makePrimaryGuardian,
  endGuardianship,
} from "../db/guardians.js";
import { getFamilyMembers } from "../db/familyMembers.js";

const clubMembersRoute = express.Router({ mergeParams: true });

clubMembersRoute
  .get("/", async (req, res) => {
    const data = await getClubMembersWithLocationsAndTeams();
    const teams = await getTeams();
    // Guardians are keyed by MembershipNumber; familyMembers backs the
    // "link an existing person" picker in the add-guardian form.
    const guardians = await getGuardiansByMinor();
    const familyMembers = await getFamilyMembers();
    res.render("pages/clubmembers", {
      clubMembers: data,
      teams,
      guardians,
      familyMembers,
    });
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
  })
  .post("/:id/guardians", async (req, res) => {
    try {
      const result = await addGuardian(req.params.id, req.body);
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error adding guardian:", err);
      res.status(400).send("Error adding guardian: " + err.message);
    }
  })
  .post("/:id/guardians/:familyMemberId/primary", async (req, res) => {
    try {
      const result = await makePrimaryGuardian(
        req.params.id,
        req.params.familyMemberId,
      );
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error changing guardian priority:", err);
      res.status(400).send("Error changing guardian priority: " + err.message);
    }
  })
  .post("/:id/guardians/:familyMemberId/end", async (req, res) => {
    try {
      const result = await endGuardianship(
        req.params.id,
        req.params.familyMemberId,
      );
      console.log(result);
      res.redirect("/clubmembers");
    } catch (err) {
      console.error("Error ending guardianship:", err);
      res.status(400).send("Error ending guardianship: " + err.message);
    }
  });

export default clubMembersRoute;

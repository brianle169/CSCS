import express from "express";
import { getFamilyMembers, editFamilyMember } from "../db/familyMembers.js";

const familyMembersRoute = express.Router({ mergeParams: true });

familyMembersRoute
  .get("/", async (req, res) => {
    const data = await getFamilyMembers();
    res.render("pages/familymembers", { familyMembers: data });
  })
  .post("/:id/edit", async (req, res) => {
    try {
      const result = await editFamilyMember(req.params.id, req.body);
      console.log(result);
      res.redirect("/familymembers");
    } catch (err) {
      console.error("Error editing family member:", err);
      res.status(400).send("Error editing family member: " + err.message);
    }
  });

export default familyMembersRoute;

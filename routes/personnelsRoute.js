import express from "express";
import {
  getPersonnels,
  addPersonnel,
  deletePersonnel,
  editPersonnel,
  getPersonnelsWithLocations,
  getLocations,
} from "../db.js";

const personnelsRoute = express.Router({ mergeParams: true });

personnelsRoute
  .get("/", async (req, res) => {
    const data = await getPersonnelsWithLocations();
    const locations = await getLocations();
    res.render("pages/personnels", { personnels: data, locations });
  })
  .post("/", async (req, res) => {
    try {
      const result = await addPersonnel(req.body);
      console.log(result);
      res.redirect("/personnels");
    } catch (err) {
      console.error("Error adding personnel:", err);
      res.status(400).send("Error adding personnel");
    }
  })
  .post("/:id/delete", async (req, res) => {
    try {
      const personnelId = req.params.id;
      const result = await deletePersonnel(personnelId);
      console.log(result);
      res.redirect("/personnels");
    } catch (err) {
      console.error("Error deleting personnel:", err);
      res.status(400).send("Error deleting personnel");
    }
  })
  .post("/:id/edit", async (req, res) => {
    try {
      const personnelId = req.params.id;
      const data = req.body;
      const result = await editPersonnel(personnelId, data);
      console.log(result);
      res.redirect("/personnels");
    } catch (err) {
      console.error("Error editing personnel:", err);
      res.status(400).send("Error editing personnel");
    }
  });

export default personnelsRoute;

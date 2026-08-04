import express from "express";
import {
  getLocations,
  addLocation,
  deleteLocation,
  editLocation,
} from "../db.js";

const locationsRoute = express.Router({ mergeParams: true });

locationsRoute
  .get("/", async (req, res) => {
    const data = await getLocations();
    res.render("pages/locations", { locations: data });
  })
  .post("/", async (req, res) => {
    try {
      const result = await addLocation(req.body);
      console.log(result);
      res.redirect("/locations");
    } catch (err) {
      console.error("Error adding location:", err);
      res.status(400).send("Error adding location");
    }
  })
  .post("/:id/delete", async (req, res) => {
    try {
      const locationId = req.params.id;
      // Add logic to delete the location
      const result = await deleteLocation(locationId);
      console.log(result);
      res.redirect("/locations");
    } catch (err) {
      console.error("Error deleting location:", err);
      res.status(400).send("Error deleting location");
    }
  })
  .post("/:id/edit", async (req, res) => {
    try {
      const locationId = req.params.id;
      const data = req.body;
      const result = await editLocation(locationId, data);
      console.log(result);
      res.redirect("/locations");
    } catch (err) {
      console.error("Error editing location:", err);
      res.status(400).send("Error editing location");
    }
  });

export default locationsRoute;

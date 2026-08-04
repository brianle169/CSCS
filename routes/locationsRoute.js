import express from "express";
import { getLocations, addLocation } from "../db.js";

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
  });

export default locationsRoute;

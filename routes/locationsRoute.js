import express from "express";
import { getLocations } from "../db.js";

const locationsRoute = express.Router({ mergeParams: true });

locationsRoute.get("/", async (req, res) => {
  const data = await getLocations();
  res.render("pages/locations", { locations: data });
});

export default locationsRoute;

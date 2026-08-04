import express from "express";
import { getPersonnels } from "../db.js";

const personnelsRoute = express.Router();

personnelsRoute.get("/", async (req, res) => {
  const data = await getPersonnels();
  res.render("pages/personnels", { personnels: data });
});

export default personnelsRoute;

import express from "express";
import { getSessionsWithFormations } from "../db/teamFormations.js";

const teamFormationsRoute = express.Router({ mergeParams: true });

teamFormationsRoute.get("/", async (req, res) => {
  const sessions = await getSessionsWithFormations();
  res.render("pages/teamformations", { sessions });
});

export default teamFormationsRoute;

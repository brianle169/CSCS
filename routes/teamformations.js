import express from "express";
import {
  getSessionsWithFormations,
  getPlayersByTeam,
  getFormationOptions,
  createSession,
  deleteSession,
  createFormation,
  editFormation,
  deleteFormation,
  assignPlayer,
  editAssignmentRole,
  removeAssignment,
  ROLE_ORDER,
} from "../db/teamFormations.js";

const teamFormationsRoute = express.Router({ mergeParams: true });

function fail(res, action, err) {
  console.error(`Error ${action}:`, err);
  res.status(400).send(`Error ${action}: ${err.message}`);
}

teamFormationsRoute.get("/", async (req, res) => {
  const sessions = await getSessionsWithFormations();
  const playersByTeam = await getPlayersByTeam();
  const { teams, coaches } = await getFormationOptions();
  res.render("pages/teamformations", {
    sessions,
    playersByTeam,
    teams,
    coaches,
    roles: ROLE_ORDER,
  });
});

teamFormationsRoute.post("/sessions", async (req, res) => {
  try {
    await createSession(req.body);
    res.redirect("/teamformations");
  } catch (err) {
    fail(res, "creating session", err);
  }
});

teamFormationsRoute.post("/sessions/:sessionId/delete", async (req, res) => {
  try {
    await deleteSession(req.params.sessionId);
    res.redirect("/teamformations");
  } catch (err) {
    fail(res, "deleting session", err);
  }
});

teamFormationsRoute.post(
  "/sessions/:sessionId/formations",
  async (req, res) => {
    try {
      await createFormation(
        req.params.sessionId,
        req.body.teamId,
        req.body.headCoachId,
      );
      res.redirect("/teamformations");
    } catch (err) {
      fail(res, "adding team formation", err);
    }
  },
);

teamFormationsRoute.post("/formations/:formationId/edit", async (req, res) => {
  try {
    await editFormation(
      req.params.formationId,
      req.body.headCoachId,
      req.body.score,
    );
    res.redirect("/teamformations");
  } catch (err) {
    fail(res, "editing formation", err);
  }
});

teamFormationsRoute.post(
  "/formations/:formationId/delete",
  async (req, res) => {
    try {
      await deleteFormation(req.params.formationId);
      res.redirect("/teamformations");
    } catch (err) {
      fail(res, "deleting formation", err);
    }
  },
);

teamFormationsRoute.post("/:formationId/assignments", async (req, res) => {
  try {
    await assignPlayer(
      req.params.formationId,
      req.body.membershipNumber,
      req.body.role,
    );
    res.redirect("/teamformations");
  } catch (err) {
    fail(res, "assigning player", err);
  }
});

teamFormationsRoute.post(
  "/:formationId/assignments/:membershipNumber/edit",
  async (req, res) => {
    try {
      await editAssignmentRole(
        req.params.formationId,
        req.params.membershipNumber,
        req.body.role,
      );
      res.redirect("/teamformations");
    } catch (err) {
      fail(res, "editing assignment", err);
    }
  },
);

teamFormationsRoute.post(
  "/:formationId/assignments/:membershipNumber/delete",
  async (req, res) => {
    try {
      await removeAssignment(
        req.params.formationId,
        req.params.membershipNumber,
      );
      res.redirect("/teamformations");
    } catch (err) {
      fail(res, "removing assignment", err);
    }
  },
);

export default teamFormationsRoute;

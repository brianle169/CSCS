import express from "express";
import { runWeeklyEmailJob, getEmailLogs } from "../db/emails.js";

const emailsRoute = express.Router({ mergeParams: true });

emailsRoute.get("/", async (req, res) => {
  const logs = await getEmailLogs();
  res.render("pages/emails", { logs, run: null, error: null });
});

// Manual trigger the same job the Sunday cron schedule runs
emailsRoute.post("/run", async (req, res) => {
  const logs = await getEmailLogs();
  try {
    const run = await runWeeklyEmailJob(req.body.referenceDate || undefined);
    res.render("pages/emails", {
      logs: await getEmailLogs(),
      run,
      error: null,
    });
  } catch (err) {
    console.error("Error running weekly email job:", err);
    res.render("pages/emails", { logs, run: null, error: err.message });
  }
});

export default emailsRoute;

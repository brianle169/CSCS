import express from "express";
import path from "path";
import cron from "node-cron";
import locationsRoute from "./routes/locationsRoute.js";
import personnelsRoute from "./routes/personnelsRoute.js";
import familyMembersRoute from "./routes/familymembers.js";
import clubMembersRoute from "./routes/clubmembers.js";
import teamFormationsRoute from "./routes/teamformations.js";
import reportsRoute from "./routes/reports.js";
import emailsRoute from "./routes/emailsRoute.js";
import { runWeeklyEmailJob } from "./db/emails.js";

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use("/locations", locationsRoute);
app.use("/personnels", personnelsRoute);
app.use("/familymembers", familyMembersRoute);
app.use("/clubmembers", clubMembersRoute);
app.use("/teamformations", teamFormationsRoute);
app.use("/reports", reportsRoute);
app.use("/emails", emailsRoute);

app.get("/", (req, res) => {
  res.render("pages/home-page");
});

cron.schedule("0 8 * * 0", () => {
  runWeeklyEmailJob().catch((err) =>
    console.error("Scheduled weekly email job failed:", err),
  );
});

app.listen(port, () => {
  console.log(`Example app listening at localhost:${port}`);
});

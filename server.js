import express from "express";
import path from "path";
import locationsRoute from "./routes/locationsRoute.js";
import personnelsRoute from "./routes/personnelsRoute.js";
import familyMembersRoute from "./routes/familymembers.js";
import clubMembersRoute from "./routes/clubmembers.js";
import reportsRoute from "./routes/reports.js";

const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use("/locations", locationsRoute);
app.use("/personnels", personnelsRoute);
app.use("/familymembers", familyMembersRoute);
app.use("/clubmembers", clubMembersRoute);
app.use("/reports", reportsRoute);

app.get("/", (req, res) => {
  res.render("pages/home-page");
});

app.listen(port, () => {
  console.log(`Example app listening at localhost:${port}`);
});

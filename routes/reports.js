import express from "express";
import { getLocations } from "../db/locations.js";
import {
  getReport8,
  getReport9,
  getReport10,
  getReport11,
  getReport12,
  getReport13,
  getReport14,
  getReport15,
  getReport16,
  getReport17,
  getReport18,
  getReport19,
} from "../db/reports.js";

const reportsRoute = express.Router({ mergeParams: true });

const REPORT_META = [
  {
    id: 8,
    title: "Locations with FIFA-game players",
    description:
      "Every location with at least two members who participated in a FIFA game — address, city, capacity, general manager, minor/major member counts, and FIFA player count. Sorted descending by FIFA player count.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport8,
  },
  {
    id: 9,
    title: "Primary family members with FIFA-playing children",
    description:
      "Primary family members with at least two associated club members who played a FIFA game, and the details of each of those children. Sorted ascending by family member first, then last name.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport9,
  },
  {
    id: 10,
    title: "Team formations by location and date range",
    description:
      "All team formations recorded for a given location within a given period — head coach, session time/address, team, score, and every player's name and role. Sorted ascending by start time.",
    needsLocation: true,
    needsDateRange: true,
    fn: getReport10,
  },
  {
    id: 11,
    title: "Members with 5+ FIFA games",
    description:
      "Club members who participated in at least five FIFA games, with total games played and the min/max year of participation. Sorted descending by number of games.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport11,
  },
  {
    id: 12,
    title: "Team formation summary by location",
    description:
      "For a given period: total training sessions/players and game sessions/players per location, limited to locations with at least four game sessions. Sorted descending by game sessions.",
    needsLocation: false,
    needsDateRange: true,
    fn: getReport12,
  },
  {
    id: 13,
    title: "Active members never assigned but played FIFA",
    description:
      "Active club members who have never been assigned to any formation session, but have played at least one FIFA game. Sorted ascending by location, then FIFA game count.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport13,
  },
  {
    id: 14,
    title: "Major members since minors",
    description:
      "Major club members who have been members of the club since they were minors. Sorted ascending by location, then age.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport14,
  },
  {
    id: 15,
    title: "Goalkeeper-only members",
    description:
      "Active club members who have only ever been assigned as Goalkeeper (and assigned at least once). Sorted ascending by location, then membership number.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport15,
  },
  {
    id: 16,
    title: "Members covering 5 key roles",
    description:
      "Active club members assigned at least once to each of: Goalkeeper, Right fullback, Sweeper, Defending, and Striker. Sorted ascending by location, then membership number.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport16,
  },
  {
    id: 17,
    title: "Head coaches who are family members",
    description:
      "For a given location: family members with a currently active club member there, who are also head coaches at that same location.",
    needsLocation: true,
    needsDateRange: false,
    fn: getReport17,
  },
  {
    id: 18,
    title: "Active members who never won a game",
    description:
      "Active club members who have been assigned to at least one game session, but never won one. Sorted ascending by location, then membership number.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport18,
  },
  {
    id: 19,
    title: "Volunteer personnel who are family members",
    description:
      "Volunteer personnel who are family members of at least one minor club member, and have at least one associated member who played a FIFA game. Sorted ascending by location, role, first name, then last name.",
    needsLocation: false,
    needsDateRange: false,
    fn: getReport19,
  },
];

reportsRoute.get("/", async (req, res) => {
  const locations = await getLocations();
  const reports = await Promise.all(
    REPORT_META.map(async (meta) => {
      const { columns, rows } = await meta.fn();
      return { ...meta, columns, rows };
    }),
  );
  res.render("pages/reports", { reports, locations });
});

export default reportsRoute;

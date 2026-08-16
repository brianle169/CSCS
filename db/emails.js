// Every Sunday, for every session scheduled in the coming week, the system
// emails each assigned club member their session details and logs the
// email.
import db from "./pool.js";
import { sendGeneratedEmail } from "../lib/mailer.js";

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function parseISODate(isoString) {
  const [year, month, day] = isoString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// "The coming week" relative to referenceISODate (default: today), as the
// 7 days starting the day after the reference date
export function getComingWeekRange(referenceISODate) {
  const reference = referenceISODate
    ? parseISODate(referenceISODate)
    : parseISODate(toISODate(new Date()));

  const start = new Date(reference);
  start.setUTCDate(start.getUTCDate() + 1);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { weekStart: toISODate(start), weekEnd: toISODate(end) };
}

// Get the people to send emails to
export async function getUpcomingSessionEmails(weekStart, weekEnd) {
  const [rows] = await db.execute(
    "SELECT s.SessionID AS SessionID, s.Address AS Address, s.Nature AS Nature, " +
      "DATE_FORMAT(s.SessionDate, '%W') AS Weekday, " +
      "DATE_FORMAT(s.SessionDate, '%e-%M-%Y') AS DateLabel, " +
      "DATE_FORMAT(s.SessionTime, '%l:%i %p') AS TimeLabel, " +
      "tf.FormationID AS FormationID, " +
      "t.Name AS TeamName, " +
      "l.LocationID AS LocationID, l.Name AS LocationName, " +
      "cm.MembershipNumber AS MembershipNumber, " +
      "cm.FirstName AS MemberFirstName, cm.LastName AS MemberLastName, " +
      "cm.Email AS MemberEmail, " +
      "a.Role AS Role, " +
      "p.FirstName AS CoachFirstName, p.LastName AS CoachLastName, " +
      "p.Email AS CoachEmail " +
      "FROM `Sessions` s " +
      "JOIN `TeamFormations` tf ON tf.SessionID = s.SessionID " +
      "JOIN `Teams` t ON t.TeamID = tf.TeamID " +
      "JOIN `Locations` l ON l.LocationID = t.LocationID " +
      "JOIN `Personnel` p ON p.PersonnelID = tf.HeadCoachID " +
      "JOIN `Assignments` a ON a.FormationID = tf.FormationID " +
      "JOIN `ClubMembers` cm ON cm.MembershipNumber = a.MembershipNumber " +
      "WHERE s.SessionDate BETWEEN ? AND ? " +
      "ORDER BY s.SessionDate, s.SessionTime, t.Name, cm.LastName, cm.FirstName",
    [weekStart, weekEnd],
  );
  return rows;
}

// Build the email content
export function buildEmailContent(row) {
  const natureLabel = row.Nature.toLowerCase();

  const subject =
    `${row.TeamName} ${row.Weekday} ${row.DateLabel} ${row.TimeLabel} ` +
    `${natureLabel} session`;

  const body =
    `Hi ${row.MemberFirstName} ${row.MemberLastName},\n\n` +
    `You're scheduled for a ${natureLabel} session with ${row.TeamName}:\n\n` +
    `  Date:    ${row.Weekday}, ${row.DateLabel}\n` +
    `  Time:    ${row.TimeLabel}\n` +
    `  Address: ${row.Address}\n` +
    `  Role:    ${row.Role}\n\n` +
    `Head coach: ${row.CoachFirstName} ${row.CoachLastName} (${row.CoachEmail})\n\n` +
    `See you there!\n${row.LocationName} — Country Soccer Club`;

  return { subject, body };
}

async function findAlreadyLogged(pairs) {
  if (pairs.length === 0) return new Set();
  const placeholders = pairs.map(() => "(?, ?)").join(", ");
  const params = pairs.flatMap((pair) => [pair.receiver, pair.subject]);
  const [rows] = await db.execute(
    `SELECT Receiver, Subject FROM \`EmailLogs\` WHERE (Receiver, Subject) IN (${placeholders})`,
    params,
  );
  return new Set(rows.map((row) => JSON.stringify([row.Receiver, row.Subject])));
}

async function logEmail({ sentAt, senderLocationId, receiver, subject, body }) {
  // The spec's log only keeps the first 100 characters of the body.
  const bodySnippet = body.slice(0, 100);
  await db.execute(
    "INSERT INTO `EmailLogs` (SentAt, SenderLocationID, Receiver, Subject, BodySnippet) " +
      "VALUES (?, ?, ?, ?, ?)",
    [sentAt, senderLocationId, receiver, subject, bodySnippet],
  );
}

// Generates, "sends" (see lib/mailer.js) and logs every email for the
// coming week. Safe to call more than once for the same week — a
// (receiver, subject) pair that's already logged is skipped rather than
// duplicated, since subject already encodes the team/date/time.
export async function runWeeklyEmailJob(referenceISODate) {
  const { weekStart, weekEnd } = getComingWeekRange(referenceISODate);
  const rows = await getUpcomingSessionEmails(weekStart, weekEnd);

  const withEmail = rows.filter((row) => !!row.MemberEmail);
  const skippedNoEmail = rows.length - withEmail.length;

  const drafts = withEmail.map((row) => ({ row, ...buildEmailContent(row) }));

  const alreadyLogged = await findAlreadyLogged(
    drafts.map((draft) => ({
      receiver: draft.row.MemberEmail,
      subject: draft.subject,
    })),
  );

  const sentAt = new Date();
  const results = [];

  for (const draft of drafts) {
    const key = JSON.stringify([draft.row.MemberEmail, draft.subject]);
    if (alreadyLogged.has(key)) {
      results.push({ ...draft, status: "already-logged", previewUrl: null });
      continue;
    }

    const { previewUrl } = await sendGeneratedEmail({
      from: `"${draft.row.LocationName}" <no-reply@cscs.example>`,
      to: draft.row.MemberEmail,
      subject: draft.subject,
      text: draft.body,
    });

    await logEmail({
      sentAt,
      senderLocationId: draft.row.LocationID,
      receiver: draft.row.MemberEmail,
      subject: draft.subject,
      body: draft.body,
    });

    results.push({ ...draft, status: "sent", previewUrl });
    alreadyLogged.add(key);
  }

  return {
    weekStart,
    weekEnd,
    totalCandidates: rows.length,
    skippedNoEmail,
    results,
  };
}

export async function getEmailLogs() {
  const [rows] = await db.execute(
    "SELECT el.LogID AS LogID, el.SentAt AS SentAt, el.Receiver AS Receiver, " +
      "el.Subject AS Subject, el.BodySnippet AS BodySnippet, " +
      "l.Name AS SenderLocationName " +
      "FROM `EmailLogs` el " +
      "JOIN `Locations` l ON l.LocationID = el.SenderLocationID " +
      "ORDER BY el.SentAt DESC, el.LogID DESC",
  );
  return rows;
}

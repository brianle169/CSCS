import db from "./pool.js";

const ROLE_ORDER = [
  "Goalkeeper",
  "Sweeper",
  "Right fullback",
  "Center back",
  "Left fullback",
  "Defending midfielder",
  "Right midfielder",
  "Central midfielder",
  "Attacking midfielder",
  "Left winger",
  "Striker",
];

export async function getSessionsWithFormations() {
  try {
    const [rows] = await db.execute(
      "SELECT s.SessionID AS SessionID, " +
        "DATE_FORMAT(s.SessionDate, '%Y-%m-%d') AS SessionDate, " +
        "DATE_FORMAT(s.SessionDate, '%a, %b %e, %Y') AS SessionDateLabel, " +
        "TIME_FORMAT(s.SessionTime, '%H:%i') AS SessionTime, " +
        "s.Address AS Address, s.Nature AS Nature, " +
        "s.SessionDate < CURDATE() AS IsPast, " +
        "tf.FormationID AS FormationID, tf.Score AS Score, " +
        "t.TeamID AS TeamID, t.Name AS TeamName, t.Gender AS TeamGender, " +
        "l.Name AS LocationName, " +
        "p.PersonnelID AS HeadCoachID, " +
        "p.FirstName AS CoachFirstName, p.LastName AS CoachLastName " +
        "FROM `Sessions` s " +
        // LEFT so a session with no formation booked yet still appears
        "LEFT JOIN `TeamFormations` tf ON tf.SessionID = s.SessionID " +
        "LEFT JOIN `Teams` t ON t.TeamID = tf.TeamID " +
        "LEFT JOIN `Locations` l ON l.LocationID = t.LocationID " +
        "LEFT JOIN `Personnel` p ON p.PersonnelID = tf.HeadCoachID " +
        // Most recent session first
        "ORDER BY s.SessionDate DESC, s.SessionTime DESC, t.Name",
    );

    const [assignments] = await db.execute(
      "SELECT a.FormationID AS FormationID, a.Role AS Role, " +
        "a.MembershipNumber AS MembershipNumber, " +
        "cm.FirstName AS FirstName, cm.LastName AS LastName " +
        "FROM `Assignments` a " +
        "JOIN `ClubMembers` cm ON cm.MembershipNumber = a.MembershipNumber " +
        "ORDER BY a.FormationID, FIELD(a.Role, " +
        ROLE_ORDER.map((r) => `'${r}'`).join(", ") +
        "), cm.LastName",
    );

    const rosters = assignments.reduce((acc, row) => {
      (acc[row.FormationID] = acc[row.FormationID] || []).push(row);
      return acc;
    }, {});

    // Collected into an array rather than an object keyed by SessionID: JS
    // objects order integer-like keys numerically, which would silently undo
    // the newest-first ordering the query just established.
    const sessions = [];
    const bySessionId = {};

    for (const row of rows) {
      let session = bySessionId[row.SessionID];
      if (!session) {
        session = {
          SessionID: row.SessionID,
          SessionDate: row.SessionDate,
          SessionDateLabel: row.SessionDateLabel,
          SessionTime: row.SessionTime,
          Address: row.Address,
          Nature: row.Nature,
          IsPast: Number(row.IsPast) === 1,
          Formations: [],
        };
        bySessionId[row.SessionID] = session;
        sessions.push(session);
      }

      // The LEFT JOIN yields one all-null row for a session with no formation.
      if (row.FormationID === null) continue;

      session.Formations.push({
        FormationID: row.FormationID,
        TeamID: row.TeamID,
        TeamName: row.TeamName,
        TeamGender: row.TeamGender,
        LocationName: row.LocationName,
        Score: row.Score,
        HeadCoach: row.CoachFirstName
          ? `${row.CoachFirstName} ${row.CoachLastName}`
          : null,
        Players: rosters[row.FormationID] || [],
      });
    }

    return sessions;
  } catch (err) {
    console.error("Error fetching sessions with formations:", err);
    return [];
  }
}

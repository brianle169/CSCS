import db from "./pool.js";

// Exported so the assign/edit dropdowns offer exactly the roles the
// Assignments CHECK constraint accepts, in pitch order.
export const ROLE_ORDER = [
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

function rethrowAssignmentError(err) {
  if (err && err.sqlState === "45000") {
    throw new Error(err.sqlMessage || err.message);
  }
  throw err;
}

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

export async function getPlayersByTeam() {
  try {
    const [rows] = await db.execute(
      "SELECT pf.TeamID AS TeamID, cm.MembershipNumber AS MembershipNumber, " +
        "cm.FirstName AS FirstName, cm.LastName AS LastName, cm.Gender AS Gender " +
        "FROM `PlaysFor` pf " +
        "JOIN `ClubMembers` cm ON cm.MembershipNumber = pf.MembershipNumber " +
        "WHERE pf.EndDate IS NULL " +
        "ORDER BY cm.LastName, cm.FirstName",
    );
    return rows.reduce((acc, row) => {
      (acc[row.TeamID] = acc[row.TeamID] || []).push(row);
      return acc;
    }, {});
  } catch (err) {
    console.error("Error fetching players by team:", err);
    return {};
  }
}

export async function getFormationOptions() {
  try {
    const [teams] = await db.execute(
      "SELECT t.TeamID AS TeamID, t.Name AS Name, t.Gender AS Gender, " +
        "l.Name AS LocationName " +
        "FROM `Teams` t JOIN `Locations` l ON l.LocationID = t.LocationID " +
        "ORDER BY l.Name, t.Name",
    );
    const [coaches] = await db.execute(
      "SELECT PersonnelID, FirstName, LastName, Role FROM `Personnel` " +
        "WHERE Role IN ('Coach', 'Assistant Coach') " +
        "ORDER BY LastName, FirstName",
    );
    return { teams, coaches };
  } catch (err) {
    console.error("Error fetching formation options:", err);
    return { teams: [], coaches: [] };
  }
}

export async function createSession(data) {
  if (
    !data ||
    !data.sessionDate ||
    !data.sessionTime ||
    !data.address ||
    !data.nature
  ) {
    throw new Error("Date, time, address and nature are all required.");
  }
  try {
    const [result] = await db.execute(
      "INSERT INTO `Sessions` (SessionDate, SessionTime, Address, Nature) VALUES (?, ?, ?, ?)",
      [data.sessionDate, data.sessionTime, data.address, data.nature],
    );
    return { sessionId: result.insertId };
  } catch (err) {
    console.error("Error creating session:", err);
    throw err;
  }
}

export async function deleteSession(sessionId) {
  if (!sessionId) throw new Error("Session is required.");
  try {
    const [[{ n }]] = await db.execute(
      "SELECT COUNT(*) AS n FROM `TeamFormations` WHERE SessionID = ?",
      [sessionId],
    );
    if (n > 0) {
      throw new Error(
        `This session still has ${n} team formation${n === 1 ? "" : "s"}. Remove them first.`,
      );
    }
    return await db.execute("DELETE FROM `Sessions` WHERE SessionID = ?", [
      sessionId,
    ]);
  } catch (err) {
    console.error("Error deleting session:", err);
    throw err;
  }
}

export async function createFormation(sessionId, teamId, headCoachId) {
  if (!sessionId || !teamId || !headCoachId) {
    throw new Error("Session, team and head coach are all required.");
  }
  try {
    const [result] = await db.execute(
      "INSERT INTO `TeamFormations` (TeamID, SessionID, HeadCoachID, Score) VALUES (?, ?, ?, NULL)",
      [teamId, sessionId, headCoachId],
    );
    return { formationId: result.insertId };
  } catch (err) {
    console.error("Error creating formation:", err);
    // TeamFormations has UNIQUE (TeamID, SessionID).
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("That team already has a formation in this session.");
    }
    throw err;
  }
}

export async function editFormation(formationId, headCoachId, score) {
  if (!formationId || !headCoachId) {
    throw new Error("Formation and head coach are required.");
  }
  // An empty score box means "not played yet", which is NULL rather than 0.
  const parsedScore =
    score === "" || score === undefined || score === null
      ? null
      : Number(score);
  if (
    parsedScore !== null &&
    (!Number.isInteger(parsedScore) || parsedScore < 0)
  ) {
    throw new Error("Score must be a whole number, or left blank.");
  }
  try {
    const [result] = await db.execute(
      "UPDATE `TeamFormations` SET HeadCoachID = ?, Score = ? WHERE FormationID = ?",
      [headCoachId, parsedScore, formationId],
    );
    if (result.affectedRows === 0)
      throw new Error("That formation no longer exists.");
    return result;
  } catch (err) {
    console.error("Error editing formation:", err);
    throw err;
  }
}

export async function deleteFormation(formationId) {
  if (!formationId) throw new Error("Formation is required.");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "DELETE FROM `Assignments` WHERE FormationID = ?",
      [formationId],
    );
    const [result] = await connection.execute(
      "DELETE FROM `TeamFormations` WHERE FormationID = ?",
      [formationId],
    );
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    console.error("Error deleting formation:", err);
    throw err;
  } finally {
    connection.release();
  }
}

export async function assignPlayer(formationId, membershipNumber, role) {
  if (!formationId || !membershipNumber || !role) {
    throw new Error("Formation, player and role are all required.");
  }
  try {
    const [result] = await db.execute(
      "INSERT INTO `Assignments` (MembershipNumber, FormationID, Role) VALUES (?, ?, ?)",
      [membershipNumber, formationId, role],
    );
    return result;
  } catch (err) {
    console.error("Error assigning player:", err);
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("That player is already assigned to this formation.");
    }
    rethrowAssignmentError(err);
  }
}

export async function editAssignmentRole(formationId, membershipNumber, role) {
  if (!formationId || !membershipNumber || !role) {
    throw new Error("Formation, player and role are all required.");
  }
  try {
    const [result] = await db.execute(
      "UPDATE `Assignments` SET Role = ? WHERE FormationID = ? AND MembershipNumber = ?",
      [role, formationId, membershipNumber],
    );
    if (result.affectedRows === 0) {
      throw new Error("That player is not assigned to this formation.");
    }
    return result;
  } catch (err) {
    console.error("Error editing assignment role:", err);
    rethrowAssignmentError(err);
  }
}

export async function removeAssignment(formationId, membershipNumber) {
  if (!formationId || !membershipNumber) {
    throw new Error("Formation and player are required.");
  }
  try {
    const [result] = await db.execute(
      "DELETE FROM `Assignments` WHERE FormationID = ? AND MembershipNumber = ?",
      [formationId, membershipNumber],
    );
    if (result.affectedRows === 0) {
      throw new Error("That player is not assigned to this formation.");
    }
    return result;
  } catch (err) {
    console.error("Error removing assignment:", err);
    throw err;
  }
}

// --- Reports (queries 8-19, Section VII of the report) ---
// Each function returns { columns, rows }. Filtered reports take
// { locationId, from, to } and return no rows until filters are supplied.
import db from "./pool.js";

// Fee thresholds for "active member" checks, mirrors MEMBERSHIP_FEES in clubMembers.js.
const MAJOR_FEE = 200;
const MINOR_FEE = 100;

export async function getReport8() {
  const columns = [
    "Location",
    "Address",
    "City",
    "Province",
    "Postal Code",
    "Phone Number",
    "Web Address",
    "Type",
    "Capacity",
    "General Manager",
    "Minor Members",
    "Major Members",
    "FIFA Players",
  ];
  try {
    const [results] = await db.execute(
      "SELECT * FROM (" +
        "SELECT " +
        "L.Name AS Name, L.Address AS Address, L.City AS City, L.Province AS Province, L.PostalCode AS PostalCode, " +
        "(SELECT GROUP_CONCAT(lp.PhoneNumber SEPARATOR ', ') FROM `LocationPhones` lp WHERE lp.LocationID = L.LocationID) AS PhoneNumbers, " +
        "L.WebAddress AS WebAddress, L.Type AS Type, L.MaxCapacity AS MaxCapacity, " +
        "(SELECT CONCAT(p.FirstName, ' ', p.LastName) FROM `Manages` m JOIN `Personnel` p ON p.PersonnelID = m.PersonnelID " +
        "  WHERE m.LocationID = L.LocationID AND m.EndDate IS NULL LIMIT 1) AS GeneralManager, " +
        "(SELECT COUNT(DISTINCT bt.MembershipNumber) FROM `BelongsTo` bt JOIN `MinorMembers` mm ON mm.MembershipNumber = bt.MembershipNumber " +
        "  WHERE bt.LocationID = L.LocationID AND bt.EndDate IS NULL) AS NumMinorMembers, " +
        "(SELECT COUNT(DISTINCT bt.MembershipNumber) FROM `BelongsTo` bt JOIN `MajorMembers` ma ON ma.MembershipNumber = bt.MembershipNumber " +
        "  WHERE bt.LocationID = L.LocationID AND bt.EndDate IS NULL) AS NumMajorMembers, " +
        "(SELECT COUNT(DISTINCT bt.MembershipNumber) FROM `BelongsTo` bt WHERE bt.LocationID = L.LocationID AND bt.EndDate IS NULL " +
        "  AND EXISTS (SELECT 1 FROM `ParticipatesIn` pi WHERE pi.MembershipNumber = bt.MembershipNumber)) AS NumParticipatedInGame " +
        "FROM `Locations` L" +
        ") AS LocationStats " +
        "WHERE NumParticipatedInGame >= 2 " +
        "ORDER BY NumParticipatedInGame DESC",
    );

    const rows = results.map((r) => [
      r.Name,
      r.Address,
      r.City,
      r.Province,
      r.PostalCode,
      r.PhoneNumbers,
      r.WebAddress,
      r.Type,
      r.MaxCapacity,
      r.GeneralManager,
      r.NumMinorMembers,
      r.NumMajorMembers,
      r.NumParticipatedInGame,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 8:", err);
    return { columns, rows: [] };
  }
}

export async function getReport9() {
  const columns = [
    "Family Member First Name",
    "Family Member Last Name",
    "Membership Number",
    "Child First Name",
    "Child Last Name",
    "Child DOB",
    "Relationship",
  ];
  try {
    const [results] = await db.execute(
      "SELECT " +
        "fm.FirstName AS FamilyFirstName, fm.LastName AS FamilyLastName, " +
        "cm.MembershipNumber AS MembershipNumber, cm.FirstName AS MemberFirstName, cm.LastName AS MemberLastName, " +
        "DATE_FORMAT(cm.DateOfBirth, '%Y-%m-%d') AS MemberDateOfBirth, g.RelationshipType AS Relationship " +
        "FROM `FamilyMembers` fm " +
        "JOIN `GuardianOf` g ON g.FamilyMemberID = fm.FamilyMemberID AND g.GuardianType = 'Primary' AND g.EndDate IS NULL " +
        "JOIN `ClubMembers` cm ON cm.MembershipNumber = g.MembershipNumber " +
        "WHERE EXISTS (SELECT 1 FROM `ParticipatesIn` pi WHERE pi.MembershipNumber = cm.MembershipNumber) " +
        "AND (SELECT COUNT(DISTINCT g2.MembershipNumber) FROM `GuardianOf` g2 " +
        "     WHERE g2.FamilyMemberID = fm.FamilyMemberID AND g2.GuardianType = 'Primary' AND g2.EndDate IS NULL " +
        "     AND EXISTS (SELECT 1 FROM `ParticipatesIn` pi2 WHERE pi2.MembershipNumber = g2.MembershipNumber)) >= 2 " +
        "ORDER BY fm.FirstName ASC, fm.LastName ASC",
    );

    const rows = results.map((r) => [
      r.FamilyFirstName,
      r.FamilyLastName,
      r.MembershipNumber,
      r.MemberFirstName,
      r.MemberLastName,
      r.MemberDateOfBirth,
      r.Relationship,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 9:", err);
    return { columns, rows: [] };
  }
}

export async function getReport10({ locationId, from, to } = {}) {
  const columns = [
    "Head Coach First Name",
    "Head Coach Last Name",
    "Start Time",
    "Address",
    "Nature",
    "Team Name",
    "Score",
    "Total Players",
    "Player First Name",
    "Player Last Name",
    "Player Role",
  ];
  if (!locationId || !from || !to) {
    return { columns, rows: [] };
  }
  try {
    const [results] = await db.execute(
      "SELECT " +
        "p.FirstName AS CoachFirstName, p.LastName AS CoachLastName, " +
        "DATE_FORMAT(s.SessionDate, '%W, %e-%M-%Y') AS DateLabel, DATE_FORMAT(s.SessionTime, '%l:%i %p') AS TimeLabel, " +
        "s.Address AS SessionAddress, s.Nature AS Nature, t.Name AS TeamName, tf.Score AS Score, " +
        "(SELECT COUNT(*) FROM `Assignments` a2 WHERE a2.FormationID = tf.FormationID) AS TotalPlayers, " +
        "cm.FirstName AS PlayerFirstName, cm.LastName AS PlayerLastName, a.Role AS PlayerRole " +
        "FROM `TeamFormations` tf " +
        "JOIN `Sessions` s ON s.SessionID = tf.SessionID " +
        "JOIN `Teams` t ON t.TeamID = tf.TeamID " +
        "JOIN `Personnel` p ON p.PersonnelID = tf.HeadCoachID " +
        "LEFT JOIN `Assignments` a ON a.FormationID = tf.FormationID " +
        "LEFT JOIN `ClubMembers` cm ON cm.MembershipNumber = a.MembershipNumber " +
        "WHERE t.LocationID = ? AND s.SessionDate BETWEEN ? AND ? " +
        "ORDER BY s.SessionDate ASC, s.SessionTime ASC",
      [locationId, from, to],
    );

    const rows = results.map((r) => [
      r.CoachFirstName,
      r.CoachLastName,
      `${r.DateLabel} ${r.TimeLabel}`,
      r.SessionAddress,
      r.Nature,
      r.TeamName,
      r.Score,
      r.TotalPlayers,
      r.PlayerFirstName,
      r.PlayerLastName,
      r.PlayerRole,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 10:", err);
    return { columns, rows: [] };
  }
}

export async function getReport11() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Total Games",
    "Min Year",
    "Max Year",
  ];
  try {
    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "COUNT(*) AS TotalGames, MIN(YEAR(fg.GameDate)) AS MinGameYear, MAX(YEAR(fg.GameDate)) AS MaxGameYear " +
        "FROM `ParticipatesIn` pi " +
        "JOIN `FIFA_Games` fg ON fg.GameID = pi.GameID " +
        "JOIN `ClubMembers` cm ON cm.MembershipNumber = pi.MembershipNumber " +
        "GROUP BY cm.MembershipNumber, cm.FirstName, cm.LastName " +
        "HAVING COUNT(*) >= 5 " +
        "ORDER BY TotalGames DESC",
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.TotalGames,
      r.MinGameYear,
      r.MaxGameYear,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 11:", err);
    return { columns, rows: [] };
  }
}

export async function getReport12({ from, to } = {}) {
  const columns = [
    "Location Name",
    "Training Sessions",
    "Training Players",
    "Game Sessions",
    "Game Players",
  ];
  if (!from || !to) {
    return { columns, rows: [] };
  }
  try {
    const [results] = await db.execute(
      "SELECT loc.Name AS LocationName, " +
        "COUNT(DISTINCT CASE WHEN s.Nature = 'Training' THEN tf.FormationID END) AS TotalTrainingSessions, " +
        "COUNT(CASE WHEN s.Nature = 'Training' THEN a.MembershipNumber END) AS TotalTrainingPlayers, " +
        "COUNT(DISTINCT CASE WHEN s.Nature = 'Game' THEN tf.FormationID END) AS TotalGameSessions, " +
        "COUNT(CASE WHEN s.Nature = 'Game' THEN a.MembershipNumber END) AS TotalGamePlayers " +
        "FROM `TeamFormations` tf " +
        "JOIN `Teams` t ON t.TeamID = tf.TeamID " +
        "JOIN `Locations` loc ON loc.LocationID = t.LocationID " +
        "JOIN `Sessions` s ON s.SessionID = tf.SessionID " +
        "LEFT JOIN `Assignments` a ON a.FormationID = tf.FormationID " +
        "WHERE s.SessionDate BETWEEN ? AND ? " +
        "GROUP BY loc.LocationID, loc.Name " +
        "HAVING TotalGameSessions >= 4 " +
        "ORDER BY TotalGameSessions DESC",
      [from, to],
    );

    const rows = results.map((r) => [
      r.LocationName,
      r.TotalTrainingSessions,
      r.TotalTrainingPlayers,
      r.TotalGameSessions,
      r.TotalGamePlayers,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 12:", err);
    return { columns, rows: [] };
  }
}

export async function getReport13() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Age",
    "Phone Number",
    "Email",
    "FIFA Games",
    "Location Name",
  ];
  try {
    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "TIMESTAMPDIFF(YEAR, cm.DateOfBirth, CURDATE()) AS Age, cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, " +
        "COUNT(*) AS TotalGames, loc.Name AS CurrentLocation " +
        "FROM `ClubMembers` cm " +
        "JOIN `ParticipatesIn` pi ON pi.MembershipNumber = cm.MembershipNumber " +
        "JOIN `BelongsTo` bt ON bt.MembershipNumber = cm.MembershipNumber AND bt.EndDate IS NULL " +
        "JOIN `Locations` loc ON loc.LocationID = bt.LocationID " +
        "WHERE NOT EXISTS (SELECT 1 FROM `Assignments` a WHERE a.MembershipNumber = cm.MembershipNumber) " +
        "AND (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "     WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) " +
        "  >= (CASE WHEN EXISTS (SELECT 1 FROM `MajorMembers` mm WHERE mm.MembershipNumber = cm.MembershipNumber) THEN ? ELSE ? END) " +
        "GROUP BY cm.MembershipNumber, cm.FirstName, cm.LastName, cm.DateOfBirth, cm.PhoneNumber, cm.Email, loc.Name " +
        "ORDER BY loc.Name ASC, TotalGames ASC",
      [MAJOR_FEE, MINOR_FEE],
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.Age,
      r.PhoneNumber,
      r.Email,
      r.TotalGames,
      r.CurrentLocation,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 13:", err);
    return { columns, rows: [] };
  }
}

export async function getReport14() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Status",
    "Date Joined",
    "Age",
    "Phone Number",
    "Email",
    "Location Name",
  ];
  try {
    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "CASE WHEN (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "           WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) >= ? " +
        "     THEN 'Active' ELSE 'Inactive' END AS Status, " +
        "DATE_FORMAT((SELECT MIN(bt2.StartDate) FROM `BelongsTo` bt2 WHERE bt2.MembershipNumber = cm.MembershipNumber), '%Y-%m-%d') AS DateJoined, " +
        "TIMESTAMPDIFF(YEAR, cm.DateOfBirth, CURDATE()) AS Age, cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, loc.Name AS CurrentLocation " +
        "FROM `ClubMembers` cm " +
        "JOIN `MajorMembers` mm ON mm.MembershipNumber = cm.MembershipNumber " +
        "JOIN `BelongsTo` bt ON bt.MembershipNumber = cm.MembershipNumber AND bt.EndDate IS NULL " +
        "JOIN `Locations` loc ON loc.LocationID = bt.LocationID " +
        "WHERE TIMESTAMPDIFF(YEAR, cm.DateOfBirth, " +
        "  (SELECT MIN(bt2.StartDate) FROM `BelongsTo` bt2 WHERE bt2.MembershipNumber = cm.MembershipNumber)) < 18 " +
        "ORDER BY loc.Name ASC, Age ASC",
      [MAJOR_FEE],
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.Status,
      r.DateJoined,
      r.Age,
      r.PhoneNumber,
      r.Email,
      r.CurrentLocation,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 14:", err);
    return { columns, rows: [] };
  }
}

export async function getReport15() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Age",
    "Phone Number",
    "Email",
    "Location Name",
    "FIFA Games",
  ];
  try {
    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "TIMESTAMPDIFF(YEAR, cm.DateOfBirth, CURDATE()) AS Age, cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, loc.Name AS CurrentLocation, " +
        "(SELECT COUNT(*) FROM `ParticipatesIn` pi WHERE pi.MembershipNumber = cm.MembershipNumber) AS TotalGames " +
        "FROM `ClubMembers` cm " +
        "JOIN `BelongsTo` bt ON bt.MembershipNumber = cm.MembershipNumber AND bt.EndDate IS NULL " +
        "JOIN `Locations` loc ON loc.LocationID = bt.LocationID " +
        "WHERE EXISTS (SELECT 1 FROM `Assignments` a WHERE a.MembershipNumber = cm.MembershipNumber AND a.Role = 'Goalkeeper') " +
        "AND NOT EXISTS (SELECT 1 FROM `Assignments` a WHERE a.MembershipNumber = cm.MembershipNumber AND a.Role <> 'Goalkeeper') " +
        "AND (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "     WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) " +
        "  >= (CASE WHEN EXISTS (SELECT 1 FROM `MajorMembers` mm WHERE mm.MembershipNumber = cm.MembershipNumber) THEN ? ELSE ? END) " +
        "ORDER BY loc.Name ASC, cm.MembershipNumber ASC",
      [MAJOR_FEE, MINOR_FEE],
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.Age,
      r.PhoneNumber,
      r.Email,
      r.CurrentLocation,
      r.TotalGames,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 15:", err);
    return { columns, rows: [] };
  }
}

export async function getReport16() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Age",
    "Phone Number",
    "Email",
    "Location Name",
  ];
  try {
    const roleExists = (role) =>
      "AND EXISTS (SELECT 1 FROM `Assignments` a JOIN `TeamFormations` tf ON tf.FormationID = a.FormationID " +
      "JOIN `Sessions` s ON s.SessionID = tf.SessionID " +
      `WHERE a.MembershipNumber = cm.MembershipNumber AND s.Nature = 'Game' AND a.Role = '${role}') `;

    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "TIMESTAMPDIFF(YEAR, cm.DateOfBirth, CURDATE()) AS Age, cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, loc.Name AS CurrentLocation " +
        "FROM `ClubMembers` cm " +
        "JOIN `BelongsTo` bt ON bt.MembershipNumber = cm.MembershipNumber AND bt.EndDate IS NULL " +
        "JOIN `Locations` loc ON loc.LocationID = bt.LocationID " +
        "WHERE (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "       WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) " +
        "  >= (CASE WHEN EXISTS (SELECT 1 FROM `MajorMembers` mm WHERE mm.MembershipNumber = cm.MembershipNumber) THEN ? ELSE ? END) " +
        roleExists("Goalkeeper") +
        roleExists("Right fullback") +
        roleExists("Sweeper") +
        roleExists("Defending midfielder") +
        roleExists("Striker") +
        "ORDER BY loc.Name ASC, cm.MembershipNumber ASC",
      [MAJOR_FEE, MINOR_FEE],
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.Age,
      r.PhoneNumber,
      r.Email,
      r.CurrentLocation,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 16:", err);
    return { columns, rows: [] };
  }
}

export async function getReport17({ locationId } = {}) {
  const columns = ["First Name", "Last Name", "Phone Number"];
  if (!locationId) {
    return { columns, rows: [] };
  }
  try {
    const [results] = await db.execute(
      "SELECT DISTINCT fm.FirstName AS FirstName, fm.LastName AS LastName, fm.PhoneNumber AS PhoneNumber " +
        "FROM `FamilyMembers` fm " +
        "WHERE EXISTS (SELECT 1 FROM `Personnel` p JOIN `TeamFormations` tf ON tf.HeadCoachID = p.PersonnelID " +
        "  JOIN `Teams` t ON t.TeamID = tf.TeamID WHERE p.SSN = fm.SSN AND t.LocationID = ?) " +
        "AND EXISTS (SELECT 1 FROM `GuardianOf` g JOIN `ClubMembers` cm ON cm.MembershipNumber = g.MembershipNumber " +
        "  WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL " +
        "  AND (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "       WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) " +
        "    >= (CASE WHEN EXISTS (SELECT 1 FROM `MajorMembers` mm2 WHERE mm2.MembershipNumber = cm.MembershipNumber) THEN ? ELSE ? END)) " +
        "ORDER BY fm.LastName ASC, fm.FirstName ASC",
      [locationId, MAJOR_FEE, MINOR_FEE],
    );

    const rows = results.map((r) => [r.FirstName, r.LastName, r.PhoneNumber]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 17:", err);
    return { columns, rows: [] };
  }
}

export async function getReport18() {
  const columns = [
    "Membership Number",
    "First Name",
    "Last Name",
    "Age",
    "Phone Number",
    "Email",
    "Location Name",
  ];
  try {
    const [results] = await db.execute(
      "SELECT cm.MembershipNumber AS MembershipNumber, cm.FirstName AS FirstName, cm.LastName AS LastName, " +
        "TIMESTAMPDIFF(YEAR, cm.DateOfBirth, CURDATE()) AS Age, cm.PhoneNumber AS PhoneNumber, cm.Email AS Email, loc.Name AS CurrentLocation " +
        "FROM `ClubMembers` cm " +
        "JOIN `BelongsTo` bt ON bt.MembershipNumber = cm.MembershipNumber AND bt.EndDate IS NULL " +
        "JOIN `Locations` loc ON loc.LocationID = bt.LocationID " +
        "WHERE (SELECT COALESCE(SUM(pay.Amount), 0) FROM `Payments` pay " +
        "       WHERE pay.MembershipNumber = cm.MembershipNumber AND pay.MembershipYear = YEAR(CURDATE()) - 1) " +
        "  >= (CASE WHEN EXISTS (SELECT 1 FROM `MajorMembers` mm WHERE mm.MembershipNumber = cm.MembershipNumber) THEN ? ELSE ? END) " +
        "AND EXISTS (SELECT 1 FROM `Assignments` a JOIN `TeamFormations` tf ON tf.FormationID = a.FormationID " +
        "  JOIN `Sessions` s ON s.SessionID = tf.SessionID WHERE a.MembershipNumber = cm.MembershipNumber AND s.Nature = 'Game') " +
        "AND NOT EXISTS (SELECT 1 FROM `Assignments` a JOIN `TeamFormations` tf ON tf.FormationID = a.FormationID " +
        "  JOIN `Sessions` s ON s.SessionID = tf.SessionID WHERE a.MembershipNumber = cm.MembershipNumber " +
        "  AND s.Nature = 'Game' AND tf.Score IS NOT NULL " +
        "  AND EXISTS (SELECT 1 FROM `TeamFormations` opp WHERE opp.SessionID = tf.SessionID " +
        "    AND opp.FormationID <> tf.FormationID AND opp.Score IS NOT NULL AND tf.Score > opp.Score)) " +
        "ORDER BY loc.Name ASC, cm.MembershipNumber ASC",
      [MAJOR_FEE, MINOR_FEE],
    );

    const rows = results.map((r) => [
      r.MembershipNumber,
      r.FirstName,
      r.LastName,
      r.Age,
      r.PhoneNumber,
      r.Email,
      r.CurrentLocation,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 18:", err);
    return { columns, rows: [] };
  }
}

export async function getReport19() {
  const columns = [
    "First Name",
    "Last Name",
    "Minor Members",
    "FIFA Members",
    "Phone Number",
    "Email",
    "Location Name",
    "Role",
  ];
  try {
    const [results] = await db.execute(
      "SELECT p.FirstName AS FirstName, p.LastName AS LastName, " +
        "(SELECT COUNT(DISTINCT g.MembershipNumber) FROM `GuardianOf` g " +
        "  WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL) AS NumAssociatedMinors, " +
        "(SELECT COUNT(DISTINCT g.MembershipNumber) FROM `GuardianOf` g " +
        "  WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL " +
        "  AND EXISTS (SELECT 1 FROM `ParticipatesIn` pi WHERE pi.MembershipNumber = g.MembershipNumber)) AS NumParticipated, " +
        "p.PhoneNumber AS PhoneNumber, p.Email AS Email, loc.Name AS CurrentLocation, p.Role AS CurrentRole " +
        "FROM `Personnel` p " +
        "JOIN `FamilyMembers` fm ON fm.SSN = p.SSN " +
        "LEFT JOIN `WorksAt` w ON w.PersonnelID = p.PersonnelID AND w.EndDate IS NULL " +
        "LEFT JOIN `Locations` loc ON loc.LocationID = w.LocationID " +
        "WHERE p.Mandate = 'Volunteer' " +
        "AND EXISTS (SELECT 1 FROM `GuardianOf` g WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL) " +
        "AND EXISTS (SELECT 1 FROM `GuardianOf` g JOIN `ParticipatesIn` pi ON pi.MembershipNumber = g.MembershipNumber " +
        "  WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL) " +
        "ORDER BY loc.Name ASC, p.Role ASC, p.FirstName ASC, p.LastName ASC",
    );

    const rows = results.map((r) => [
      r.FirstName,
      r.LastName,
      r.NumAssociatedMinors,
      r.NumParticipated,
      r.PhoneNumber,
      r.Email,
      r.CurrentLocation,
      r.CurrentRole,
    ]);
    return { columns, rows };
  } catch (err) {
    console.error("Error running report 19:", err);
    return { columns, rows: [] };
  }
}

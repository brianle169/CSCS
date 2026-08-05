// --- Reports (queries 8-19 from the project spec) ---
//
// Each function returns { columns, rows } — columns are the header labels
// already pulled from the spec's own field lists, rows is an array of
// arrays (one array per result row, values in the same order as columns).
// The SQL itself isn't written yet; each stub just returns an empty rows
// array for now so the Reports page has something real to render against.
// Fill in the query, keep the columns/order the same, and the page picks
// it up with no other changes needed.
//
// (No `import db from "./pool.js"` yet since none of these run a query
// yet — add it when the first real query goes in.)

export async function getReport8() {
  // Locations with at least two members who participated in a FIFA game,
  // sorted descending by number of FIFA players.
  return {
    columns: [
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
    ],
    rows: [],
  };
}

export async function getReport9() {
  // Primary family members with >=2 club members (associated with them) who
  // played a FIFA game, sorted ascending by family member first then last name.
  return {
    columns: [
      "Family Member First Name",
      "Family Member Last Name",
      "Membership Number",
      "Child First Name",
      "Child Last Name",
      "Child DOB",
      "Relationship",
    ],
    rows: [],
  };
}

export async function getReport10() {
  // For a given location + date range: all team formations in that window,
  // sorted ascending by session start time. Needs location + date range params.
  return {
    columns: [
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
    ],
    rows: [],
  };
}

export async function getReport11() {
  // Members who played >=5 FIFA games, sorted descending by games played.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Total Games",
      "Min Year",
      "Max Year",
    ],
    rows: [],
  };
}

export async function getReport12() {
  // For a given date range: training/game session totals per location,
  // only locations with >=4 game sessions, sorted descending by game sessions.
  return {
    columns: [
      "Location Name",
      "Training Sessions",
      "Training Players",
      "Game Sessions",
      "Game Players",
    ],
    rows: [],
  };
}

export async function getReport13() {
  // Active members never assigned to a formation, but who played >=1 FIFA
  // game, sorted ascending by location then FIFA game count.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Age",
      "Phone Number",
      "Email",
      "FIFA Games",
      "Location Name",
    ],
    rows: [],
  };
}

export async function getReport14() {
  // Major members who've been members since they were minors, sorted
  // ascending by location then age.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Status",
      "Date Joined",
      "Age",
      "Phone Number",
      "Email",
      "Location Name",
    ],
    rows: [],
  };
}

export async function getReport15() {
  // Active members only ever assigned as Goalkeeper (and assigned at least
  // once), sorted ascending by location then membership number.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Age",
      "Phone Number",
      "Email",
      "Location Name",
      "FIFA Games",
    ],
    rows: [],
  };
}

export async function getReport16() {
  // Active members assigned at least once to each of: Goalkeeper, Right
  // fullback, Sweeper, Defending, Striker. Sorted ascending by location
  // then membership number.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Age",
      "Phone Number",
      "Email",
      "Location Name",
    ],
    rows: [],
  };
}

export async function getReport17() {
  // For a given location: family members with an active club member there
  // who are also head coaches at that same location. Needs location param.
  return {
    columns: ["First Name", "Last Name", "Phone Number"],
    rows: [],
  };
}

export async function getReport18() {
  // Active members who never won a game they were assigned to, sorted
  // ascending by location then membership number.
  return {
    columns: [
      "Membership Number",
      "First Name",
      "Last Name",
      "Age",
      "Phone Number",
      "Email",
      "Location Name",
    ],
    rows: [],
  };
}

export async function getReport19() {
  // Volunteer personnel who are family members of >=1 minor club member and
  // have >=1 club member who played a FIFA game. Sorted ascending by
  // location, then role, then first name, then last name.
  return {
    columns: [
      "First Name",
      "Last Name",
      "Minor Members",
      "FIFA Members",
      "Phone Number",
      "Email",
      "Location Name",
      "Role",
    ],
    rows: [],
  };
}

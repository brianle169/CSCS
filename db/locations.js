import db from "./pool.js";

export async function getLocations() {
  try {
    const [results, fields] = await db.execute("SELECT * FROM `Locations`");

    return results;
  } catch (err) {
    return [];
  }
}

export async function getLocationCount() {
  try {
    const [[{ n }]] = await db.execute(
      "SELECT COUNT(*) AS n FROM `Locations`",
    );
    return n;
  } catch (err) {
    console.error("Error counting locations:", err);
    return 0;
  }
}

export async function addLocation(data) {
  if (!data) {
    throw new Error("No data provided for adding location");
  }

  try {
    const [results, fields] = await db.execute(
      "INSERT INTO `Locations` (Type, Name, Address, City, Province, PostalCode, WebAddress, MaxCapacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.type,
        data.name,
        data.address,
        data.city,
        data.province,
        data.postalCode,
        data.webAddress,
        data.maxCapacity,
      ],
    );
    return results;
  } catch (err) {
    console.error("Error adding location:", err);
    throw err;
  }
}

export async function deleteLocation(locationId) {
  if (!locationId) {
    throw new Error("No location ID provided for deletion");
  }
  try {
    const [results, fields] = await db.execute(
      "DELETE FROM `Locations` WHERE LocationID = ?",
      [locationId],
    );
    return results;
  } catch (err) {
    console.error("Error deleting location:", err);
    throw err;
  }
}

export async function editLocation(locationId, data) {
  if (!locationId || !data) {
    throw new Error("Location ID and data are required for editing");
  }
  try {
    const [results, fields] = await db.execute(
      "UPDATE `Locations` SET Type = ?, Name = ?, Address = ?, City = ?, Province = ?, PostalCode = ?, WebAddress = ?, MaxCapacity = ? WHERE LocationID = ?",
      [
        data.type,
        data.name,
        data.address,
        data.city,
        data.province,
        data.postalCode,
        data.webAddress,
        data.maxCapacity,
        locationId,
      ],
    );
    return results;
  } catch (err) {
    console.error("Error editing location:", err);
    throw err;
  }
}

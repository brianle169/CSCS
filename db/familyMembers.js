import db from "./pool.js";

export async function getFamilyMembers() {
  try {
    const [results, fields] = await db.execute(
      "SELECT * FROM `FamilyMembers`",
    );
    return results;
  } catch (err) {
    return [];
  }
}

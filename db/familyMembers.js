import db from "./pool.js";

// Handles a family member's personal details only. Guardianship is in db/guardians.js.

export async function getFamilyMembers() {
  try {
    const [results] = await db.execute(
      "SELECT fm.FamilyMemberID AS FamilyMemberID, fm.SSN AS SSN, " +
        "fm.MedicareCardNumber AS MedicareCardNumber, " +
        "fm.FirstName AS FirstName, fm.LastName AS LastName, " +
        "DATE_FORMAT(fm.DateOfBirth, '%Y-%m-%d') AS DateOfBirth, " +
        "fm.PhoneNumber AS PhoneNumber, fm.Email AS Email, " +
        "fm.Address AS Address, fm.City AS City, fm.Province AS Province, " +
        "fm.PostalCode AS PostalCode, " +
        // Active ward count, shown on the roster.
        "(SELECT COUNT(*) FROM `GuardianOf` g " +
        "  WHERE g.FamilyMemberID = fm.FamilyMemberID AND g.EndDate IS NULL) AS ActiveWards " +
        "FROM `FamilyMembers` fm " +
        "ORDER BY fm.LastName, fm.FirstName",
    );
    return results;
  } catch (err) {
    console.error("Error fetching family members:", err);
    return [];
  }
}

export async function editFamilyMember(familyMemberId, data) {
  if (!familyMemberId || !data) {
    throw new Error("Family member and data are required for editing.");
  }

  try {
    const [result] = await db.execute(
      "UPDATE `FamilyMembers` SET SSN = ?, MedicareCardNumber = ?, FirstName = ?, " +
        "LastName = ?, DateOfBirth = ?, PhoneNumber = ?, Email = ?, Address = ?, " +
        "City = ?, Province = ?, PostalCode = ? WHERE FamilyMemberID = ?",
      [
        data.ssn,
        data.medicareCardNumber || null,
        data.firstName,
        data.lastName,
        data.dateOfBirth,
        data.phoneNumber || null,
        data.email || null,
        data.address || null,
        data.city || null,
        data.province || null,
        data.postalCode || null,
        familyMemberId,
      ],
    );
    return result;
  } catch (err) {
    console.error("Error editing family member:", err);
    throw err;
  }
}

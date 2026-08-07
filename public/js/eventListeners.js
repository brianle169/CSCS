document.addEventListener("DOMContentLoaded", function () {
  // This file is shared across pages (Locations, Personnels, ...), so every
  // lookup below is guarded with an "if it exists on this page" check —
  // otherwise a page missing one of these elements would throw and stop the
  // rest of the script from running.

  // --- Locations page ---
  const addLocationButton = document.getElementById("location-add-button");
  const locationAddModal = document.getElementById("location-add-modal");
  const locationAddForm = document.getElementById("location-add-form");

  if (addLocationButton && locationAddModal) {
    addLocationButton.addEventListener("click", function () {
      locationAddModal.classList.toggle("hidden");
    });
  }

  if (locationAddForm && locationAddModal) {
    locationAddForm.addEventListener("submit", function () {
      locationAddModal.classList.add("hidden");
    });
  }

  document
    .querySelectorAll("button[id^='location-edit-button-']")
    .forEach(function (button) {
      const locationId = button.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `location-edit-modal-${locationId}`,
      );
      if (editModal) {
        button.addEventListener("click", function () {
          editModal.classList.toggle("hidden");
        });
      }
    });

  document
    .querySelectorAll("form[id^='location-edit-form-']")
    .forEach(function (form) {
      const locationId = form.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `location-edit-modal-${locationId}`,
      );
      if (editModal) {
        form.addEventListener("submit", function () {
          editModal.classList.add("hidden");
        });
      }
    });

  // --- Personnels page ---
  const addPersonnelButton = document.getElementById("personnel-add-button");
  const personnelAddModal = document.getElementById("personnel-add-modal");
  const personnelAddForm = document.getElementById("personnel-add-form");

  if (addPersonnelButton && personnelAddModal) {
    addPersonnelButton.addEventListener("click", function () {
      personnelAddModal.classList.toggle("hidden");
    });
  }

  if (personnelAddForm && personnelAddModal) {
    personnelAddForm.addEventListener("submit", function () {
      personnelAddModal.classList.add("hidden");
    });
  }

  document
    .querySelectorAll("button[id^='personnel-edit-button-']")
    .forEach(function (button) {
      const personnelId = button.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `personnel-edit-modal-${personnelId}`,
      );
      if (editModal) {
        button.addEventListener("click", function () {
          editModal.classList.toggle("hidden");
        });
      }
    });

  document
    .querySelectorAll("form[id^='personnel-edit-form-']")
    .forEach(function (form) {
      const personnelId = form.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `personnel-edit-modal-${personnelId}`,
      );
      if (editModal) {
        form.addEventListener("submit", function () {
          editModal.classList.add("hidden");
        });
      }
    });

  // --- Club Members page ---
  const addClubMemberButton = document.getElementById("clubmember-add-button");
  const clubMemberAddModal = document.getElementById("clubmember-add-modal");
  const clubMemberAddForm = document.getElementById("clubmember-add-form");

  if (addClubMemberButton && clubMemberAddModal) {
    addClubMemberButton.addEventListener("click", function () {
      clubMemberAddModal.classList.toggle("hidden");
    });
  }

  if (clubMemberAddForm && clubMemberAddModal) {
    clubMemberAddForm.addEventListener("submit", function () {
      clubMemberAddModal.classList.add("hidden");
    });
  }

  document
    .querySelectorAll("button[id^='clubmember-edit-button-']")
    .forEach(function (button) {
      const membershipNumber = button.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `clubmember-edit-modal-${membershipNumber}`,
      );
      if (editModal) {
        button.addEventListener("click", function () {
          editModal.classList.toggle("hidden");
        });
      }
    });

  document
    .querySelectorAll("form[id^='clubmember-edit-form-']")
    .forEach(function (form) {
      const membershipNumber = form.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `clubmember-edit-modal-${membershipNumber}`,
      );
      if (editModal) {
        form.addEventListener("submit", function () {
          editModal.classList.add("hidden");
        });
      }
    });

  document
    .querySelectorAll("button[id^='clubmember-pay-button-']")
    .forEach(function (button) {
      const membershipNumber = button.getAttribute("id").split("-").pop();
      const payModal = document.getElementById(
        `clubmember-pay-modal-${membershipNumber}`,
      );
      if (payModal) {
        button.addEventListener("click", function () {
          payModal.classList.toggle("hidden");
        });
      }
    });

  // --- Add Club Member: the guardian section, shown only for minors ---
  // Major/Minor is decided by date of birth on the server, so this mirrors that
  // rule client-side to decide what the form shows. It also owns the `required`
  // flags: a required field inside a hidden block makes the browser refuse to
  // submit with an unfocusable-control error, so `required` is only ever set on
  // fields that are actually visible.
  const guardianSection = document.getElementById("clubmember-guardian-section");
  const memberDobInput = document.querySelector(
    "#clubmember-add-form input[name='dateOfBirth']",
  );

  if (guardianSection && memberDobInput) {
    const ageOn = function (value) {
      if (!value) return null;
      const dob = new Date(value);
      if (isNaN(dob.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    };

    const syncGuardianSection = function () {
      const age = ageOn(memberDobInput.value);
      const isMinor = age !== null && age < 18;
      guardianSection.classList.toggle("hidden", !isMinor);

      guardianSection
        .querySelectorAll(".guardian-existing-select")
        .forEach(function (select) {
          // An existing person is already on file, so their personal details
          // are not asked for again.
          const slot = select.closest(".guardian-slot");
          const newFields = slot
            ? slot.querySelector(".guardian-new-fields")
            : null;
          const registeringNew = select.value === "";
          if (newFields) {
            newFields.classList.toggle("hidden", !registeringNew);
            newFields.querySelectorAll("[data-req]").forEach(function (field) {
              field.required = isMinor && registeringNew;
            });
          }
        });

      // Relationship lives outside the new-person block: always required for a
      // minor, whichever mode the slot is in.
      guardianSection
        .querySelectorAll("select[data-req]")
        .forEach(function (field) {
          field.required = isMinor;
        });
    };

    memberDobInput.addEventListener("change", syncGuardianSection);
    memberDobInput.addEventListener("input", syncGuardianSection);
    guardianSection
      .querySelectorAll(".guardian-existing-select")
      .forEach(function (select) {
        select.addEventListener("change", syncGuardianSection);
      });
    syncGuardianSection();
  }

  // --- Guardians (on the Club Members page, under each minor member) ---
  document
    .querySelectorAll("button[id^='guardian-add-button-']")
    .forEach(function (button) {
      const membershipNumber = button.getAttribute("id").split("-").pop();
      const addModal = document.getElementById(
        `guardian-add-modal-${membershipNumber}`,
      );
      if (addModal) {
        button.addEventListener("click", function () {
          addModal.classList.toggle("hidden");
        });
      }
    });

  // --- Family Members page ---
  document
    .querySelectorAll("button[id^='familymember-edit-button-']")
    .forEach(function (button) {
      const familyMemberId = button.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `familymember-edit-modal-${familyMemberId}`,
      );
      if (editModal) {
        button.addEventListener("click", function () {
          editModal.classList.toggle("hidden");
        });
      }
    });

  document
    .querySelectorAll("form[id^='familymember-edit-form-']")
    .forEach(function (form) {
      const familyMemberId = form.getAttribute("id").split("-").pop();
      const editModal = document.getElementById(
        `familymember-edit-modal-${familyMemberId}`,
      );
      if (editModal) {
        form.addEventListener("submit", function () {
          editModal.classList.add("hidden");
        });
      }
    });

  // --- Reports page ---
  document.querySelectorAll(".report-toggle").forEach(function (button) {
    const reportId = button.getAttribute("id").split("-").pop();
    const body = document.getElementById(`report-body-${reportId}`);
    const arrow = button.querySelector(".report-toggle-arrow");
    if (body) {
      button.addEventListener("click", function () {
        body.classList.toggle("hidden");
        if (arrow) {
          arrow.classList.toggle("rotate-180");
        }
      });
    }
  });
});

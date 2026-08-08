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

  // --- Family Members page: live filtering ---
  // Filters the rows already rendered rather than round-tripping to the server.
  // The whole roster is on the page, so this stays instant.
  const familyFilterForm = document.getElementById("familymember-filter");
  const familyNameInput = document.getElementById("filter-name");
  const familyPhoneInput = document.getElementById("filter-phone-number");
  const familyEmailInput = document.getElementById("filter-email");

  if (familyFilterForm && familyNameInput && familyPhoneInput && familyEmailInput) {
    const familyRows = Array.from(document.querySelectorAll(".familymember-row"));
    const noMatchesRow = document.getElementById("familymember-no-matches");
    const filterCount = document.getElementById("familymember-filter-count");
    const clearButton = document.getElementById("familymember-filter-clear");

    // This data is full of French accents (Stéphane, Côté, Bélanger), so both
    // the query and the value are folded to plain ASCII before comparing —
    // typing "stephane" still finds "Stéphane".
    const fold = function (value) {
      return (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    };
    // Phone formatting is inconsistent (514-555-1001, 438 555 1008), so phones
    // are compared as digits only: "5145551001" matches "514-555-1001".
    const digitsOnly = function (value) {
      return (value || "").replace(/\D/g, "");
    };

    const applyFamilyFilter = function () {
      const name = fold(familyNameInput.value);
      const phone = digitsOnly(familyPhoneInput.value);
      const email = fold(familyEmailInput.value);
      let shown = 0;

      familyRows.forEach(function (row) {
        const matches =
          fold(row.dataset.name).includes(name) &&
          (phone === "" || digitsOnly(row.dataset.phone).includes(phone)) &&
          fold(row.dataset.email).includes(email);
        row.classList.toggle("hidden", !matches);
        if (matches) shown++;
      });

      if (noMatchesRow) {
        noMatchesRow.classList.toggle("hidden", shown > 0);
      }
      if (filterCount) {
        filterCount.textContent =
          shown === familyRows.length
            ? `${familyRows.length} family member${familyRows.length === 1 ? "" : "s"}`
            : `${shown} of ${familyRows.length} family members`;
      }
    };

    [familyNameInput, familyPhoneInput, familyEmailInput].forEach(function (input) {
      input.addEventListener("input", applyFamilyFilter);
    });

    // The form has no action, so a stray Enter would otherwise reload the page
    // and wipe the filters.
    familyFilterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      applyFamilyFilter();
    });

    if (clearButton) {
      clearButton.addEventListener("click", function () {
        familyNameInput.value = "";
        familyPhoneInput.value = "";
        familyEmailInput.value = "";
        applyFamilyFilter();
      });
    }

    // Sets the initial count.
    applyFamilyFilter();
  }

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

  // --- Team Formations: create a session ---
  const sessionAddButton = document.getElementById("session-add-button");
  const sessionAddModal = document.getElementById("session-add-modal");
  if (sessionAddButton && sessionAddModal) {
    sessionAddButton.addEventListener("click", function () {
      sessionAddModal.classList.toggle("hidden");
    });
  }

  // --- Team Formations: add a team to a session, edit a formation ---
  // Both sit inside the session's collapsible body, so each click is stopped
  // from bubbling up to the session toggle.
  [
    ["formation-add-button-", "formation-add-modal-"],
    ["formation-edit-button-", "formation-edit-modal-"],
  ].forEach(function (pair) {
    document
      .querySelectorAll(`button[id^='${pair[0]}']`)
      .forEach(function (button) {
        const id = button.getAttribute("id").split("-").pop();
        const modal = document.getElementById(`${pair[1]}${id}`);
        if (modal) {
          button.addEventListener("click", function (event) {
            event.stopPropagation();
            modal.classList.toggle("hidden");
          });
        }
      });
  });

  // --- Team Formations: assign a player ---
  document
    .querySelectorAll("button[id^='assignment-add-button-']")
    .forEach(function (button) {
      const formationId = button.getAttribute("id").split("-").pop();
      const modal = document.getElementById(
        `assignment-add-modal-${formationId}`,
      );
      if (modal) {
        button.addEventListener("click", function (event) {
          // The button sits inside the session's collapsible header region;
          // without this the click would also toggle the session shut.
          event.stopPropagation();
          modal.classList.toggle("hidden");
        });
      }
    });

  // Changing a player's role submits immediately — it is the only edit this
  // page offers, so a separate Save button would be a wasted click. The
  // <noscript> fallback in the template covers JS being unavailable.
  document
    .querySelectorAll("select.assignment-role-select")
    .forEach(function (select) {
      select.addEventListener("change", function () {
        select.form.submit();
      });
    });

  // --- Team Formations page ---
  document.querySelectorAll(".session-toggle").forEach(function (button) {
    const sessionId = button.getAttribute("id").split("-").pop();
    const body = document.getElementById(`session-body-${sessionId}`);
    const arrow = button.querySelector(".session-toggle-arrow");
    if (body) {
      button.addEventListener("click", function () {
        body.classList.toggle("hidden");
        if (arrow) {
          arrow.classList.toggle("rotate-180");
        }
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

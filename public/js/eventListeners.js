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
});

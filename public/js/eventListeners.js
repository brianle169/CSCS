document.addEventListener("DOMContentLoaded", function () {
  const addLocationButton = document.getElementById("location-add-button");
  const editLocationButtons = document.querySelectorAll(
    "button[id^='location-edit-button-']",
  );
  const locationModal = document.getElementById("location-add-modal");
  const locationEditModal = document.getElementById("location-edit-modal");
  const locationAddForm = document.getElementById("location-add-form");
  const locationEditForm = document.getElementById("location-edit-form");

  addLocationButton.addEventListener("click", function () {
    locationModal.classList.toggle("hidden");
  });

  editLocationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const locationId = this.getAttribute("id").split("-").pop();
      const locationEditModal = document.getElementById(
        `location-edit-modal-${locationId}`,
      );
      locationEditModal.classList.toggle("hidden");
    });
  });

  locationEditForm.addEventListener("submit", function () {
    locationEditModal.classList.add("hidden");
  });

  locationAddForm.addEventListener("submit", function () {
    locationModal.classList.add("hidden");
  });
});

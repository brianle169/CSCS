document.addEventListener("DOMContentLoaded", function () {
  const addLocationButton = document.getElementById("location-add-button");
  const locationModal = document.getElementById("location-modal");
  const locationAddForm = document.getElementById("location-add-form");

  addLocationButton.addEventListener("click", function () {
    locationModal.classList.toggle("hidden");
  });

  locationAddForm.addEventListener("submit", function () {
    locationModal.classList.add("hidden");
  });
});

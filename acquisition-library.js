"use strict";
const librarySearch = document.getElementById("library-search");
const libraryCategory = document.getElementById("library-category");
const libraryRows = [...document.querySelectorAll("#library-rows tr")];
const libraryText = libraryRows.map(row => row.textContent.toLowerCase());
function filterLibrary() {
  const query = librarySearch.value.trim().toLowerCase();
  let shown = 0;
  libraryRows.forEach((row, i) => {
    const visible = (!query || libraryText[i].includes(query)) && (!libraryCategory.value || row.dataset.category === libraryCategory.value);
    row.hidden = !visible;
    if (visible) shown++;
  });
  document.getElementById("library-count").textContent = `${shown} of ${libraryRows.length} entries`;
}
librarySearch.addEventListener("input", filterLibrary);
libraryCategory.addEventListener("change", filterLibrary);
document.getElementById("library-reset").addEventListener("click", () => {
  librarySearch.value = "";
  libraryCategory.value = "";
  filterLibrary();
  librarySearch.focus();
});
filterLibrary();

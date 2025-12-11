const fileInputs = document.querySelectorAll(".file-input");

fileInputs.forEach((component) => {
  const dropzone = component.querySelector(".file-dropzone");
  const input = component.querySelector(".file-input-field");
  const list = component.querySelector(".file-list");
  const maxSize = Number(component.dataset.maxSize) * 1024 * 1024; // MB → bytes

  // Click → open file dialog
  dropzone.addEventListener("click", () => input.click());

  // Change event
  input.addEventListener("change", () => handleFiles(input.files));

  // Drag events
  ["dragenter", "dragover"].forEach((event) => {
    dropzone.addEventListener(event, (e) => {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((event) => {
    dropzone.addEventListener(event, () => {
      dropzone.classList.remove("is-dragover");
    });
  });

  // Drop files
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  // Handle files
  function handleFiles(files) {
    [...files].forEach((file) => {
      const item = document.createElement("div");
      const isTooLarge = file.size > maxSize;

      item.className =
        "file-item " + (isTooLarge ? "file-item--error" : "file-item--success");

      item.innerHTML = `
        <div class="file-item__info">
          <span class="file-item__name">${file.name}</span>
          <span class="file-item__size">${(file.size / 1024 / 1024).toFixed(
            1
          )} MB</span>

          ${
            isTooLarge
              ? `<span class="file-item__error-msg">File exceeds size limit</span>`
              : ""
          }
        </div>

        <div class="file-item__indicator"></div>
        <button class="file-item__remove">×</button>
      `;

      // Remove event
      item.querySelector(".file-item__remove").addEventListener("click", () => {
        item.remove();
      });

      list.appendChild(item);
    });
  }
});

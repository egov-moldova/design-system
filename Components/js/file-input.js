document.addEventListener("DOMContentLoaded", () => {

  const formatSize = bytes =>
    (bytes / 1024 / 1024).toFixed(1) + " MB";

  function createUploadItem(file, previewImages = false) {
    const item = document.createElement("div");
    item.className = "upload__item";

    const thumb = document.createElement("div");
    thumb.className = "upload__thumb";

    if (previewImages && file.type.startsWith("image/")) {
      thumb.classList.add("upload__thumb--image");

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = file.name.split(".").pop();
    }

    const info = document.createElement("div");
    info.className = "upload__info";
    info.innerHTML = `<span class="upload__file-name">${file.name}</span><span class="mx-4"> • </span>${formatSize(file.size)}`;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "upload__remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.innerHTML = `
      <svg class="icon medium" aria-hidden="true">
        <use href="assets/icons/sprite.svg#icon-cross-small"></use>
      </svg>
    `;

    remove.addEventListener("click", () => item.remove());

    item.append(thumb, info, remove);
    return item;
  }

  function initUpload(inputId, listId, previewImages = false) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);

    if (!input || !list) return;

    input.addEventListener("change", () => {
      list.innerHTML = "";
      Array.from(input.files).forEach(file => {
        list.appendChild(createUploadItem(file, previewImages));
      });
    });
  }

  initUpload("single-upload", "single-list", true);
  initUpload("multi-upload", "multi-list");
  initUpload("image-upload", "image-list", true);

});

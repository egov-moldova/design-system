document.addEventListener("DOMContentLoaded", () => {

  function formatSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function createFileItem(file, showPreview = false) {
    const item = document.createElement("div");
    item.className = "upload-item";

    // Thumbnail
    if (showPreview && file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "upload-thumb";
      img.src = URL.createObjectURL(file);
      item.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "upload-thumb";
      item.appendChild(icon);
    }

    // Filename + size
    const info = document.createElement("div");
    info.className = "upload-file-info";
    info.innerHTML = `<strong>${file.name}</strong> • ${formatSize(file.size)}`;
    item.appendChild(info);

    // Remove button
    const remove = document.createElement("div");
    remove.className = "upload-remove";
    remove.innerHTML = "&times;";
    remove.onclick = () => item.remove();
    item.appendChild(remove);

    return item;
  }

  // =========================
  // SINGLE UPLOAD
  // =========================
  const singleInput = document.getElementById("single-upload");
  const singleList  = document.getElementById("single-list");

  if (singleInput) {
    singleInput.addEventListener("change", () => {
      singleList.innerHTML = ""; // resetare listă
      const file = singleInput.files[0];
      if (file) {
        singleList.appendChild(createFileItem(file, true));
      }
    });
  }

  // =========================
  // MULTIPLE UPLOAD
  // =========================
  const multiInput = document.getElementById("multi-upload");
  const multiList  = document.getElementById("multi-list");

  if (multiInput) {
    multiInput.addEventListener("change", () => {
      multiList.innerHTML = "";
      Array.from(multiInput.files).forEach(file => {
        multiList.appendChild(createFileItem(file, true));
      });
    });
  }

  // =========================
  // IMAGE PREVIEW UPLOAD
  // =========================
  const imgInput = document.getElementById("image-upload");
  const imgList  = document.getElementById("image-list");

  if (imgInput) {
    imgInput.addEventListener("change", () => {
      imgList.innerHTML = "";
      Array.from(imgInput.files).forEach(file => {
        imgList.appendChild(createFileItem(file, true));
      });
    });
  }

});

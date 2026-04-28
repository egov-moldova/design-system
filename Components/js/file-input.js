document.addEventListener("DOMContentLoaded", () => {
  /* =====================================================
   * Helpers
   * ===================================================== */
  const formatSize = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";

  const CONFIG = {
    maxSize: 100 * 1024 * 1024, // 100 MB
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
  };

  function validateFile(file) {
    if (!CONFIG.allowedTypes.includes(file.type)) {
      return "Unsupported file format";
    }
    if (file.size > CONFIG.maxSize) {
      return "File exceeds maximum size (100 MB)";
    }
    return null;
  }

  /* =====================================================
   * Upload item creator (states)
   * ===================================================== */
  function createUploadItem(
    file,
    previewImages = false,
    state = "default",
    errorMessage = null,
  ) {
    const item = document.createElement("div");
    item.className = "upload__item";
    if (state === "error") item.classList.add("upload__item--error");

    const main = document.createElement("div");
    main.className = "upload__item__main";

    const thumb = document.createElement("div");

    if (!errorMessage) {
      thumb.className = "upload__thumb";

      if (previewImages && file.type.startsWith("image/")) {
        thumb.classList.add("upload__thumb--image");
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        thumb.appendChild(img);
      } else {
        const img = document.createElement("img");
        img.src = "assets/icons/upload-icon.svg";
        img.alt = "File icon";
        img.setAttribute("aria-hidden", "true");
        thumb.appendChild(img);
      }
    }

    const info = document.createElement("div");
    info.className = "upload__info";
    info.innerHTML = `
      <span class="upload__file-name">${file.name}</span>
      <span class="mx-4"> • </span>
      <span class="upload__file-size">${formatSize(file.size)}</span>
    `;

    let status;

    if (state === "uploading") {
      status = document.createElement("button");
      status.type = "button";
      status.className = "upload__upload";
    }

    if (state === "success") {
      status = document.createElement("span");
      status.className = "text-green-700 d-inline-flex";
      status.innerHTML = `
        <svg class="icon medium" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use>
        </svg>
      `;
    }

    if (state === "error") {
      status = document.createElement("span");
      status.className = "text-red-700 d-inline-flex";
      status.innerHTML = `
        <svg class="icon medium" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-circle-info-filled"></use>
        </svg>
      `;
    }

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

    if (!errorMessage) main.append(thumb);
    main.append(info);
    if (status) main.append(status);
    main.append(remove);

    item.append(main);

    if (state === "error" && errorMessage) {
      const errorSection = document.createElement("div");
      errorSection.className = "upload__item__error-section";
      const errorSpan = document.createElement("span");
      errorSpan.className = "upload__item__error-message";
      errorSpan.textContent = errorMessage;
      errorSection.appendChild(errorSpan);
      item.appendChild(errorSection);
    }

    return item;
  }

  /* =====================================================
   * Standard file input
   * ===================================================== */
  function initUpload(
    inputId,
    listId,
    multiple = false,
    previewImages = false,
  ) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;

    input.addEventListener("change", () => {
      if (!multiple) list.innerHTML = "";

      Array.from(input.files).forEach((file) => {
        const error = validateFile(file);

        if (error) {
          list.appendChild(
            createUploadItem(file, previewImages, "error", error),
          );
          return;
        }

        const uploading = createUploadItem(file, previewImages, "uploading");
        list.appendChild(uploading);

        setTimeout(() => {
          const successItem = createUploadItem(file, previewImages, "success");
          uploading.replaceWith(successItem);
        }, 1000);
      });

      input.value = "";
    });
  }

  /* =====================================================
   * Drag & Drop zone
   * ===================================================== */
  function initDropzone(
    dropzoneId,
    inputId,
    listId,
    multiple = false,
    previewImages = false,
  ) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!dropzone || !input || !list) return;

    const restoreDropzone = () =>
      dropzone.classList.remove("dropzone--uploaded");

    const handleFiles = (files) => {
      if (!multiple) {
        list.innerHTML = "";
        dropzone.classList.add("dropzone--uploaded");
      }

      Array.from(files).forEach((file) => {
        const error = validateFile(file);

        if (error) {
          list.appendChild(
            createUploadItem(file, previewImages, "error", error),
          );
          return;
        }

        const uploading = createUploadItem(file, previewImages, "uploading");
        if (!multiple) {
          uploading
            .querySelector(".upload__remove")
            ?.addEventListener("click", restoreDropzone);
        }
        list.appendChild(uploading);

        setTimeout(() => {
          const successItem = createUploadItem(file, previewImages, "success");
          if (!multiple) {
            successItem
              .querySelector(".upload__remove")
              ?.addEventListener("click", restoreDropzone);
          }
          uploading.replaceWith(successItem);
        }, 1200);
      });

      input.value = "";
    };

    dropzone.addEventListener("click", () => input.click());

    ["dragenter", "dragover"].forEach((event) => {
      dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.add("dropzone--active");
      });
    });

    ["dragleave", "drop"].forEach((event) => {
      dropzone.addEventListener(event, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dropzone--active");
      });
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    });

    input.addEventListener("change", () => {
      handleFiles(input.files);
    });
  }

  /* =====================================================
   * Prevent default browser behavior globally
   * ===================================================== */
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  /* =====================================================
   * Init all uploads
   * ===================================================== */
  initUpload("default-upload", "default-upload-list");
  initUpload("single-upload", "single-upload-list");
  initUpload("multi-upload", "multi-upload-list", true);
  initUpload("image-upload", "image-upload-list", true, true);

  initDropzone(
    "default-dropzone",
    "default-dropzone-input",
    "default-dropzone-list",
    false,
    true,
  );
  initDropzone(
    "dropzone-single",
    "dropzone-single-input",
    "dropzone-single-list",
  );
  initDropzone(
    "dropzone-multi",
    "dropzone-multi-input",
    "dropzone-multi-list",
    true,
  );
});

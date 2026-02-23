(() => {
  const headerPath = "elements/header.html";
  const placeholderId = "site-header";

  const ensurePlaceholder = () => {
    const existing = document.getElementById(placeholderId);
    if (existing) return existing;

    const placeholder = document.createElement("div");
    placeholder.id = placeholderId;
    document.body.prepend(placeholder);
    return placeholder;
  };

  const loadHeaderSync = () => {
    const container = ensurePlaceholder();
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", headerPath, false);
      xhr.send(null);

      if (xhr.status === 200 || xhr.status === 0) {
        container.innerHTML = xhr.responseText;
      } else {
        console.error("Header include failed:", xhr.status);
      }
    } catch (error) {
      console.error("Header include failed:", error);
    }
  };

  if (document.body) {
    loadHeaderSync();
  } else {
    document.addEventListener("DOMContentLoaded", loadHeaderSync);
  }
})();

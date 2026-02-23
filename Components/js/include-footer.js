(() => {
  const footerPath = "elements/footer.html";
  const placeholderId = "site-footer";

  const loadFooterSync = () => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", footerPath, false);
      xhr.send(null);

      if (xhr.status === 200 || xhr.status === 0) {
        const placeholder = document.getElementById(placeholderId);
        if (placeholder) placeholder.remove();

        // Append footer at the end of <body> to avoid being clipped by any
        // unclosed containers in page markup.
        document.body.insertAdjacentHTML("beforeend", xhr.responseText);
      } else {
        console.error("Footer include failed:", xhr.status);
      }
    } catch (error) {
      console.error("Footer include failed:", error);
    }
  };

  if (document.body) {
    loadFooterSync();
  } else {
    document.addEventListener("DOMContentLoaded", loadFooterSync);
  }
})();

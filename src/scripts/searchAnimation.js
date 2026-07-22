export function searchAnimation() {
  const searchContainer = document.querySelector("[data-search-container]");

  if (searchContainer) {
    const toggle = searchContainer.querySelector(".search-toggle");
    const input = searchContainer.querySelector(".search-input");

    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

    const openSearch = () => {
      searchContainer.classList.add("is-open");
      toggle?.setAttribute("aria-expanded", "true");
      if (!isDesktop()) {
        input?.focus();
      }
    };

    const closeSearch = () => {
      searchContainer.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    };

    toggle?.addEventListener("click", (event) => {
      event.stopPropagation();

      if (isDesktop()) {
        return;
      }

      if (searchContainer.classList.contains("is-open")) {
        closeSearch();
      } else {
        openSearch();
      }
    });

    input?.addEventListener("click", (event) => {
      if (!isDesktop()) {
        event.stopPropagation();
      }
    });

    document.addEventListener("click", (event) => {
      if (!searchContainer.contains(event.target)) {
        closeSearch();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    });

    window.addEventListener("resize", () => {
      if (isDesktop()) {
        searchContainer.classList.add("is-open");
        toggle?.setAttribute("aria-expanded", "true");
      } else {
        closeSearch();
      }
    });
  }
}

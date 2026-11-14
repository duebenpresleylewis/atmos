export function searchAnimation() {
  const searchContainer = document.querySelector("[data-search-container]");

  if (searchContainer) {
    const toggle = searchContainer.querySelector(".search-toggle"); // icon
    const input = searchContainer.querySelector(".search-input");

    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

    const openSearch = () => {
      searchContainer.classList.add("is-open");
      toggle?.setAttribute("aria-expanded", "true");
      input.style.display="inline-block";
      if (!isDesktop()) {
        input?.focus();   // on mobile, the input is focused so the keyboard appears immediately
      }
    };

    const closeSearch = () => {
      searchContainer.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    };

    let wasDesktop = isDesktop();

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

    // so that in mobiles clicking on input will not close it rather, clicking outside will
    input?.addEventListener("click", (event) => {
      if (!isDesktop()) {
        event.stopPropagation();
      }
    });

    // When it is already open:
    // tapping the button closes it again
    document.addEventListener("click", (event) => {
      if (!searchContainer.contains(event.target)) {
        closeSearch();
      }
    });

    // When it is already open:
    // tapping the button closes it again
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    });


    window.addEventListener("resize", () => {
      const desktop = isDesktop();

      if (desktop) {
        searchContainer.classList.add("is-open");
        toggle?.setAttribute("aria-expanded", "true");
      } else if (wasDesktop) {
        closeSearch();
      }

      wasDesktop = desktop;
    });
  }
}

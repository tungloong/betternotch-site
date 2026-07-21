(() => {
  const storageKey = "betternotch.language";
  const supportedLanguages = new Set(["en", "zh-Hans"]);
  const root = document.documentElement;
  const panels = document.querySelectorAll("[data-locale-panel]");
  const selects = document.querySelectorAll("[data-locale-select]");
  const legacyButtons = document.querySelectorAll("[data-locale-button]");
  const menus = document.querySelectorAll("[data-language-menu]");
  const textItems = document.querySelectorAll("[data-en][data-zh]");
  const ariaItems = document.querySelectorAll("[data-aria-en][data-aria-zh]");

  function storedLanguage() {
    try {
      const language = localStorage.getItem(storageKey);
      return supportedLanguages.has(language) ? language : "en";
    } catch {
      return "en";
    }
  }

  function rememberLanguage(language) {
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      // Local storage may be unavailable in a restricted browsing context.
    }
  }

  function setLanguage(language, shouldRemember = true) {
    if (!supportedLanguages.has(language)) language = "en";
    const isEnglish = language === "en";

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.localePanel !== language;
    });

    selects.forEach((select) => {
      select.value = language;
    });

    legacyButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.localeButton === language));
    });

    textItems.forEach((item) => {
      item.textContent = isEnglish ? item.dataset.en : item.dataset.zh;
    });

    ariaItems.forEach((item) => {
      item.setAttribute("aria-label", isEnglish ? item.dataset.ariaEn : item.dataset.ariaZh);
    });

    root.lang = language;
    document.title = isEnglish ? root.dataset.titleEn : root.dataset.titleZh;
    if (shouldRemember) rememberLanguage(language);
  }

  selects.forEach((select) => {
    select.addEventListener("change", () => setLanguage(select.value));
  });

  legacyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.localeButton);
      button.closest("[data-language-menu]")?.removeAttribute("open");
    });
  });

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menus.forEach((menu) => menu.removeAttribute("open"));
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey && supportedLanguages.has(event.newValue)) {
      setLanguage(event.newValue, false);
    }
  });

  setLanguage(storedLanguage(), false);
})();

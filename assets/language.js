(() => {
  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  const storageKey = "betternotch.language";
  const supportedLanguages = new Set(["en", "zh-Hans"]);
  const languageButtons = document.querySelectorAll("[data-locale-button]");
  const menus = document.querySelectorAll("[data-language-menu]");
  const textItems = document.querySelectorAll("[data-en][data-zh]");
  const ariaItems = document.querySelectorAll("[data-aria-en][data-aria-zh]");
  const altItems = document.querySelectorAll("[data-alt-en][data-alt-zh]");
  const sourceItems = document.querySelectorAll("[data-src-en][data-src-zh]");

  languageButtons.forEach((button) => {
    button.disabled = false;
  });

  function focusLanguageButton(menu, index) {
    const buttons = Array.from(menu.querySelectorAll("[data-locale-button]"));
    if (buttons.length === 0) return;
    buttons[(index + buttons.length) % buttons.length].focus();
  }

  menus.forEach((menu) => {
    const summary = menu.querySelector("summary");

    summary?.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      menu.setAttribute("open", "");
      focusLanguageButton(menu, event.key === "ArrowDown" ? 0 : -1);
    });

    menu.addEventListener("keydown", (event) => {
      const button = event.target.closest?.("[data-locale-button]");
      if (!button) return;
      const buttons = Array.from(menu.querySelectorAll("[data-locale-button]"));
      const index = buttons.indexOf(button);

      if (["ArrowDown", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        focusLanguageButton(menu, index + 1);
      } else if (["ArrowUp", "ArrowLeft"].includes(event.key)) {
        event.preventDefault();
        focusLanguageButton(menu, index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusLanguageButton(menu, 0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusLanguageButton(menu, -1);
      }
    });

    menu.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) {
        menu.removeAttribute("open");
      }
    });
  });

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

    languageButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.localeButton === language));
    });

    textItems.forEach((item) => {
      item.textContent = isEnglish ? item.dataset.en : item.dataset.zh;
    });

    ariaItems.forEach((item) => {
      item.setAttribute("aria-label", isEnglish ? item.dataset.ariaEn : item.dataset.ariaZh);
    });

    altItems.forEach((item) => {
      item.setAttribute("alt", isEnglish ? item.dataset.altEn : item.dataset.altZh);
    });

    sourceItems.forEach((item) => {
      const source = isEnglish ? item.dataset.srcEn : item.dataset.srcZh;
      if (item.getAttribute("src") !== source) item.setAttribute("src", source);
    });

    root.lang = language;
    document.title = isEnglish ? root.dataset.titleEn : root.dataset.titleZh;
    window.dispatchEvent(new CustomEvent("betternotch:languagechange", {
      detail: { language },
    }));
    if (shouldRemember) rememberLanguage(language);
  }

  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.localeButton);
      const menu = button.closest("[data-language-menu]");
      menu?.removeAttribute("open");
      menu?.querySelector("summary")?.focus();
    });
  });

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (menu.contains(event.target)) return;
      const shouldRestoreFocus = menu.contains(document.activeElement);
      menu.removeAttribute("open");
      if (shouldRestoreFocus) menu.querySelector("summary")?.focus();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menus.forEach((menu) => {
        if (!menu.hasAttribute("open")) return;
        menu.removeAttribute("open");
        if (menu.contains(document.activeElement)) {
          menu.querySelector("summary")?.focus();
        }
      });
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey && supportedLanguages.has(event.newValue)) {
      setLanguage(event.newValue, false);
    }
  });

  setLanguage(storedLanguage(), false);
})();

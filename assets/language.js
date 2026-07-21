(() => {
  const root = document.documentElement;
  const panels = document.querySelectorAll("[data-locale-panel]");
  const selects = document.querySelectorAll("[data-locale-select]");
  const textItems = document.querySelectorAll("[data-en][data-zh]");
  const ariaItems = document.querySelectorAll("[data-aria-en][data-aria-zh]");

  function setLanguage(language) {
    const isEnglish = language === "en";

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.localePanel !== language;
    });

    selects.forEach((select) => {
      select.value = language;
    });

    textItems.forEach((item) => {
      item.textContent = isEnglish ? item.dataset.en : item.dataset.zh;
    });

    ariaItems.forEach((item) => {
      item.setAttribute("aria-label", isEnglish ? item.dataset.ariaEn : item.dataset.ariaZh);
    });

    root.lang = language;
    document.title = isEnglish ? root.dataset.titleEn : root.dataset.titleZh;
  }

  selects.forEach((select) => {
    select.addEventListener("change", () => setLanguage(select.value));
  });

  setLanguage("en");
})();

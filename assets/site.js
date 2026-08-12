(() => {
  const body = document.body;
  const effectButtons = Array.from(document.querySelectorAll("[data-effect-button]"));
  const backdropButtons = Array.from(document.querySelectorAll("[data-backdrop-button]"));
  const cycleButton = document.querySelector("[data-effect-cycle]");
  const effectTitle = document.querySelector("[data-effect-title]");
  const effectSummary = document.querySelector("[data-effect-summary]");
  const effectIndex = document.querySelector("[data-effect-index]");
  const notchLabel = document.querySelector("[data-notch-label]");
  const effectStage = document.querySelector("#effect-stage");

  if (!body || effectButtons.length === 0) return;

  if (cycleButton) cycleButton.disabled = false;
  backdropButtons.forEach((button) => {
    button.disabled = false;
  });
  effectButtons.forEach((button) => {
    button.disabled = false;
  });
  effectStage?.setAttribute("role", "tabpanel");

  const effects = [
    {
      id: "original",
      en: {
        title: "Original",
        summary: "Keep the system’s original menu bar appearance, with no BetterNotch effect applied.",
      },
      zh: {
        title: "原始",
        summary: "保留系统原本的菜单栏外观，不为这块显示器应用 BetterNotch 效果。",
      },
    },
    {
      id: "gradient",
      en: {
        title: "Gradient",
        summary: "The physical notch dissolves naturally into both sides of the menu bar.",
      },
      zh: {
        title: "渐变",
        summary: "让物理刘海自然融入菜单栏两侧。",
      },
    },
    {
      id: "liquid-glass",
      en: {
        title: "Liquid Glass",
        summary: "Highlights and ink shape a layered, glass-like finish around the menu bar.",
      },
      zh: {
        title: "液态玻璃",
        summary: "用高光与墨迹在菜单栏周围勾勒出富有层次的玻璃质感。",
      },
    },
    {
      id: "solid-black",
      en: {
        title: "Solid Black",
        summary: "Unify the entire menu bar in a clean, consistent black.",
      },
      zh: {
        title: "纯黑",
        summary: "用干净、统一的纯黑覆盖整条菜单栏。",
      },
    },
  ];

  function localeKey() {
    return document.documentElement.lang === "zh-Hans" ? "zh" : "en";
  }

  function currentEffectIndex() {
    const index = effects.findIndex((effect) => effect.id === body.dataset.effect);
    return index >= 0 ? index : 1;
  }

  function updateReadout() {
    const index = currentEffectIndex();
    const effect = effects[index];
    const locale = localeKey();
    const nextEffect = effects[(index + 1) % effects.length];

    if (effectTitle) effectTitle.textContent = effect[locale].title;
    if (effectSummary) effectSummary.textContent = effect[locale].summary;
    if (effectIndex) effectIndex.textContent = `${String(index + 1).padStart(2, "0")} / 04`;

    const stageLabel = locale === "zh"
      ? `${effect.zh.title}效果演示：${effect.zh.summary}`
      : `${effect.en.title} effect study: ${effect.en.summary}`;
    effectStage?.setAttribute("aria-label", stageLabel);

    if (notchLabel) {
      notchLabel.textContent = locale === "zh"
        ? `当前样式：${effect.zh.title}。点击切换到${nextEffect.zh.title}。`
        : `Current style: ${effect.en.title}. Activate to switch to ${nextEffect.en.title}.`;
    }
  }

  function setEffect(effectId, { focus = false } = {}) {
    const effect = effects.find((item) => item.id === effectId) ?? effects[1];
    body.dataset.effect = effect.id;

    effectButtons.forEach((button) => {
      const isSelected = button.dataset.effectButton === effect.id;
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      if (isSelected) {
        effectStage?.setAttribute("aria-labelledby", button.id);
        if (focus) button.focus();
      }
    });

    updateReadout();
  }

  function moveEffect(offset, shouldFocus = false) {
    const index = currentEffectIndex();
    const nextIndex = (index + offset + effects.length) % effects.length;
    setEffect(effects[nextIndex].id, { focus: shouldFocus });
  }

  effectButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setEffect(button.dataset.effectButton);
    });

    button.addEventListener("keydown", (event) => {
      if (["ArrowRight", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        moveEffect(1, true);
      } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        moveEffect(-1, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        setEffect(effects[0].id, { focus: true });
      } else if (event.key === "End") {
        event.preventDefault();
        setEffect(effects.at(-1).id, { focus: true });
      }
    });
  });

  cycleButton?.addEventListener("click", () => moveEffect(1));

  backdropButtons.forEach((button) => {
    button.addEventListener("click", () => {
      body.dataset.backdrop = button.dataset.backdropButton;
      backdropButtons.forEach((item) => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    });
  });

  window.addEventListener("betternotch:languagechange", updateReadout);
  setEffect(body.dataset.effect || "gradient");
})();

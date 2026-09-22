(() => {
  const notchRoot = document.querySelector("[data-page-notch]");
  const promoScenes = Array.from(document.querySelectorAll("[data-promo-scene]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let notchFrame = 0;

  function setSceneScales() {
    promoScenes.forEach((scene) => {
      scene.style.setProperty("--scene-scale", String(scene.clientWidth / 2880));
    });
  }

  function setNotchProgress() {
    if (notchRoot) {
      const scrolling = document.scrollingElement || document.documentElement;
      const max = Math.max(0, scrolling.scrollHeight - scrolling.clientHeight);
      const p = max <= 0 ? 0 : Math.min(1, Math.max(0, scrolling.scrollTop / max));
      notchRoot.style.setProperty("--notch-p", String(p));
    }
  }

  function requestNotchProgress() {
    if (!notchRoot) return;
    if (notchFrame) return;
    notchFrame = window.requestAnimationFrame(() => {
      notchFrame = 0;
      setNotchProgress();
    });
  }

  if (notchRoot) {
    setNotchProgress();
    window.addEventListener("scroll", requestNotchProgress, { passive: true });
    window.addEventListener("resize", requestNotchProgress);
    window.addEventListener("pageshow", setNotchProgress);
    window.addEventListener("load", requestNotchProgress);
    window.addEventListener("betternotch:languagechange", requestNotchProgress);
    document.querySelectorAll("img").forEach((image) => {
      if (!image.complete) image.addEventListener("load", requestNotchProgress, { once: true });
    });
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(requestNotchProgress);
      observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
    }
    reduceMotion.addEventListener?.("change", setNotchProgress);
  }

  setSceneScales();
  window.addEventListener("resize", setSceneScales);
  if (typeof ResizeObserver === "function") {
    const sceneObserver = new ResizeObserver(setSceneScales);
    promoScenes.forEach((scene) => sceneObserver.observe(scene));
  }

  const dialog = document.querySelector("[data-zoom-dialog]");
  const zoomImage = dialog?.querySelector("[data-zoom-image]");
  const zoomScroller = dialog?.querySelector(".zoom-dialog__scroller");
  if (!dialog || !zoomImage || typeof dialog.showModal !== "function") return;
  let zoomTrigger = null;

  function localeIsEnglish() {
    return document.documentElement.lang !== "zh-Hans";
  }

  function fullSizeFor(link) {
    const href = link.getAttribute("href");
    const width = Number(link.dataset.fullWidth) || 1200;
    const height = localeIsEnglish()
      ? Number(link.dataset.fullHeightEn || link.dataset.fullHeight) || 630
      : Number(link.dataset.fullHeightZh || link.dataset.fullHeight) || 630;
    return { href, width, height };
  }

  function resetZoomScroller() {
    if (!zoomScroller) return;
    zoomScroller.scrollLeft = 0;
    zoomScroller.scrollTop = 0;
  }

  function openZoom(link) {
    const { href, width, height } = fullSizeFor(link);
    if (!href) return;
    const triggerImage = link.querySelector("img") || link.closest("figure")?.querySelector("img");
    zoomImage.src = href;
    zoomImage.width = width;
    zoomImage.height = height;
    zoomImage.alt = triggerImage?.getAttribute("alt") || "";
    dialog.dataset.kind = width / height > 2.2 ? "strip" : "window";
    zoomTrigger = link;
    resetZoomScroller();
    if (!dialog.open) dialog.showModal();
    resetZoomScroller();
    requestAnimationFrame(resetZoomScroller);
    if (!zoomImage.complete) {
      zoomImage.addEventListener("load", resetZoomScroller, { once: true });
    }
  }

  dialog.addEventListener("close", () => {
    const trigger = zoomTrigger;
    zoomTrigger = null;
    resetZoomScroller();
    trigger?.focus();
  });

  document.querySelectorAll("[data-fullsize]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      openZoom(link);
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
})();

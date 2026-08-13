(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const targets = [
    document.querySelector(".notch-control__wings"),
    document.querySelector(".effect-canvas__effect"),
  ].filter(Boolean);

  if (targets.length === 0 || !window.ResizeObserver) return;

  // Chromium can bend the live backdrop through an SVG filter. Safari and
  // Firefox keep the CSS material below as a deliberately graceful fallback.
  const supportsBackdropDisplacement =
    CSS.supports("backdrop-filter", 'url("#betternotch-liquid-glass-test")') ||
    CSS.supports("-webkit-backdrop-filter", 'url("#betternotch-liquid-glass-test")');
  if (!supportsBackdropDisplacement) return;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.classList.add("liquid-glass-filters");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  const defs = document.createElementNS(SVG_NS, "defs");
  svg.append(defs);
  document.body.append(svg);

  function smootherstep(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // A p=4 rounded-rectangle distance field follows the same continuous,
  // superelliptic family as Apple's corners more closely than a circular arc.
  // The displacement-map approach is informed by Shu Ding's MIT-licensed
  // reference implementation: https://github.com/shuding/liquid-glass
  function continuousRectDistance(x, y, halfWidth, halfHeight, radius) {
    const qx = Math.abs(x) - halfWidth + radius;
    const qy = Math.abs(y) - halfHeight + radius;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const superellipse = Math.pow((ox ** 4) + (oy ** 4), 0.25);
    return Math.min(Math.max(qx, qy), 0) + superellipse - radius;
  }

  function makeOpticalMaps(width, height, radius) {
    const displacement = document.createElement("canvas");
    const specular = document.createElement("canvas");
    displacement.width = specular.width = width;
    displacement.height = specular.height = height;

    const displacementContext = displacement.getContext("2d");
    const specularContext = specular.getContext("2d");
    if (!displacementContext || !specularContext) return null;

    const displacementImage = displacementContext.createImageData(width, height);
    const specularImage = specularContext.createImageData(width, height);
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const safeRadius = Math.min(Math.max(radius, 2), halfHeight);
    const bezel = Math.max(5, Math.min(14, halfHeight - 1));
    const lightX = -0.72;
    const lightY = -0.69;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const px = x + 0.5 - halfWidth;
        const py = y + 0.5 - halfHeight;
        const distance = continuousRectDistance(px, py, halfWidth, halfHeight, safeRadius);
        const depth = -distance;
        const index = (y * width + x) * 4;

        displacementImage.data[index] = 128;
        displacementImage.data[index + 1] = 128;
        displacementImage.data[index + 2] = 0;
        displacementImage.data[index + 3] = 255;

        if (depth < 0 || depth > bezel) continue;

        const dx = continuousRectDistance(px + 0.75, py, halfWidth, halfHeight, safeRadius) -
          continuousRectDistance(px - 0.75, py, halfWidth, halfHeight, safeRadius);
        const dy = continuousRectDistance(px, py + 0.75, halfWidth, halfHeight, safeRadius) -
          continuousRectDistance(px, py - 0.75, halfWidth, halfHeight, safeRadius);
        const magnitude = Math.hypot(dx, dy) || 1;
        const normalX = dx / magnitude;
        const normalY = dy / magnitude;
        const edge = smootherstep(1 - (depth / bezel));
        const bend = edge * (0.32 + (0.68 * edge));

        displacementImage.data[index] = Math.round(128 - (normalX * bend * 127));
        displacementImage.data[index + 1] = Math.round(128 - (normalY * bend * 127));

        const directional = Math.max(0, (normalX * lightX) + (normalY * lightY));
        const glint = Math.min(1, edge * (0.12 + (directional * 0.88)));
        specularImage.data[index] = 255;
        specularImage.data[index + 1] = 255;
        specularImage.data[index + 2] = 255;
        specularImage.data[index + 3] = Math.round(glint * 255);
      }
    }

    displacementContext.putImageData(displacementImage, 0, 0);
    specularContext.putImageData(specularImage, 0, 0);
    return {
      displacement: displacement.toDataURL("image/png"),
      specular: specular.toDataURL("image/png"),
    };
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function makeFilter(index) {
    const id = `betternotch-liquid-glass-${index}`;
    const filter = svgElement("filter", {
      id,
      colorInterpolationFilters: "sRGB",
      filterUnits: "userSpaceOnUse",
      primitiveUnits: "userSpaceOnUse",
    });
    const map = svgElement("feImage", { result: "displacementMap", preserveAspectRatio: "none" });
    const bend = svgElement("feDisplacementMap", {
      in: "SourceGraphic",
      in2: "displacementMap",
      scale: 9,
      xChannelSelector: "R",
      yChannelSelector: "G",
      result: "bentBackdrop",
    });
    const soften = svgElement("feGaussianBlur", {
      in: "bentBackdrop",
      stdDeviation: 0.12,
      result: "softBackdrop",
    });
    const saturate = svgElement("feColorMatrix", {
      in: "softBackdrop",
      type: "saturate",
      values: 1.1,
      result: "refractedBackdrop",
    });
    const specularMap = svgElement("feImage", { result: "specularMap", preserveAspectRatio: "none" });
    const specularColor = svgElement("feFlood", {
      floodColor: "#ffffff",
      floodOpacity: 0.3,
      result: "specularColor",
    });
    const specular = svgElement("feComposite", {
      in: "specularColor",
      in2: "specularMap",
      operator: "in",
      result: "specularEdge",
    });
    const blend = svgElement("feBlend", {
      in: "refractedBackdrop",
      in2: "specularEdge",
      mode: "screen",
    });
    filter.append(map, bend, soften, saturate, specularMap, specularColor, specular, blend);
    defs.append(filter);
    return { id, filter, map, specularMap };
  }

  const records = targets.map((target, index) => ({ target, ...makeFilter(index) }));

  function render(record) {
    const rect = record.target.getBoundingClientRect();
    const width = Math.max(2, Math.round(rect.width));
    const height = Math.max(2, Math.round(rect.height));
    if (record.width === width && record.height === height) return;

    record.width = width;
    record.height = height;
    const radiusValue = getComputedStyle(record.target).getPropertyValue("--liquid-glass-radius");
    const radius = Number.parseFloat(radiusValue) || Math.min(18, height / 2);
    const maps = makeOpticalMaps(width, height, radius);
    if (!maps) return;

    record.filter.setAttribute("x", "-16");
    record.filter.setAttribute("y", "-16");
    record.filter.setAttribute("width", String(width + 32));
    record.filter.setAttribute("height", String(height + 32));
    for (const image of [record.map, record.specularMap]) {
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      image.setAttribute("width", String(width));
      image.setAttribute("height", String(height));
    }
    record.map.setAttribute("href", maps.displacement);
    record.specularMap.setAttribute("href", maps.specular);
    record.target.style.setProperty("--liquid-glass-filter", `url(#${record.id})`);
  }

  let frame = 0;
  const renderAll = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => records.forEach(render));
  };
  const observer = new ResizeObserver(renderAll);
  records.forEach(({ target }) => observer.observe(target));
  document.documentElement.classList.add("supports-liquid-refraction");
  renderAll();
})();

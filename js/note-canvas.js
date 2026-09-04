// Notiz-Canvas: Freihand + Text auf derselben zoombaren Fläche (OneNote-artig,
// aber selbstgebaut — kein Bild-Einfügen, keine Handschrifterkennung, keine
// echte Unendlich-Seite, sondern eine grosse feste Fläche von 4000x3000 Logik-Pixeln).

function createNoteCanvas(container, note, onChange) {
  const PAGE_W = 4000, PAGE_H = 3000;

  container.innerHTML = `
    <div class="nc-toolbar">
      <div class="nc-tools">
        <button class="nc-tool active" data-tool="pen" title="Stift">✏️</button>
        <button class="nc-tool" data-tool="text" title="Textfeld einfügen">🅣</button>
        <button class="nc-tool" data-tool="pan" title="Verschieben">✋</button>
      </div>
      <input type="color" id="ncColor" value="#1c1e21" title="Farbe">
      <input type="range" id="ncWidth" min="1" max="30" value="3" title="Durchmesser">
      <span id="ncWidthLabel">3 px</span>
      <button class="btn btn-secondary" id="ncUndo">Rückgängig</button>
      <button class="btn btn-danger" id="ncClear">Leeren</button>
      <span class="nc-zoom">
        <button id="ncZoomOut" title="Verkleinern">−</button>
        <span id="ncZoomLabel">100%</span>
        <button id="ncZoomIn" title="Vergrössern">+</button>
        <button id="ncZoomReset" title="Zurücksetzen">100%</button>
      </span>
    </div>
    <div class="nc-viewport" id="ncViewport">
      <div class="nc-content" id="ncContent" style="width:${PAGE_W}px;height:${PAGE_H}px;">
        <canvas id="ncCanvas" width="${PAGE_W}" height="${PAGE_H}"></canvas>
        <div id="ncTextLayer"></div>
      </div>
    </div>
  `;

  const viewport = container.querySelector("#ncViewport");
  const content = container.querySelector("#ncContent");
  const canvas = container.querySelector("#ncCanvas");
  const ctx = canvas.getContext("2d");
  const textLayer = container.querySelector("#ncTextLayer");
  const colorInput = container.querySelector("#ncColor");
  const widthInput = container.querySelector("#ncWidth");
  const widthLabel = container.querySelector("#ncWidthLabel");
  const zoomLabel = container.querySelector("#ncZoomLabel");

  let elements = JSON.parse(JSON.stringify(note.elements || []));
  let tool = "pen";
  let zoom = 1, panX = 40, panY = 40;
  let currentStroke = null;
  let drawing = false;
  let isPanning = false;
  let panStart = null;
  const activePointers = new Map();
  let pinchStartDist = null, pinchStartZoom = 1;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function applyTransform() {
    content.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    zoomLabel.textContent = Math.round(zoom * 100) + "%";
  }

  function toLogical(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / zoom,
      y: (clientY - rect.top - panY) / zoom
    };
  }

  function emitChange() {
    onChange(elements);
  }

  function redraw() {
    ctx.clearRect(0, 0, PAGE_W, PAGE_H);
    for (const el of elements) {
      if (el.kind === "stroke") drawStroke(el);
    }
    if (currentStroke) drawStroke(currentStroke);
  }

  function drawStroke(stroke) {
    if (stroke.points.length === 0) return;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.fillStyle = stroke.color;
      ctx.arc(p.x, p.y, (stroke.baseWidth * (0.3 + p.pressure)) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    for (let i = 1; i < stroke.points.length; i++) {
      const p0 = stroke.points[i - 1], p1 = stroke.points[i];
      ctx.lineWidth = stroke.baseWidth * (0.3 + p1.pressure);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }

  // ---------- Textfelder ----------
  function renderTextLayer() {
    textLayer.innerHTML = "";
    for (const el of elements) {
      if (el.kind !== "text") continue;
      const box = document.createElement("div");
      box.className = "nc-textbox";
      box.style.left = el.x + "px";
      box.style.top = el.y + "px";
      box.style.width = (el.width || 220) + "px";
      box.innerHTML = `
        <div class="nc-textbox-handle" title="Verschieben">⠿</div>
        <button class="nc-textbox-delete" title="Löschen">✕</button>
        <div class="nc-textbox-content" contenteditable="true">${el.text ? escapeHtml(el.text) : ""}</div>
      `;
      const contentEl = box.querySelector(".nc-textbox-content");
      contentEl.addEventListener("input", () => {
        el.text = contentEl.innerText;
        emitChange();
      });
      contentEl.addEventListener("pointerdown", (e) => e.stopPropagation());

      box.querySelector(".nc-textbox-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        elements = elements.filter((x) => x.id !== el.id);
        renderTextLayer();
        emitChange();
      });

      const handle = box.querySelector(".nc-textbox-handle");
      handle.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        handle.setPointerCapture(e.pointerId);
        const startLogical = toLogical(e.clientX, e.clientY);
        const originX = el.x, originY = el.y;
        function onMove(ev) {
          const cur = toLogical(ev.clientX, ev.clientY);
          el.x = originX + (cur.x - startLogical.x);
          el.y = originY + (cur.y - startLogical.y);
          box.style.left = el.x + "px";
          box.style.top = el.y + "px";
        }
        function onUp() {
          handle.removeEventListener("pointermove", onMove);
          handle.removeEventListener("pointerup", onUp);
          emitChange();
        }
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
      });

      textLayer.appendChild(box);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function addTextBoxAt(x, y) {
    const el = { id: State.uid(), kind: "text", x, y, width: 220, text: "" };
    elements.push(el);
    renderTextLayer();
    emitChange();
    // sofort in den Edit-Modus fokussieren
    requestAnimationFrame(() => {
      const boxes = textLayer.querySelectorAll(".nc-textbox-content");
      const last = boxes[boxes.length - 1];
      if (last) last.focus();
    });
  }

  // ---------- Werkzeuge ----------
  container.querySelectorAll(".nc-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".nc-tool").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      tool = btn.dataset.tool;
      viewport.style.cursor = tool === "pan" ? "grab" : tool === "text" ? "text" : "crosshair";
    });
  });

  widthInput.addEventListener("input", () => { widthLabel.textContent = `${widthInput.value} px`; });

  container.querySelector("#ncUndo").addEventListener("click", () => {
    elements.pop();
    redraw(); renderTextLayer(); emitChange();
  });
  container.querySelector("#ncClear").addEventListener("click", () => {
    if (!confirm("Wirklich die ganze Notiz-Fläche leeren?")) return;
    elements = [];
    redraw(); renderTextLayer(); emitChange();
  });

  container.querySelector("#ncZoomIn").addEventListener("click", () => { zoom = clamp(zoom * 1.2, 0.2, 3); applyTransform(); });
  container.querySelector("#ncZoomOut").addEventListener("click", () => { zoom = clamp(zoom / 1.2, 0.2, 3); applyTransform(); });
  container.querySelector("#ncZoomReset").addEventListener("click", () => { zoom = 1; panX = 40; panY = 40; applyTransform(); });

  // ---------- Maus-Scroll-Zoom (cursorzentriert) ----------
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const logicalX = (cx - panX) / zoom, logicalY = (cy - panY) / zoom;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoom = clamp(zoom * factor, 0.2, 3);
    panX = cx - logicalX * zoom;
    panY = cy - logicalY * zoom;
    applyTransform();
  }, { passive: false });

  // ---------- Pointer-Events: Zeichnen / Verschieben / Text platzieren / Pinch-Zoom ----------
  viewport.addEventListener("pointerdown", (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewport.setPointerCapture(e.pointerId);

    if (activePointers.size === 2) {
      drawing = false; isPanning = false;
      const pts = [...activePointers.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoom = zoom;
      return;
    }
    if (activePointers.size > 2) return;

    if (e.target.closest(".nc-textbox")) return; // Textfeld übernimmt selbst

    if (tool === "pen") {
      drawing = true;
      const p = toLogical(e.clientX, e.clientY);
      currentStroke = { kind: "stroke", id: State.uid(), color: colorInput.value, baseWidth: Number(widthInput.value), points: [{ x: p.x, y: p.y, pressure: e.pressure > 0 ? e.pressure : 0.5 }] };
      redraw();
    } else if (tool === "pan") {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, panX, panY };
      viewport.style.cursor = "grabbing";
    } else if (tool === "text") {
      const p = toLogical(e.clientX, e.clientY);
      addTextBoxAt(p.x, p.y);
    }
  });

  viewport.addEventListener("pointermove", (e) => {
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2 && pinchStartDist) {
      const pts = [...activePointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2, midY = (pts[0].y + pts[1].y) / 2;
      const rect = viewport.getBoundingClientRect();
      const cx = midX - rect.left, cy = midY - rect.top;
      const logicalX = (cx - panX) / zoom, logicalY = (cy - panY) / zoom;
      zoom = clamp(pinchStartZoom * (dist / pinchStartDist), 0.2, 3);
      panX = cx - logicalX * zoom;
      panY = cy - logicalY * zoom;
      applyTransform();
      return;
    }

    if (drawing && currentStroke) {
      const p = toLogical(e.clientX, e.clientY);
      currentStroke.points.push({ x: p.x, y: p.y, pressure: e.pressure > 0 ? e.pressure : 0.5 });
      redraw();
    } else if (isPanning && panStart) {
      panX = panStart.panX + (e.clientX - panStart.x);
      panY = panStart.panY + (e.clientY - panStart.y);
      applyTransform();
    }
  });

  function endInteraction(e) {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchStartDist = null;

    if (drawing && currentStroke) {
      if (currentStroke.points.length > 0) elements.push(currentStroke);
      currentStroke = null;
      drawing = false;
      redraw();
      emitChange();
    }
    if (isPanning) {
      isPanning = false;
      viewport.style.cursor = tool === "pan" ? "grab" : "crosshair";
    }
  }
  viewport.addEventListener("pointerup", endInteraction);
  viewport.addEventListener("pointercancel", endInteraction);
  viewport.addEventListener("pointerleave", (e) => { if (drawing || isPanning) endInteraction(e); });

  applyTransform();
  redraw();
  renderTextLayer();
}

import {
  DEFAULT_STATE,
  loadState,
  saveState,
  getFreshDemoState,
} from "./store.js";
import {
  formatPeso,
  computeRoomTotals,
  parseMoveInDayNumber,
  formatPeriodRange,
  formatFullMonthDay,
  formatIsoToOrdinalDay,
  parseDisplayDateToIso,
  parseRangeToIso,
  computeCalendarSpanDays,
  getNextMonthFirstIso,
} from "./compute.js";
import {
  buildRoomPillsHtml,
  buildActiveRoomFormHtml,
  buildAllA4SheetsHtml,
  buildBulkTableRowsHtml,
} from "./templates.js";

let state = loadState();
let toastTimeout = null;
let datePickerContext = null;
let remDaysFormulaMode = "span"; // 'span' | 'divisor'
let kwhRoomIndex = null;

// ============================================================================
// RENDERING ORCHESTRATION
// ============================================================================
export function renderAll() {
  saveState(state);
  renderRoomSelectorPills();
  renderActiveRoomForm();
  renderGlobalSettingsInputs();
  renderA4Sheets();
  updateBadges();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateBadges() {
  const count = state.rooms.length;
  const sheetCount = Math.ceil(count / 2);
  const badgeEl = document.getElementById("room-count-badge");
  const counterEl = document.getElementById("page-counter-text");
  if (badgeEl) badgeEl.textContent = count;
  if (counterEl) {
    counterEl.textContent = `${sheetCount} A4 Landscape ${sheetCount === 1 ? "Sheet" : "Sheets"} (${count} ${count === 1 ? "Room" : "Rooms"})`;
  }
}

function renderRoomSelectorPills() {
  const el = document.getElementById("room-selector-pills");
  if (el) el.innerHTML = buildRoomPillsHtml(state);
}

function renderActiveRoomForm() {
  const el = document.getElementById("active-room-form-container");
  if (el) el.innerHTML = buildActiveRoomFormHtml(state);
}

function renderGlobalSettingsInputs() {
  const g = state.globalSettings || DEFAULT_STATE.globalSettings;
  const titleEl = document.getElementById("global-title");
  if (!titleEl) return;
  titleEl.value = g.title;
  document.getElementById("global-show-notice").checked = g.showNotice;
  document.getElementById("global-print-cutline").checked = g.printCutLine;

  const kwhRateEl = document.getElementById("batch-kwh-rate");
  if (kwhRateEl && g.defaultKwhRate !== undefined) {
    kwhRateEl.value = g.defaultKwhRate;
  }

  // Populate rich text editors without resetting cursor focus if user is actively typing
  const noticeEditor = document.getElementById("global-notice-editor");
  const footerEditor = document.getElementById("global-footer-editor");
  const signoffEditor = document.getElementById("global-signoff-editor");

  if (noticeEditor && document.activeElement !== noticeEditor) {
    noticeEditor.innerHTML = sanitizeRichText(g.noticeHtml || "");
  }
  if (footerEditor && document.activeElement !== footerEditor) {
    footerEditor.innerHTML = sanitizeRichText(g.footerNote || "");
  }
  if (signoffEditor && document.activeElement !== signoffEditor) {
    signoffEditor.innerHTML = sanitizeRichText(g.signOff || "");
  }
}

function renderA4Sheets() {
  const el = document.getElementById("a4-sheets-container");
  if (el) el.innerHTML = buildAllA4SheetsHtml(state);
}

// ============================================================================
// ELECTRICITY SUBMETER (kWh) CALCULATOR MODAL LOGIC
// ============================================================================
export function openKwhModal(roomIdx = state.activeRoomIndex) {
  kwhRoomIndex = roomIdx;
  const rm = state.rooms[roomIdx];
  if (!rm) return;

  const modal = document.getElementById("kwh-calc-modal");
  const titleEl = document.getElementById("kwh-modal-title");
  const prevInput = document.getElementById("kwh-prev-input");
  const currInput = document.getElementById("kwh-curr-input");
  const rateInput = document.getElementById("kwh-rate-input");
  const saveGlobalCheck = document.getElementById("kwh-save-global-rate");

  titleEl.textContent = `Submeter Calculator — Room ${rm.roomNo}`;

  const defaultRate =
    Number(rm.elecRatePerKwh) ||
    Number(state.globalSettings.defaultKwhRate) ||
    16;
  const prevVal = Number(rm.elecPrevReading) || 0;
  let currVal = Number(rm.elecCurrReading);

  // If current reading hasn't been set or doesn't match current electricity bill, infer a sensible default
  if (isNaN(currVal) || currVal < prevVal) {
    const inferredKwh =
      defaultRate > 0
        ? Math.round(((Number(rm.electricity) || 0) / defaultRate) * 100) / 100
        : 0;
    currVal = prevVal + inferredKwh;
  }

  prevInput.value = prevVal;
  currInput.value = currVal;
  rateInput.value = defaultRate;
  if (saveGlobalCheck) saveGlobalCheck.checked = false;

  updateKwhPreview();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (window.lucide) window.lucide.createIcons();
}

export function updateKwhPreview() {
  const prev = Number(document.getElementById("kwh-prev-input").value) || 0;
  const curr = Number(document.getElementById("kwh-curr-input").value) || 0;
  const rate = Number(document.getElementById("kwh-rate-input").value) || 0;

  const warningEl = document.getElementById("kwh-warning-msg");
  const usedBadge = document.getElementById("kwh-used-badge");
  const breakdownEl = document.getElementById("kwh-formula-breakdown");
  const totalPreviewEl = document.getElementById("kwh-total-preview");

  if (curr < prev) {
    warningEl.classList.remove("hidden");
  } else {
    warningEl.classList.add("hidden");
  }

  const kwhUsed = Math.max(
    0,
    Math.round((curr - prev + Number.EPSILON) * 100) / 100,
  );
  const computedPeso =
    Math.round((kwhUsed * rate + Number.EPSILON) * 100) / 100;

  usedBadge.textContent = `${kwhUsed} kWh`;
  breakdownEl.textContent = `(${curr} - ${prev}) × ${formatPeso(rate)} / kWh`;
  totalPreviewEl.textContent = formatPeso(computedPeso);
}

export function applyKwhCalculation() {
  if (kwhRoomIndex === null) return;
  const rm = state.rooms[kwhRoomIndex];
  if (!rm) return;

  const prev = Number(document.getElementById("kwh-prev-input").value) || 0;
  const curr = Number(document.getElementById("kwh-curr-input").value) || 0;
  const rate = Number(document.getElementById("kwh-rate-input").value) || 0;
  const saveGlobalCheck = document.getElementById("kwh-save-global-rate");

  const kwhUsed = Math.max(
    0,
    Math.round((curr - prev + Number.EPSILON) * 100) / 100,
  );
  const computedPeso =
    Math.round((kwhUsed * rate + Number.EPSILON) * 100) / 100;

  rm.elecPrevReading = prev;
  rm.elecCurrReading = curr;
  rm.elecRatePerKwh = rate;
  rm.electricity = computedPeso;

  if (saveGlobalCheck && saveGlobalCheck.checked && rate > 0) {
    state.globalSettings.defaultKwhRate = rate;
    state.rooms.forEach((r) => {
      r.elecRatePerKwh = rate;
    });
  }

  state.activeRoomIndex = kwhRoomIndex;
  renderAll();

  const bulkModal = document.getElementById("bulk-modal");
  if (bulkModal && !bulkModal.classList.contains("hidden")) {
    renderBulkTable();
  }

  showToast(
    `Room ${rm.roomNo} Electricity set to ${formatPeso(computedPeso)} (${kwhUsed} kWh)`,
  );
  closeKwhModal();
}

export function closeKwhModal() {
  const modal = document.getElementById("kwh-calc-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  kwhRoomIndex = null;
}

// ============================================================================
// DATE PICKER MODAL & AUTO-SYNC LOGIC
// ============================================================================
export function openDatePickerModal(config) {
  datePickerContext = config;
  const modal = document.getElementById("date-picker-modal");
  const titleEl = document.getElementById("dp-modal-title");
  const singleContainer = document.getElementById("dp-single-container");
  const rangeContainer = document.getElementById("dp-range-container");
  const moveInAutoWrap = document.getElementById("dp-movein-autocalc-wrap");
  const rentPeriodSyncWrap = document.getElementById(
    "dp-rent-period-sync-wrap",
  );
  const singleInput = document.getElementById("dp-single-input");
  const startInput = document.getElementById("dp-start-input");
  const endInput = document.getElementById("dp-end-input");

  titleEl.textContent = config.label || "Select Date";

  let currentVal = "";
  const rm =
    config.targetType === "room" ? state.rooms[config.roomIndex] : null;

  if (config.targetType === "room" && rm) {
    currentVal = rm[config.field];
  } else if (config.targetType === "batchInput") {
    const inputEl = document.getElementById(config.inputId);
    currentVal = inputEl ? inputEl.value : "";
  }

  if (config.mode === "range") {
    singleContainer.classList.add("hidden");
    rangeContainer.classList.remove("hidden");
    const { startIso, endIso } = parseRangeToIso(currentVal);
    startInput.value = startIso;
    endInput.value = endIso;

    if (config.targetType === "room" && config.field === "rentPeriod") {
      rentPeriodSyncWrap.classList.remove("hidden");
    } else {
      rentPeriodSyncWrap.classList.add("hidden");
    }
  } else {
    rangeContainer.classList.add("hidden");
    singleContainer.classList.remove("hidden");

    if (config.mode === "ordinalDay" && rm && rm.rentPeriod) {
      const { startIso } = parseRangeToIso(rm.rentPeriod);
      const dayNum = parseMoveInDayNumber(currentVal);
      if (startIso && dayNum) {
        const [y, m] = startIso.split("-");
        singleInput.value = `${y}-${m}-${String(dayNum).padStart(2, "0")}`;
      } else {
        singleInput.value = parseDisplayDateToIso(currentVal);
      }
      moveInAutoWrap.classList.remove("hidden");
    } else {
      singleInput.value = parseDisplayDateToIso(currentVal);
      moveInAutoWrap.classList.add("hidden");
    }
  }

  updateDatePickerPreview();
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (window.lucide) window.lucide.createIcons();
}

export function onRangeStartInputChanged() {
  const startInput = document.getElementById("dp-start-input");
  const endInput = document.getElementById("dp-end-input");
  if (
    datePickerContext &&
    datePickerContext.field === "rentPeriod" &&
    startInput.value
  ) {
    const suggestedEnd = getNextMonthFirstIso(startInput.value);
    if (!endInput.value || endInput.value <= startInput.value) {
      endInput.value = suggestedEnd;
    }
  }
  updateDatePickerPreview();
}

export function setRemDaysFormulaMode(mode) {
  remDaysFormulaMode = mode;
  updateFormulaModeButtons();
  updateDatePickerPreview();
}

function updateFormulaModeButtons() {
  const spanBtn = document.getElementById("btn-calc-span");
  const divBtn = document.getElementById("btn-calc-divisor");
  if (!spanBtn || !divBtn) return;

  if (remDaysFormulaMode === "span") {
    spanBtn.className =
      "px-2 py-1 rounded font-semibold bg-indigo-600 text-white transition";
    divBtn.className =
      "px-2 py-1 rounded font-semibold bg-white text-slate-700 border border-slate-300 transition";
  } else {
    divBtn.className =
      "px-2 py-1 rounded font-semibold bg-indigo-600 text-white transition";
    spanBtn.className =
      "px-2 py-1 rounded font-semibold bg-white text-slate-700 border border-slate-300 transition";
  }
}

export function updateDatePickerPreview() {
  if (!datePickerContext) return;
  const previewInput = document.getElementById("dp-formatted-preview");
  const rm =
    datePickerContext.targetType === "room"
      ? state.rooms[datePickerContext.roomIndex]
      : state.rooms[state.activeRoomIndex];
  const divisor = rm ? Number(rm.divisorDays) || 30 : 30;

  if (datePickerContext.mode === "range") {
    const startIso = document.getElementById("dp-start-input").value;
    const endIso = document.getElementById("dp-end-input").value;
    previewInput.value = formatPeriodRange(startIso, endIso);

    if (datePickerContext.field === "rentPeriod" && startIso) {
      const moveInOrdinal = formatIsoToOrdinalDay(startIso);
      const moveInDayNum = parseMoveInDayNumber(moveInOrdinal) || 1;

      const spanDays =
        computeCalendarSpanDays(startIso, endIso) ||
        Math.max(1, divisor - moveInDayNum + 1);
      const divisorFormulaDays = Math.max(1, divisor - moveInDayNum + 1);

      const moveInPreviewEl = document.getElementById("dp-sync-movein-preview");
      const remInputEl = document.getElementById("dp-sync-remdays-input");
      const spanValEl = document.getElementById("dp-span-val");
      const divValEl = document.getElementById("dp-divisor-val");

      if (moveInPreviewEl) moveInPreviewEl.textContent = moveInOrdinal;
      if (spanValEl) spanValEl.textContent = spanDays;
      if (divValEl) divValEl.textContent = divisorFormulaDays;

      updateFormulaModeButtons();
      if (remInputEl) {
        remInputEl.value =
          remDaysFormulaMode === "span" ? spanDays : divisorFormulaDays;
      }
    }
  } else if (datePickerContext.mode === "ordinalDay") {
    const singleIso = document.getElementById("dp-single-input").value;
    const formattedOrdinal = formatIsoToOrdinalDay(singleIso);
    previewInput.value = formattedOrdinal;

    const dayNum = parseMoveInDayNumber(formattedOrdinal) || 1;
    const nextFirstIso = getNextMonthFirstIso(singleIso);
    const suggestedPeriod = formatPeriodRange(singleIso, nextFirstIso);
    const spanDays =
      computeCalendarSpanDays(singleIso, nextFirstIso) ||
      Math.max(1, divisor - dayNum + 1);

    const remPreviewEl = document.getElementById("dp-rem-days-preview");
    const periodPreviewEl = document.getElementById("dp-movein-period-preview");

    if (remPreviewEl) {
      remPreviewEl.textContent = `${spanDays} days`;
    }
    if (periodPreviewEl && suggestedPeriod) {
      periodPreviewEl.textContent = suggestedPeriod;
    }
  } else if (datePickerContext.mode === "fullDate") {
    const singleIso = document.getElementById("dp-single-input").value;
    previewInput.value = formatFullMonthDay(singleIso);
  }
}

export function applyDatePickerSelection() {
  if (!datePickerContext) return;
  const finalValue = document
    .getElementById("dp-formatted-preview")
    .value.trim();

  if (datePickerContext.targetType === "room") {
    const rm = state.rooms[datePickerContext.roomIndex];
    if (rm && finalValue) {
      rm[datePickerContext.field] = finalValue;
      let syncMsg = `Updated ${datePickerContext.label} to "${finalValue}"`;

      if (datePickerContext.field === "rentPeriod") {
        const syncCheck = document.getElementById("dp-sync-rent-fields");
        if (syncCheck && syncCheck.checked) {
          const startIso = document.getElementById("dp-start-input").value;
          const syncedMoveIn = formatIsoToOrdinalDay(startIso);
          const syncedRemDays = Number(
            document.getElementById("dp-sync-remdays-input").value,
          );

          if (syncedMoveIn) rm.moveInDay = syncedMoveIn;
          if (syncedRemDays > 0) rm.remainingDays = syncedRemDays;
          syncMsg = `Synced Rent Period (${finalValue}), Move-in (${rm.moveInDay}) & Remaining Days (${rm.remainingDays})`;
        }
      }

      if (datePickerContext.mode === "ordinalDay") {
        const singleIso = document.getElementById("dp-single-input").value;
        const nextFirstIso = getNextMonthFirstIso(singleIso);
        const autoRemCheck = document.getElementById("dp-auto-rem-days");
        const syncPeriodCheck = document.getElementById(
          "dp-sync-movein-period",
        );

        if (autoRemCheck && autoRemCheck.checked) {
          const divisor = Number(rm.divisorDays) || 30;
          const dayNum = parseMoveInDayNumber(finalValue) || 1;
          const spanDays =
            computeCalendarSpanDays(singleIso, nextFirstIso) ||
            Math.max(1, divisor - dayNum + 1);
          rm.remainingDays = spanDays;
        }

        if (
          syncPeriodCheck &&
          syncPeriodCheck.checked &&
          singleIso &&
          nextFirstIso
        ) {
          rm.rentPeriod = formatPeriodRange(singleIso, nextFirstIso);
        }
        syncMsg = `Synced Move-in (${rm.moveInDay}), Period (${rm.rentPeriod}) & Rem. Days (${rm.remainingDays})`;
      }

      state.activeRoomIndex = datePickerContext.roomIndex;
      renderAll();

      const bulkModal = document.getElementById("bulk-modal");
      if (bulkModal && !bulkModal.classList.contains("hidden")) {
        renderBulkTable();
      }
      showToast(syncMsg);
    }
  } else if (datePickerContext.targetType === "batchInput") {
    const inputEl = document.getElementById(datePickerContext.inputId);
    if (inputEl && finalValue) {
      inputEl.value = finalValue;
      showToast(`Set ${datePickerContext.label} to "${finalValue}"`);
    }
  }

  closeDatePickerModal();
}

export function closeDatePickerModal() {
  const modal = document.getElementById("date-picker-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  datePickerContext = null;
}

// ============================================================================
// INTERACTION & STATE UPDATES
// ============================================================================
export function selectRoom(index) {
  state.activeRoomIndex = index;
  renderAll();
}

export function selectRoomFromPreview(index, event) {
  if (state.activeRoomIndex !== index) {
    state.activeRoomIndex = index;
    switchSidebarTab("rooms");
    renderAll();
  }
}

export function updateRoomField(field, value, fullRerender = false) {
  const rm = state.rooms[state.activeRoomIndex];
  if (!rm) return;

  if (
    [
      "tenants",
      "monthlyRent",
      "remainingDays",
      "divisorDays",
      "electricity",
      "water",
      "wifi",
    ].includes(field)
  ) {
    rm[field] = value === "" ? "" : Number(value);
  } else {
    rm[field] = value;
  }

  saveState(state);

  if (fullRerender) {
    renderAll();
  } else {
    const totals = computeRoomTotals(rm);
    const rentEl = document.getElementById("sidebar-rent-due");
    const utilEl = document.getElementById("sidebar-util-total");
    const grandEl = document.getElementById("sidebar-grand-total");
    if (rentEl) rentEl.textContent = formatPeso(totals.rentDue);
    if (utilEl) utilEl.textContent = formatPeso(totals.totalUtilities);
    if (grandEl) grandEl.textContent = formatPeso(totals.grandTotal);

    renderRoomSelectorPills();
    renderA4Sheets();
    if (window.lucide) window.lucide.createIcons();
  }
}

export function autoCalcRemainingDays() {
  const rm = state.rooms[state.activeRoomIndex];
  if (!rm) return;
  const moveDayNum = parseMoveInDayNumber(rm.moveInDay);
  const divisor = Number(rm.divisorDays) || 30;
  if (moveDayNum && moveDayNum >= 1 && moveDayNum <= divisor) {
    rm.remainingDays = divisor - moveDayNum + 1;
    renderAll();
    showToast(
      `Remaining days calculated (${divisor} - ${moveDayNum} + 1 = ${rm.remainingDays})`,
    );
  } else {
    showToast("Enter a Move-in Day number like '15th Day' first");
  }
}

export function addRoom() {
  const lastRoom =
    state.rooms[state.rooms.length - 1] || DEFAULT_STATE.rooms[0];
  const nextNum = state.rooms.length + 1;
  const newRoom = JSON.parse(JSON.stringify(lastRoom));
  newRoom.id = "room-" + Date.now();
  newRoom.roomNo = String(nextNum);
  state.rooms.push(newRoom);
  state.activeRoomIndex = state.rooms.length - 1;
  switchSidebarTab("rooms");
  renderAll();
  showToast(`Added Room ${newRoom.roomNo}`);
}

export function duplicateActiveRoom() {
  const current = state.rooms[state.activeRoomIndex];
  if (!current) return;
  const copy = JSON.parse(JSON.stringify(current));
  copy.id = "room-" + Date.now();
  copy.roomNo = String(state.rooms.length + 1);
  state.rooms.splice(state.activeRoomIndex + 1, 0, copy);
  state.activeRoomIndex += 1;
  renderAll();
  showToast(`Duplicated as Room ${copy.roomNo}`);
}

export function deleteRoom(index) {
  if (state.rooms.length <= 1) return;
  const removed = state.rooms.splice(index, 1)[0];
  if (state.activeRoomIndex >= state.rooms.length) {
    state.activeRoomIndex = state.rooms.length - 1;
  }
  renderAll();
  showToast(`Removed Room ${removed.roomNo}`);
}

// ============================================================================
// RESTRICTED RICH TEXT EDITOR (Allows Bold, Italic, Underline, Blue/Black only)
// ============================================================================
export function sanitizeRichText(dirtyHtml) {
  const temp = document.createElement("div");
  temp.innerHTML = dirtyHtml || "";

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return document.createDocumentFragment();
    }

    const tag = node.tagName.toLowerCase();
    const frag = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      frag.appendChild(cleanNode(child));
    });

    if (tag === "br") {
      return document.createElement("br");
    }

    // Convert block elements created on Enter key into line breaks
    if (tag === "div" || tag === "p") {
      const blockFrag = document.createDocumentFragment();
      if (node.previousSibling) {
        blockFrag.appendChild(document.createElement("br"));
      }
      blockFrag.appendChild(frag);
      return blockFrag;
    }

    // Wrap allowed inline style tags (strips all font-size / font-family attributes)
    let wrapper = frag;
    const style = node.getAttribute("style") || "";
    const colorAttr = node.getAttribute("color") || "";

    const isBold =
      tag === "b" ||
      tag === "strong" ||
      /font-weight\s*:\s*(bold|700|800|900)/i.test(style);
    const isItalic =
      tag === "i" || tag === "em" || /font-style\s*:\s*italic/i.test(style);
    const isUnderline =
      tag === "u" ||
      /text-decoration(-line)?\s*:\s*[^;]*underline/i.test(style);
    const isBlue =
      node.classList.contains("excel-blue") ||
      /0000ff|rgb\(\s*0\s*,\s*0\s*,\s*255\s*\)/i.test(style) ||
      /0000ff/i.test(colorAttr);

    if (isBlue) {
      const span = document.createElement("span");
      span.className = "excel-blue";
      span.appendChild(wrapper);
      wrapper = span;
    }
    if (isUnderline) {
      const u = document.createElement("u");
      u.appendChild(wrapper);
      wrapper = u;
    }
    if (isItalic) {
      const i = document.createElement("i");
      i.appendChild(wrapper);
      wrapper = i;
    }
    if (isBold) {
      const b = document.createElement("b");
      b.appendChild(wrapper);
      wrapper = b;
    }

    return wrapper;
  }

  const out = document.createElement("div");
  Array.from(temp.childNodes).forEach((child) => {
    out.appendChild(cleanNode(child));
  });
  return out.innerHTML;
}

export function updateGlobalState() {
  state.globalSettings.title = document.getElementById("global-title").value;
  state.globalSettings.showNotice =
    document.getElementById("global-show-notice").checked;
  state.globalSettings.printCutLine = document.getElementById(
    "global-print-cutline",
  ).checked;

  const kwhRateEl = document.getElementById("batch-kwh-rate");
  if (kwhRateEl) {
    state.globalSettings.defaultKwhRate = Number(kwhRateEl.value) || 16;
  }

  const noticeEditor = document.getElementById("global-notice-editor");
  const footerEditor = document.getElementById("global-footer-editor");
  const signoffEditor = document.getElementById("global-signoff-editor");

  if (noticeEditor)
    state.globalSettings.noticeHtml = sanitizeRichText(noticeEditor.innerHTML);
  if (footerEditor)
    state.globalSettings.footerNote = sanitizeRichText(footerEditor.innerHTML);
  if (signoffEditor)
    state.globalSettings.signOff = sanitizeRichText(signoffEditor.innerHTML);

  saveState(state);
  renderA4Sheets();
}

export function applyBatchToAllRooms() {
  const mode = document.getElementById("batch-rent-mode").value;
  const monthlyRent =
    Number(document.getElementById("batch-monthly-rent").value) || 5000;
  const utilPeriod = document.getElementById("batch-util-period").value;
  const wifiRate =
    Number(document.getElementById("batch-wifi-rate").value) || 0;
  const kwhRate = Number(document.getElementById("batch-kwh-rate").value) || 16;
  const nextRentDate = document.getElementById("batch-next-rent-date").value;
  const nextMeterDate = document.getElementById("batch-next-meter-date").value;

  state.globalSettings.defaultKwhRate = kwhRate;

  state.rooms.forEach((rm) => {
    rm.rentMode = mode;
    rm.monthlyRent = monthlyRent;
    rm.utilityPeriod = utilPeriod;
    rm.wifi = wifiRate;
    rm.elecRatePerKwh = kwhRate;
    rm.nextRentDate = nextRentDate;
    rm.nextMeterDate = nextMeterDate;
  });

  renderAll();
  showToast(`Applied shared settings to all ${state.rooms.length} rooms!`);
}

export function switchSidebarTab(tab) {
  const roomsBtn = document.getElementById("tab-btn-rooms");
  const globalBtn = document.getElementById("tab-btn-global");
  const roomsContent = document.getElementById("tab-content-rooms");
  const globalContent = document.getElementById("tab-content-global");

  if (tab === "rooms") {
    roomsContent.classList.remove("hidden");
    globalContent.classList.add("hidden");
    roomsBtn.className =
      "py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 bg-white text-slate-900 shadow-sm border border-slate-200/80";
    globalBtn.className =
      "py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900";
  } else {
    roomsContent.classList.add("hidden");
    globalContent.classList.remove("hidden");
    globalBtn.className =
      "py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 bg-white text-slate-900 shadow-sm border border-slate-200/80";
    roomsBtn.className =
      "py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900";
  }
}

export function resetToDemoData() {
  state = getFreshDemoState();
  saveState(state);
  renderAll();
  showToast("Reset to original Room 1 & Room 2 screenshot data");
}

export function triggerPrint() {
  window.print();
}

// ============================================================================
// MULTI-ROOM QUICK SPREADSHEET TABLE MODAL
// ============================================================================
export function openBulkTableModal() {
  renderBulkTable();
  const modal = document.getElementById("bulk-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  if (window.lucide) window.lucide.createIcons();
}

export function closeBulkTableModal() {
  const modal = document.getElementById("bulk-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  renderAll();
}

export function renderBulkTable() {
  const tbody = document.getElementById("bulk-table-body");
  tbody.innerHTML = buildBulkTableRowsHtml(state);
  if (window.lucide) window.lucide.createIcons();
}

export function updateBulkRoom(idx, field, value) {
  const rm = state.rooms[idx];
  if (!rm) return;
  if (
    [
      "tenants",
      "monthlyRent",
      "remainingDays",
      "divisorDays",
      "electricity",
      "water",
      "wifi",
    ].includes(field)
  ) {
    rm[field] = value === "" ? "" : Number(value);
  } else {
    rm[field] = value;
  }
  saveState(state);
  const totals = computeRoomTotals(rm);
  const totalCell = document.getElementById(`bulk-total-${idx}`);
  if (totalCell) totalCell.textContent = formatPeso(totals.grandTotal);
}

export function formatRichText(editorId, command) {
  const editor = document.getElementById(editorId);
  if (!editor) return;
  editor.focus();

  if (command === "bold" || command === "italic" || command === "underline") {
    document.execCommand(command, false, null);
  } else if (command === "blue") {
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("foreColor", false, "#0000FF");
  } else if (command === "black") {
    document.execCommand("styleWithCSS", false, false);
    document.execCommand("foreColor", false, "#000000");
  } else if (command === "clear") {
    document.execCommand("removeFormat", false, null);
  }

  // Clean up any browser-generated <font> tags into strict allowed tags
  updateGlobalState();
}

export function onRichEditorInput() {
  updateGlobalState();
}

export function handleRichPaste(event) {
  event.preventDefault();
  const text = (event.clipboardData || window.clipboardData).getData(
    "text/plain",
  );
  document.execCommand("insertText", false, text);
  updateGlobalState();
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toast-msg");
  if (!toast || !msg) return;
  msg.textContent = message;
  toast.classList.remove("opacity-0", "translate-y-2");
  toast.classList.add("opacity-100", "translate-y-0");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    toast.classList.remove("opacity-100", "translate-y-0");
  }, 2600);
}

// Expose handlers globally so inline onclick/oninput attributes work
Object.assign(window, {
  selectRoom,
  selectRoomFromPreview,
  updateRoomField,
  autoCalcRemainingDays,
  addRoom,
  duplicateActiveRoom,
  deleteRoom,
  updateGlobalState,
  applyBatchToAllRooms,
  switchSidebarTab,
  resetToDemoData,
  triggerPrint,
  openBulkTableModal,
  closeBulkTableModal,
  renderBulkTable,
  updateBulkRoom,
  openDatePickerModal,
  onRangeStartInputChanged,
  setRemDaysFormulaMode,
  updateDatePickerPreview,
  applyDatePickerSelection,
  closeDatePickerModal,
  openKwhModal,
  updateKwhPreview,
  applyKwhCalculation,
  closeKwhModal,
  formatRichText,
  onRichEditorInput,
  handleRichPaste,
});

// Run immediately if DOM is already parsed, otherwise wait for DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderAll);
} else {
  renderAll();
}

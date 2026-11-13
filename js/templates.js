import { formatPeso, computeRoomTotals, escapeHtml } from "./compute.js";

export function buildRoomPillsHtml(state) {
  return state.rooms
    .map((rm, idx) => {
      const isActive = idx === state.activeRoomIndex;
      return `
      <button
        onclick="selectRoom(${idx})"
        class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
          isActive
            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
        }"
      >
        <span>Room ${escapeHtml(rm.roomNo)}</span>
      </button>
    `;
    })
    .join("");
}

export function buildActiveRoomFormHtml(state) {
  const rm = state.rooms[state.activeRoomIndex];
  if (!rm) {
    return `<p class="text-xs text-slate-400">No room selected.</p>`;
  }

  const idx = state.activeRoomIndex;
  const totals = computeRoomTotals(rm);
  const hasSubmeter =
    rm.elecCurrReading !== undefined && rm.elecPrevReading !== undefined;
  const kwhUsed = hasSubmeter
    ? Math.max(0, Number(rm.elecCurrReading) - Number(rm.elecPrevReading))
    : null;

  return `
    <div class="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
          ${escapeHtml(rm.roomNo)}
        </span>
        <div>
          <h3 class="text-xs font-bold text-slate-800">Editing Room ${escapeHtml(rm.roomNo)}</h3>
          <p class="text-[11px] text-slate-500">Sheet ${Math.floor(idx / 2) + 1} (${idx % 2 === 0 ? "Left Slip" : "Right Slip"})</p>
        </div>
      </div>
      ${
        state.rooms.length > 1
          ? `
        <button onclick="deleteRoom(${idx})" class="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 transition">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Remove
        </button>
      `
          : ""
      }
    </div>

    <!-- Room & Tenant Metadata -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">Room No. <span class="text-blue-600">(Blue)</span></label>
        <input type="text" value="${escapeHtml(rm.roomNo)}" oninput="updateRoomField('roomNo', this.value)"
          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 mb-1">No. of Tenants <span class="text-blue-600">(Blue)</span></label>
        <input type="number" min="1" value="${rm.tenants}" oninput="updateRoomField('tenants', this.value)"
          class="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-blue-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
    </div>

    <!-- Section 1: Rent Computation -->
    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-700">1. Rent Computation</span>
        <select onchange="updateRoomField('rentMode', this.value, true)" class="text-xs rounded-md border border-slate-300 px-2 py-1 bg-white font-medium text-slate-700">
          <option value="prorated" ${rm.rentMode === "prorated" ? "selected" : ""}>Prorated Rent Mode</option>
          <option value="full" ${rm.rentMode === "full" ? "selected" : ""}>Regular Full Month</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Rent Period</label>
          <div class="relative">
            <input type="text" value="${escapeHtml(rm.rentPeriod)}" readonly
              onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'rentPeriod', mode: 'range', label: 'Rent Period (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
              class="w-full rounded-lg border border-slate-300 pl-2.5 pr-7 py-1.5 text-xs bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Monthly Rent (₱)</label>
          <input type="number" step="50" value="${rm.monthlyRent}" oninput="updateRoomField('monthlyRent', this.value)"
            class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
      </div>

      ${
        rm.rentMode === "prorated"
          ? `
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="block text-[11px] font-medium text-slate-600 mb-1">Move-in Day</label>
            <div class="relative">
              <input type="text" value="${escapeHtml(rm.moveInDay)}" readonly
                onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'moveInDay', mode: 'ordinalDay', label: 'Move-in Day (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
                class="w-full rounded-lg border border-slate-300 pl-2 pr-6 py-1.5 text-xs font-semibold text-blue-700 bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-[11px] font-medium text-slate-600">Rem. Days</label>
              <button onclick="autoCalcRemainingDays()" title="Calculate 30 - MoveInDay + 1" class="text-[10px] text-indigo-600 hover:underline font-semibold">Auto</button>
            </div>
            <input type="number" step="1" value="${rm.remainingDays}" oninput="updateRoomField('remainingDays', this.value)"
              class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-slate-600 mb-1">Days Divisor</label>
            <input type="number" step="1" value="${rm.divisorDays}" oninput="updateRoomField('divisorDays', this.value)"
              class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
        </div>
      `
          : ""
      }

      <div class="pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-medium">${rm.rentMode === "prorated" ? "Computed Prorated Rent:" : "Full Monthly Rent:"}</span>
        <span id="sidebar-rent-due" class="font-bold text-slate-900">${formatPeso(totals.rentDue)}</span>
      </div>
    </div>

    <!-- Section 2: Utility Bills -->
    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-slate-700">2. Utility Bills</span>
        <button type="button" onclick="openKwhModal(${idx})"
          class="text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition">
          <i data-lucide="zap" class="w-3 h-3 text-amber-600"></i>
          Submeter kWh Calc
        </button>
      </div>

      <div>
        <label class="block text-[11px] font-medium text-slate-600 mb-1">Utility Billing Period</label>
        <div class="relative">
          <input type="text" value="${escapeHtml(rm.utilityPeriod)}" readonly
            onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'utilityPeriod', mode: 'range', label: 'Utility Billing Period (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
            class="w-full rounded-lg border border-slate-300 pl-2.5 pr-8 py-1.5 text-xs bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-[11px] font-medium text-slate-600">Electricity <span class="text-blue-600">(₱)</span></label>
            <button type="button" onclick="openKwhModal(${idx})" title="Open Submeter kWh Calculator" class="text-[10px] text-indigo-600 hover:underline font-semibold">kWh</button>
          </div>
          <div class="relative">
            <input type="number" step="10" value="${rm.electricity}"
              oninput="updateRoomField('electricity', this.value)"
              ondblclick="openKwhModal(${idx})"
              title="Type amount directly or click kWh to calculate from submeter readings"
              class="w-full rounded-lg border border-slate-300 pl-2 pr-6 py-1.5 text-xs font-semibold text-blue-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <button type="button" onclick="openKwhModal(${idx})" title="Submeter kWh Calculator"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-600">
              <i data-lucide="zap" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Water (₱)</label>
          <input type="number" step="10" value="${rm.water}" oninput="updateRoomField('water', this.value)"
            class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Wifi (₱)</label>
          <input type="number" step="10" value="${rm.wifi}" oninput="updateRoomField('wifi', this.value)"
            class="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
      </div>

      ${
        kwhUsed !== null
          ? `
        <div onclick="openKwhModal(${idx})" class="text-[11px] text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition">
          <span>Submeter: <strong>${rm.elecPrevReading}</strong> &rarr; <strong>${rm.elecCurrReading} kWh</strong> (${kwhUsed} kWh &times; ₱${rm.elecRatePerKwh})</span>
          <span class="text-indigo-600 font-semibold">Edit</span>
        </div>
      `
          : ""
      }

      <div class="pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
        <span class="text-slate-600 font-medium">Total Utility Bills:</span>
        <span id="sidebar-util-total" class="font-bold text-slate-900">${formatPeso(totals.totalUtilities)}</span>
      </div>
    </div>

    <!-- Section 3: Next Schedule & Total Summary -->
    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-700 block">Next Billing Schedule</span>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Next Rent Payment Due</label>
          <div class="relative">
            <input type="text" value="${escapeHtml(rm.nextRentDate)}" readonly
              onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'nextRentDate', mode: 'fullDate', label: 'Next Rent Payment Due (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
              class="w-full rounded-lg border border-slate-300 pl-2.5 pr-7 py-1.5 text-xs font-semibold text-blue-700 bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
        <div>
          <label class="block text-[11px] font-medium text-slate-600 mb-1">Next Meter Reading</label>
          <div class="relative">
            <input type="text" value="${escapeHtml(rm.nextMeterDate)}" readonly
              onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'nextMeterDate', mode: 'fullDate', label: 'Next Meter Reading (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
              class="w-full rounded-lg border border-slate-300 pl-2.5 pr-7 py-1.5 text-xs font-semibold text-blue-700 bg-white cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-indigo-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Total Banner Preview in Sidebar -->
    <div class="p-3 rounded-xl bg-amber-100/90 border-2 border-amber-300 flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-wider text-slate-900">Room ${escapeHtml(rm.roomNo)} Total to Pay:</span>
      <span id="sidebar-grand-total" class="text-base font-extrabold text-slate-950">${formatPeso(totals.grandTotal)}</span>
    </div>
  `;
}

export function buildAllA4SheetsHtml(state) {
  const rooms = state.rooms;
  const sheetsHtml = [];

  for (let i = 0; i < rooms.length; i += 2) {
    const leftRoom = rooms[i];
    const rightRoom = rooms[i + 1] || null;
    const cutClass = state.globalSettings.printCutLine
      ? ""
      : "hide-cut-line-print";

    sheetsHtml.push(`
      <div class="a4-landscape-sheet ${cutClass}">
        ${renderSingleExcelSlip(leftRoom, i, state)}
        
        <!-- Center Cut / Fold Margin -->
        <div class="cut-guide" title="Center Cut / Fold Line">
          <div class="cut-guide-line"></div>
        </div>

        ${rightRoom ? renderSingleExcelSlip(rightRoom, i + 1, state) : renderEmptySlipPlaceholder()}
      </div>
    `);
  }

  return sheetsHtml.join("");
}

function renderSingleExcelSlip(rm, roomIndex, state) {
  const g = state.globalSettings;
  const totals = computeRoomTotals(rm);
  const isSelected = roomIndex === state.activeRoomIndex;
  const gridClass = state.showExcelGrid ? "excel-grid-overlay" : "";
  const activeRingClass = isSelected ? "ring-2 ring-indigo-500/60" : "";

  const rentLabel =
    rm.rentMode === "prorated" ? "Prorated Rent:" : "Monthly Rent:";

  return `
    <div
      onclick="selectRoomFromPreview(${roomIndex}, event)"
      class="excel-slip ${gridClass} ${activeRingClass} transition-shadow cursor-pointer"
    >
      <div>
        <!-- 1. Top Yellow Banner: RENT & BILLING STATEMENT (BOLD) -->
        <div class="excel-header-banner excel-bold">
          ${escapeHtml(g.title)}
        </div>

        <!-- 2. Room No. & No. of Tenants: Labels BOLD, Blue Values NORMAL -->
        <table class="w-full border-collapse mb-3">
          <tbody>
            <tr>
              <td class="excel-bold w-[42%] py-[1px]">Room No.:</td>
              <td class="excel-blue w-[58%] py-[1px]">${escapeHtml(rm.roomNo)}</td>
            </tr>
            <tr>
              <td class="excel-bold py-[1px]">No. of Tenants:</td>
              <td class="excel-blue py-[1px]">${escapeHtml(rm.tenants)}</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. IMPORTANT NOTICE: Heading BOLD, body NORMAL except <b>1st day of the month</b> -->
        ${
          g.showNotice
            ? `
          <div class="mb-3.5">
            <div class="excel-bold">IMPORTANT NOTICE</div>
            <p class="leading-snug text-[10.5pt]">
              ${g.noticeHtml}
            </p>
          </div>
        `
            : ""
        }

        <!-- 4. 1. RENT COMPUTATION: Heading BOLD, items NORMAL, Prorated Rent row BOLD -->
        <div class="mb-3.5">
          <div class="excel-bold">1. RENT COMPUTATION</div>
          <table class="w-full border-collapse">
            <tbody>
              <tr>
                <td class="w-[42%] py-[1px]">Period:</td>
                <td class="w-[24%] py-[1px] text-right whitespace-nowrap inline-edit"
                    title="Click to pick Rent Period dates"
                    onclick="event.stopPropagation(); openDatePickerModal({ targetType: 'room', roomIndex: ${roomIndex}, field: 'rentPeriod', mode: 'range', label: 'Rent Period (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })">
                  ${escapeHtml(rm.rentPeriod)}
                </td>
                <td class="w-[34%]"></td>
              </tr>
              <tr>
                <td class="py-[1px]">Monthly Rent:</td>
                <td class="excel-blue py-[1px] text-right whitespace-nowrap">${formatPeso(rm.monthlyRent)}</td>
                <td></td>
              </tr>
              ${
                rm.rentMode === "prorated"
                  ? `
                <tr>
                  <td class="py-[1px]">Move-in Day:</td>
                  <td class="excel-blue py-[1px] text-right whitespace-nowrap inline-edit"
                      title="Click to pick Move-in Day"
                      onclick="event.stopPropagation(); openDatePickerModal({ targetType: 'room', roomIndex: ${roomIndex}, field: 'moveInDay', mode: 'ordinalDay', label: 'Move-in Day (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })">
                    ${escapeHtml(rm.moveInDay)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td class="py-[1px]">Remaining Days:</td>
                  <td class="excel-blue py-[1px] text-right whitespace-nowrap">${escapeHtml(rm.remainingDays)}</td>
                  <td></td>
                </tr>
                <tr><td colspan="3" class="h-2.5"></td></tr>
                <tr>
                  <td></td>
                  <td colspan="2" class="py-[1px]">Computation:</td>
                </tr>
                <tr>
                  <td></td>
                  <td colspan="2" class="py-[1px] whitespace-nowrap">
                    <span class="inline-block w-[41%] text-right pr-1">${formatPeso(rm.monthlyRent)} &divide;</span>
                    <span>${escapeHtml(rm.divisorDays)} &times; ${escapeHtml(rm.remainingDays)} days</span>
                  </td>
                </tr>
                <tr><td colspan="3" class="h-2.5"></td></tr>
                <tr>
                  <td></td>
                  <td colspan="2" class="py-[1px] whitespace-nowrap">
                    <span class="inline-block w-[41%] excel-bold">Prorated Rent:</span>
                    <span class="excel-bold">${formatPeso(totals.rentDue)}</span>
                  </td>
                </tr>
              `
                  : `
                <tr><td colspan="3" class="h-2"></td></tr>
                <tr>
                  <td></td>
                  <td colspan="2" class="py-[1px] whitespace-nowrap">
                    <span class="inline-block w-[41%] excel-bold">Rent Due:</span>
                    <span class="excel-bold">${formatPeso(totals.rentDue)}</span>
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>

        <!-- 5. 2. UTILITY BILLS: Heading BOLD, items NORMAL, 'Total Utility Bills:' label BOLD, amount NORMAL -->
        <div class="mb-3.5">
          <div class="excel-bold">2. UTILITY BILLS</div>
          <table class="w-full border-collapse">
            <tbody>
              <tr>
                <td class="w-[42%] py-[1px]">Period:</td>
                <td class="w-[24%] py-[1px] text-right whitespace-nowrap inline-edit"
                    title="Click to pick Utility Billing Period"
                    onclick="event.stopPropagation(); openDatePickerModal({ targetType: 'room', roomIndex: ${roomIndex}, field: 'utilityPeriod', mode: 'range', label: 'Utility Billing Period (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })">
                  ${escapeHtml(rm.utilityPeriod)}
                </td>
                <td class="w-[34%]"></td>
              </tr>
              <tr>
                <td class="py-[1px]">Electricity:</td>
                <td class="excel-blue py-[1px] text-right whitespace-nowrap inline-edit"
                    title="Click to open Submeter (kWh) Calculator"
                    onclick="event.stopPropagation(); openKwhModal(${roomIndex})">
                  ${formatPeso(rm.electricity)}
                </td>
                <td></td>
              </tr>
              <tr>
                <td class="py-[1px]">Water:</td>
                <td class="py-[1px] text-right whitespace-nowrap">${formatPeso(rm.water)}</td>
                <td></td>
              </tr>
              <tr>
                <td class="py-[1px]">Wifi Connection:</td>
                <td class="py-[1px] text-right whitespace-nowrap">${formatPeso(rm.wifi)}</td>
                <td></td>
              </tr>
              <tr>
                <td class="excel-bold py-[1px]">Total Utility Bills:</td>
                <td class="py-[1px] text-right border-t border-black whitespace-nowrap">${formatPeso(totals.totalUtilities)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 6. 3. TOTAL AMOUNT TO PAY: Heading BOLD, sub-items NORMAL, TOTAL row BOLD -->
        <div class="mb-4">
          <div class="excel-bold">3. TOTAL AMOUNT TO PAY</div>
          <table class="w-full border-collapse">
            <tbody>
              <tr>
                <td class="w-[42%] py-[1px]">${rentLabel}</td>
                <td class="w-[24%] py-[1px] text-right whitespace-nowrap">${formatPeso(totals.rentDue)}</td>
                <td class="w-[34%]"></td>
              </tr>
              <tr>
                <td class="py-[1px]">Utility Bills:</td>
                <td class="py-[1px] text-right whitespace-nowrap">${formatPeso(totals.totalUtilities)}</td>
                <td></td>
              </tr>
              <tr>
                <td class="excel-total-banner excel-bold pl-0.5">TOTAL:</td>
                <td class="excel-total-banner excel-bold text-right pr-0.5 whitespace-nowrap">${formatPeso(totals.grandTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 7 & 8. NEXT BILLING SCHEDULE & FOOTER -->
      <div class="pt-1">
        <div class="excel-bold">NEXT BILLING SCHEDULE</div>
        <table class="w-full border-collapse mb-3">
          <tbody>
            <tr>
              <td class="w-[28%] excel-blue excel-bold pl-2 py-[1px] whitespace-nowrap inline-edit"
                  title="Click to pick Next Rent Payment Due date"
                  onclick="event.stopPropagation(); openDatePickerModal({ targetType: 'room', roomIndex: ${roomIndex}, field: 'nextRentDate', mode: 'fullDate', label: 'Next Rent Payment Due (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })">
                ${escapeHtml(rm.nextRentDate)}
              </td>
              <td class="w-[72%] py-[1px]">- Next rent payment due.</td>
            </tr>
            <tr>
              <td class="excel-blue excel-bold pl-2 py-[1px] whitespace-nowrap inline-edit"
                  title="Click to pick Next Meter Reading date"
                  onclick="event.stopPropagation(); openDatePickerModal({ targetType: 'room', roomIndex: ${roomIndex}, field: 'nextMeterDate', mode: 'fullDate', label: 'Next Meter Reading (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })">
                ${escapeHtml(rm.nextMeterDate)}
              </td>
              <td class="py-[1px]">- Next electricity and water meter reading.</td>
            </tr>
          </tbody>
        </table>

        <p class="mb-3 text-[10.5pt]">
          ${g.footerNote}
        </p>
        <p class="text-[10.5pt]">
          ${g.signOff}
        </p>
      </div>
    </div>
  `;
}

function renderEmptySlipPlaceholder() {
  return `
    <div class="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-center no-print bg-slate-50/50">
      <div class="w-10 h-10 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mb-2">
        <i data-lucide="plus" class="w-5 h-5"></i>
      </div>
      <p class="text-xs font-semibold text-slate-600 mb-1">Empty Right Half of A4 Page</p>
      <p class="text-[11px] text-slate-400 max-w-[220px] mb-3">Add another room bill to print 2 bills side-by-side on this sheet.</p>
      <button onclick="addRoom()" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition">
        + Add Room for Right Side
      </button>
    </div>
    <div class="hidden print:block"></div>
  `;
}

export function buildBulkTableRowsHtml(state) {
  return state.rooms
    .map((rm, idx) => {
      const totals = computeRoomTotals(rm);
      return `
      <tr class="hover:bg-slate-50">
        <td class="p-1.5 border">
          <input type="text" value="${escapeHtml(rm.roomNo)}" oninput="updateBulkRoom(${idx}, 'roomNo', this.value)"
            class="w-14 px-2 py-1 border rounded font-bold text-blue-700" />
        </td>
        <td class="p-1.5 border">
          <input type="number" value="${rm.tenants}" oninput="updateBulkRoom(${idx}, 'tenants', this.value)"
            class="w-14 px-2 py-1 border rounded text-blue-700" />
        </td>
        <td class="p-1.5 border">
          <select onchange="updateBulkRoom(${idx}, 'rentMode', this.value); renderBulkTable();" class="px-2 py-1 border rounded bg-white">
            <option value="prorated" ${rm.rentMode === "prorated" ? "selected" : ""}>Prorated</option>
            <option value="full" ${rm.rentMode === "full" ? "selected" : ""}>Full Month</option>
          </select>
        </td>
        <td class="p-1.5 border">
          <input type="text" value="${escapeHtml(rm.rentPeriod)}" readonly
            onclick="openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'rentPeriod', mode: 'range', label: 'Rent Period (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
            class="w-32 px-2 py-1 border rounded cursor-pointer hover:border-indigo-400 bg-white" />
        </td>
        <td class="p-1.5 border">
          <input type="number" step="100" value="${rm.monthlyRent}" oninput="updateBulkRoom(${idx}, 'monthlyRent', this.value)"
            class="w-24 px-2 py-1 border rounded text-blue-700 font-semibold" />
        </td>
        <td class="p-1.5 border">
          <input type="text" value="${escapeHtml(rm.moveInDay)}" readonly
            onclick="if('${rm.rentMode}' !== 'full') openDatePickerModal({ targetType: 'room', roomIndex: ${idx}, field: 'moveInDay', mode: 'ordinalDay', label: 'Move-in Day (Room ' + '${escapeHtml(rm.roomNo)}' + ')' })"
            class="w-24 px-2 py-1 border rounded text-blue-700 cursor-pointer hover:border-indigo-400 bg-white" ${rm.rentMode === "full" ? "disabled" : ""} />
        </td>
        <td class="p-1.5 border">
          <input type="number" value="${rm.remainingDays}" oninput="updateBulkRoom(${idx}, 'remainingDays', this.value)"
            class="w-16 px-2 py-1 border rounded text-blue-700" ${rm.rentMode === "full" ? "disabled" : ""} />
        </td>
        <td class="p-1.5 border">
          <div class="flex items-center gap-1">
            <input type="number" step="10" value="${rm.electricity}" oninput="updateBulkRoom(${idx}, 'electricity', this.value)"
              class="w-20 px-2 py-1 border rounded text-blue-700 font-semibold" />
            <button type="button" onclick="openKwhModal(${idx})" title="Submeter kWh Calculator"
              class="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300">
              <i data-lucide="zap" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
        <td class="p-1.5 border">
          <input type="number" step="10" value="${rm.water}" oninput="updateBulkRoom(${idx}, 'water', this.value)"
            class="w-20 px-2 py-1 border rounded" />
        </td>
        <td class="p-1.5 border">
          <input type="number" step="10" value="${rm.wifi}" oninput="updateBulkRoom(${idx}, 'wifi', this.value)"
            class="w-20 px-2 py-1 border rounded" />
        </td>
        <td id="bulk-total-${idx}" class="p-2 border bg-amber-50 font-bold text-slate-900 whitespace-nowrap">
          ${formatPeso(totals.grandTotal)}
        </td>
        <td class="p-1.5 border text-center">
          ${
            state.rooms.length > 1
              ? `
            <button onclick="deleteRoom(${idx}); renderBulkTable();" class="text-rose-600 hover:bg-rose-50 p-1 rounded" title="Delete Room">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          `
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

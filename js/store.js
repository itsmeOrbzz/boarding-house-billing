export const STORAGE_KEY = "boarding_house_bills_v1";

export const DEFAULT_STATE = {
  activeRoomIndex: 0,
  showExcelGrid: false,
  globalSettings: {
    title: "RENT & BILLING STATEMENT",
    showNotice: true,
    noticeHtml:
      "To standardize the rental payment schedule, all tenants will follow a fixed payment date every <b>1st day of the month</b>, regardless of their move-in date.",
    footerNote:
      "Starting December 1, your regular monthly rent will be due every 1st day of the month.",
    signOff: "Thank you for your cooperation!",
    printCutLine: true,
    defaultKwhRate: 16,
  },
  rooms: [
    {
      id: "room-1",
      roomNo: "1",
      tenants: 1,
      rentMode: "prorated",
      rentPeriod: "Nov 15 to Dec 1",
      monthlyRent: 5000,
      moveInDay: "15th Day",
      remainingDays: 29,
      divisorDays: 30,
      utilityPeriod: "Sep 30 to Oct 30",
      electricity: 160,
      elecPrevReading: 100,
      elecCurrReading: 110,
      elecRatePerKwh: 16,
      water: 400,
      wifi: 500,
      nextRentDate: "December 1",
      nextMeterDate: "December 1",
    },
    {
      id: "room-2",
      roomNo: "2",
      tenants: 1,
      rentMode: "prorated",
      rentPeriod: "Nov 2 to Dec 1",
      monthlyRent: 5000,
      moveInDay: "2nd Day",
      remainingDays: 29,
      divisorDays: 30,
      utilityPeriod: "Sep 30 to Oct 30",
      electricity: 480,
      elecPrevReading: 200,
      elecCurrReading: 230,
      elecRatePerKwh: 16,
      water: 200,
      wifi: 500,
      nextRentDate: "December 1",
      nextMeterDate: "December 1",
    },
  ],
};

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
        const merged = {
          ...DEFAULT_STATE,
          ...parsed,
          activeRoomIndex: Number(parsed.activeRoomIndex) || 0,
          globalSettings: {
            ...DEFAULT_STATE.globalSettings,
            ...(parsed.globalSettings || {}),
          },
          rooms: parsed.rooms.map((rm, idx) => ({
            ...DEFAULT_STATE.rooms[0],
            ...rm,
            id: rm.id || `room-${idx + 1}`,
          })),
        };

        if (merged.activeRoomIndex >= merged.rooms.length) {
          merged.activeRoomIndex = 0;
        }

        return merged;
      }
    }
  } catch (e) {
    console.warn("Could not read localStorage, resetting to default:", e);
  }
  return getFreshDemoState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save to localStorage:", e);
  }
}

export function getFreshDemoState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

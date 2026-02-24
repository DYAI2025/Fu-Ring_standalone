export interface BirthData {
  date: string; // ISO 8601 local date time e.g. 2024-02-10T14:30:00
  tz: string;
  lon: number;
  lat: number;
}

const BASE_URL = "https://bafe-production.up.railway.app";

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export async function calculateBazi(data: BirthData) {
  const res = await fetchWithTimeout(`${BASE_URL}/calculate/bazi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      tz: data.tz,
      lon: data.lon,
      lat: data.lat,
      standard: "CIVIL",
      boundary: "midnight",
      strict: true,
      ambiguousTime: "earlier",
      nonexistentTime: "error"
    }),
  });
  if (!res.ok) throw new Error("Failed to calculate Bazi");
  return res.json();
}

export async function calculateWestern(data: BirthData) {
  const res = await fetchWithTimeout(`${BASE_URL}/calculate/western`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      tz: data.tz,
      lon: data.lon,
      lat: data.lat,
      ambiguousTime: "earlier",
      nonexistentTime: "error"
    }),
  });
  if (!res.ok) throw new Error("Failed to calculate Western");
  return res.json();
}

export async function calculateFusion(data: BirthData) {
  const res = await fetchWithTimeout(`${BASE_URL}/calculate/fusion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      tz: data.tz,
      lon: data.lon,
      lat: data.lat,
      ambiguousTime: "earlier",
      nonexistentTime: "error",
      bazi_pillars: null
    }),
  });
  if (!res.ok) throw new Error("Failed to calculate Fusion");
  return res.json();
}

export async function calculateWuxing(data: BirthData) {
  const res = await fetchWithTimeout(`${BASE_URL}/calculate/wuxing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      tz: data.tz,
      lon: data.lon,
      lat: data.lat,
      ambiguousTime: "earlier",
      nonexistentTime: "error"
    }),
  });
  if (!res.ok) throw new Error("Failed to calculate Wuxing");
  return res.json();
}

export async function calculateTst(data: BirthData) {
  const res = await fetchWithTimeout(`${BASE_URL}/calculate/tst`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: data.date,
      tz: data.tz,
      lon: data.lon,
      ambiguousTime: "earlier",
      nonexistentTime: "error"
    }),
  });
  if (!res.ok) throw new Error("Failed to calculate TST");
  return res.json();
}

const MOCK_DATA = {
  bazi: {
    day_master: "Yang Fire",
    zodiac_sign: "Dragon",
    pillars: {
      year: { stem: "Jia", branch: "Chen" },
      month: { stem: "Bing", branch: "Yin" },
      day: { stem: "Wu", branch: "Wu" },
      hour: { stem: "Ren", branch: "Zi" }
    }
  },
  western: {
    zodiac_sign: "Aries",
    moon_sign: "Leo",
    ascendant_sign: "Scorpio"
  },
  wuxing: {
    dominant_element: "Fire"
  },
  fusion: {},
  tst: {}
};

export async function calculateAll(data: BirthData) {
  const [bazi, western, fusion, wuxing, tst] = await Promise.all([
    calculateBazi(data).catch((e) => {
      console.warn("BaZi API failed, using mock data:", e);
      return MOCK_DATA.bazi;
    }),
    calculateWestern(data).catch((e) => {
      console.warn("Western API failed, using mock data:", e);
      return MOCK_DATA.western;
    }),
    calculateFusion(data).catch((e) => {
      console.warn("Fusion API failed, using mock data:", e);
      return MOCK_DATA.fusion;
    }),
    calculateWuxing(data).catch((e) => {
      console.warn("WuXing API failed, using mock data:", e);
      return MOCK_DATA.wuxing;
    }),
    calculateTst(data).catch((e) => {
      console.warn("TST API failed, using mock data:", e);
      return MOCK_DATA.tst;
    }),
  ]);
  return { bazi, western, fusion, wuxing, tst };
}

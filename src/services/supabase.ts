import { supabase } from "../lib/supabase";
import type { BirthData } from "./api";

// ── Types ───────────────────────────────────────────────────────────

export interface AstroProfileRow {
  user_id: string;
  birth_date: string;
  birth_time: string;
  iana_time_zone: string;
  birth_lat: number;
  birth_lng: number;
  birth_place_name: string | null;
  sun_sign: string | null;
  moon_sign: string | null;
  asc_sign: string | null;
  astro_json: unknown;
  astro_computed_at: string;
}

// ── birth_data ──────────────────────────────────────────────────────

export async function insertBirthData(userId: string, input: BirthData) {
  const [datePart, timePart] = input.date.split("T");
  const { error } = await supabase.from("birth_data").insert({
    user_id: userId,
    birth_utc: input.date,
    lat: input.lat,
    lon: input.lon,
    place_label: null,
    tz: input.tz,
  });
  if (error) console.error("insertBirthData failed:", error);
}

// ── astro_profiles ──────────────────────────────────────────────────

export async function upsertAstroProfile(
  userId: string,
  birthInput: BirthData,
  apiData: any,
  interpretation: string | null,
) {
  const [datePart, timePart] = birthInput.date.includes("T")
    ? birthInput.date.split("T")
    : [birthInput.date, "12:00"];

  const row: AstroProfileRow = {
    user_id: userId,
    birth_date: datePart,
    birth_time: timePart,
    iana_time_zone: birthInput.tz,
    birth_lat: birthInput.lat,
    birth_lng: birthInput.lon,
    birth_place_name: null,
    sun_sign: apiData.western?.zodiac_sign || null,
    moon_sign: apiData.western?.moon_sign || null,
    asc_sign: apiData.western?.ascendant_sign || null,
    astro_json: {
      bazi: apiData.bazi,
      western: apiData.western,
      fusion: apiData.fusion,
      wuxing: apiData.wuxing,
      tst: apiData.tst,
      interpretation,
    },
    astro_computed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("astro_profiles")
    .upsert(row, { onConflict: "user_id" });

  if (error) console.error("upsertAstroProfile failed:", error);
}

// ── natal_charts ────────────────────────────────────────────────────

export async function insertNatalChart(userId: string, apiData: any) {
  const { error } = await supabase.from("natal_charts").insert({
    user_id: userId,
    payload: {
      bazi: apiData.bazi,
      western: apiData.western,
      fusion: apiData.fusion,
      wuxing: apiData.wuxing,
      tst: apiData.tst,
    },
    engine_version: "bafe-v1",
    zodiac: "tropical",
    house_system: "placidus",
  });
  if (error) console.error("insertNatalChart failed:", error);
}

// ── Read profile (for ElevenLabs client-side pre-check) ─────────────

export async function fetchAstroProfile(
  userId: string,
): Promise<AstroProfileRow | null> {
  const { data, error } = await supabase
    .from("astro_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("fetchAstroProfile failed:", error);
    return null;
  }
  return data;
}

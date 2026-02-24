export interface PersistedReading {
  birth_input: {
    date: string;
    tz: string;
    lon: number;
    lat: number;
  };
  api_data: unknown;
  interpretation: string;
  api_issues: { endpoint: string; message: string }[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ykoijifgweoapitabgxx.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function persistReading(reading: PersistedReading) {
  if (!isSupabaseConfigured()) {
    console.warn("Supabase is not configured. Skipping persistence.");
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(reading),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "No response body");
    throw new Error(`Failed to persist reading in Supabase: ${response.status} ${details}`);
  }
}

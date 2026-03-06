import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// ── Fallback texts (shown when API is unavailable) ─────────────────────────

const FALLBACK_EN = `
## Your Bazodiac Fusion Blueprint

Your cosmic profile unites three ancient systems into a picture that only Bazodiac can paint. Western astrology reveals your solar essence, Chinese BaZi unveils the pillars of your destiny, and Wu-Xing shows the elemental balance connecting it all.

This fusion is more than the sum of its parts — it reveals patterns no single system can see alone. Your complete reading is being prepared and will be available soon.
`.trim();

const FALLBACK_DE = `
## Dein Bazodiac Fusion-Blueprint

Dein kosmisches Profil vereint drei uralte Systeme zu einem Bild, das so nur Bazodiac zeichnen kann. Westliche Astrologie zeigt deine Sonnenessenz, chinesisches BaZi enthüllt die Säulen deines Schicksals, und Wu-Xing offenbart das elementare Gleichgewicht, das alles verbindet.

Diese Fusion ist mehr als die Summe ihrer Teile — sie zeigt Muster, die kein einzelnes System allein erkennen kann. Dein vollständiges Reading wird gerade vorbereitet und bald verfügbar sein.
`.trim();

// ── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(data: unknown, lang: string): string {
  return `
You are Bazodiac's fusion astrologer — the ONLY system that synthesizes Western astrology, Chinese BaZi, and Wu-Xing Five Elements into one unified reading.

BIRTH DATA (JSON):
${JSON.stringify(data, null, 2)}

TASK: Write a deeply personal ${lang === 'de' ? 'German' : 'English'} horoscope interpretation (400–500 words, 5 paragraphs, Markdown, no bullet points). Address the reader as "${lang === 'de' ? 'du' : 'you'}".

STRUCTURE — each paragraph MUST cross-reference at least two systems:

1. **Your Cosmic Identity**: Start with the Western Sun sign and immediately bridge to the BaZi Day Master. What does THIS specific combination reveal that neither system alone can show?

2. **Emotional Depths**: Connect Moon sign with the BaZi pillars' emotional patterns. How does Wu-Xing's dominant element color these emotional currents?

3. **The Fusion Revelation**: This is the core. Use the fusion data to reveal the UNIQUE intersection — the pattern that emerges ONLY when Western + BaZi + Wu-Xing are layered together. This is what no other app can show. Make this paragraph feel like a discovery.

4. **Wu-Xing Balance**: Which elements are strong, which are weak? How does this elemental map interact with the Western Ascendant? Give one concrete life recommendation based on elemental balance.

5. **Your Path Forward**: Synthesize all three systems into a forward-looking invitation. End with a sentence that makes the reader feel truly seen.

TONE: Warm, precise, mystical but grounded. Never generic. Every sentence must feel like it was written for THIS specific birth chart.
`.trim();
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * @param data   The full BAFE API results
 * @param lang   The user's current language preference ("en" | "de")
 */
export async function generateInterpretation(data: unknown, lang: string = "en") {
  const isGerman = lang === "de";
  const fallback = isGerman ? FALLBACK_DE : FALLBACK_EN;

  if (!ai) {
    console.warn("Missing VITE_GEMINI_API_KEY. Using fallback interpretation.");
    return fallback;
  }

  try {
    const response = (await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: buildPrompt(data, lang),
        config: { temperature: 0.75 },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API timeout")), 20000),
      ),
    ])) as { text?: string };

    return response.text?.trim() ?? fallback;
  } catch (error) {
    console.warn("Gemini API failed or timed out, using fallback:", error);
    return fallback;
  }
}

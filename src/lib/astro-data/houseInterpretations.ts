// ── House Interpretations ────────────────────────────────────────────────────
// Generates rich, personalised house-tooltip content from a sign + house number.
// Covers all 5 required elements:
//   1. House meaning / life domain
//   2. Sign's effect in that house
//   3. Personal angle
//   4. Possible strength
//   5. Possible tension / learning task

type Lang = "en" | "de";
type I18n = { en: string; de: string };

// ── Per-sign archetype data ───────────────────────────────────────────────────

interface SignData {
  archetype: I18n;
  /** What energy the sign brings to any house */
  energy: I18n;
  /** Core operating mode — verb phrase */
  mode: I18n;
  strength: I18n;
  shadow: I18n;
}

const SIGN_DATA: Record<string, SignData> = {
  Aries: {
    archetype: { en: "Pioneer", de: "Pionier" },
    energy: { en: "bold, initiating Aries energy", de: "mutige, anstoßende Widder-Energie" },
    mode: { en: "acts first and reflects later", de: "handelt zuerst und reflektiert danach" },
    strength: { en: "courageous initiative and the drive to break new ground", de: "mutiges Voranschreiten und den Antrieb, Neuland zu betreten" },
    shadow: { en: "impatience or burning out too quickly before seeing results", de: "Ungeduld oder zu schnelles Ausbrennen, bevor Ergebnisse sichtbar werden" },
  },
  Taurus: {
    archetype: { en: "Builder", de: "Erbauer" },
    energy: { en: "steady, sensual Taurus energy", de: "beständige, sinnliche Stier-Energie" },
    mode: { en: "builds slowly but creates lasting foundations", de: "baut langsam, aber schafft dauerhafte Fundamente" },
    strength: { en: "patience, reliability, and the ability to manifest tangible results", de: "Geduld, Verlässlichkeit und die Fähigkeit, greifbare Ergebnisse zu erschaffen" },
    shadow: { en: "resistance to change or clinging to what is comfortable but no longer serves", de: "Widerstand gegen Veränderungen oder Festhalten an Vertrautem, das nicht mehr dient" },
  },
  Gemini: {
    archetype: { en: "Messenger", de: "Bote" },
    energy: { en: "curious, versatile Gemini energy", de: "neugierige, vielseitige Zwillinge-Energie" },
    mode: { en: "explores multiple angles simultaneously", de: "erkundet mehrere Perspektiven gleichzeitig" },
    strength: { en: "adaptability, quick thinking, and the gift of meaningful communication", de: "Anpassungsfähigkeit, schnelles Denken und die Gabe bedeutungsvoller Kommunikation" },
    shadow: { en: "scattering energy across too many directions or avoiding emotional depth", de: "Energie auf zu viele Richtungen verteilen oder emotionaler Tiefe ausweichen" },
  },
  Cancer: {
    archetype: { en: "Nurturer", de: "Hüter" },
    energy: { en: "intuitive, protective Cancer energy", de: "intuitive, schützende Krebs-Energie" },
    mode: { en: "leads with feeling and creates spaces of deep belonging", de: "führt mit Gefühl und schafft Räume tiefer Zugehörigkeit" },
    strength: { en: "emotional intelligence, empathy, and the ability to make others feel truly seen", de: "emotionale Intelligenz, Empathie und die Fähigkeit, andere wirklich gesehen fühlen zu lassen" },
    shadow: { en: "over-protectiveness, clinging to the past, or absorbing others' emotions as one's own", de: "Überfürsorglichkeit, Festhalten an der Vergangenheit oder das Absorbieren fremder Emotionen" },
  },
  Leo: {
    archetype: { en: "Creator", de: "Schöpfer" },
    energy: { en: "radiant, generative Leo energy", de: "strahlende, schöpferische Löwen-Energie" },
    mode: { en: "shines authentically and invites others to do the same", de: "leuchtet authentisch und lädt andere ein, dasselbe zu tun" },
    strength: { en: "creative leadership, warmth, and the courage to fully express one's true self", de: "kreative Führung, Wärme und den Mut, das wahre Selbst vollständig auszudrücken" },
    shadow: { en: "seeking external validation or letting pride block genuine vulnerability", de: "äußere Bestätigung suchen oder Stolz echter Verwundbarkeit im Wege stehen lassen" },
  },
  Virgo: {
    archetype: { en: "Analyst", de: "Analytiker" },
    energy: { en: "precise, discerning Virgo energy", de: "präzise, unterscheidende Jungfrau-Energie" },
    mode: { en: "refines and improves through careful observation", de: "verfeinert und verbessert durch sorgfältige Beobachtung" },
    strength: { en: "an exceptional eye for detail, practical problem-solving, and devotion to service", de: "einen außergewöhnlichen Blick für Details, praktische Problemlösung und Hingabe an den Dienst" },
    shadow: { en: "over-criticism of self or others, or getting lost in perfectionism instead of completion", de: "Überkritik an sich selbst oder anderen, oder sich in Perfektionismus verlieren statt zu vollenden" },
  },
  Libra: {
    archetype: { en: "Diplomat", de: "Diplomat" },
    energy: { en: "harmonising, justice-seeking Libra energy", de: "harmonisierende, gerechtigkeitssuchende Waage-Energie" },
    mode: { en: "weighs all perspectives before acting", de: "wägt alle Perspektiven ab, bevor es handelt" },
    strength: { en: "natural diplomacy, aesthetic refinement, and the ability to hold fair space for all", de: "natürliche Diplomatie, ästhetische Verfeinerung und die Fähigkeit, fairen Raum für alle zu halten" },
    shadow: { en: "difficulty making decisions alone or suppressing own needs to maintain harmony", de: "Schwierigkeiten, allein zu entscheiden, oder eigene Bedürfnisse zugunsten der Harmonie zurückzustellen" },
  },
  Scorpio: {
    archetype: { en: "Transformer", de: "Wandler" },
    energy: { en: "intense, penetrating Scorpio energy", de: "intensive, durchdringende Skorpion-Energie" },
    mode: { en: "dives beneath the surface to find hidden truth", de: "taucht unter die Oberfläche, um verborgene Wahrheit zu finden" },
    strength: { en: "profound depth, psychological insight, and the power to facilitate genuine transformation", de: "außergewöhnliche Tiefe, psychologischen Scharfsinn und die Kraft, echten Wandel anzustoßen" },
    shadow: { en: "control tendencies, power struggles, or difficulty releasing what has already served its purpose", de: "Kontrolltendenzen, Machtkämpfe oder Schwierigkeiten, loszulassen, was seinen Zweck erfüllt hat" },
  },
  Sagittarius: {
    archetype: { en: "Explorer", de: "Entdecker" },
    energy: { en: "expansive, truth-seeking Sagittarius energy", de: "expansive, wahrheitssuchende Schützen-Energie" },
    mode: { en: "seeks the bigger picture and refuses to be limited", de: "sucht das große Ganze und weigert sich, begrenzt zu werden" },
    strength: { en: "boundless optimism, philosophical vision, and an infectious enthusiasm for life", de: "grenzenloser Optimismus, philosophische Weitsicht und eine ansteckende Lebensfreude" },
    shadow: { en: "overextending in too many directions or bypassing depth in favour of breadth", de: "sich in zu viele Richtungen ausdehnen oder Tiefe zugunsten von Breite umgehen" },
  },
  Capricorn: {
    archetype: { en: "Strategist", de: "Stratege" },
    energy: { en: "disciplined, achievement-oriented Capricorn energy", de: "disziplinierte, leistungsorientierte Steinbock-Energie" },
    mode: { en: "climbs methodically toward long-term mastery", de: "klettert methodisch in Richtung langfristiger Meisterschaft" },
    strength: { en: "exceptional discipline, strategic thinking, and the perseverance to achieve ambitious goals", de: "außergewöhnliche Disziplin, strategisches Denken und die Ausdauer, ambitionierte Ziele zu erreichen" },
    shadow: { en: "rigidity, workaholism, or equating self-worth too closely with external achievements", de: "Starrheit, Workaholismus oder den Selbstwert zu eng mit äußeren Leistungen zu verknüpfen" },
  },
  Aquarius: {
    archetype: { en: "Visionary", de: "Visionär" },
    energy: { en: "innovative, collective-minded Aquarius energy", de: "innovative, gemeinschaftsorientierte Wassermann-Energie" },
    mode: { en: "sees the future and works to make it real for everyone", de: "sieht die Zukunft und arbeitet daran, sie für alle Realität werden zu lassen" },
    strength: { en: "original thinking, humanitarian vision, and the courage to challenge what no longer works", de: "originelles Denken, humanitäre Vision und den Mut, das Veraltete in Frage zu stellen" },
    shadow: { en: "emotional detachment or prioritising ideals over the immediate needs of real people", de: "emotionale Distanz oder das Priorisieren von Idealen über die unmittelbaren Bedürfnisse echter Menschen" },
  },
  Pisces: {
    archetype: { en: "Mystic", de: "Mystiker" },
    energy: { en: "empathic, boundless Pisces energy", de: "empathische, grenzenlose Fische-Energie" },
    mode: { en: "dissolves boundaries and connects to the invisible current of life", de: "löst Grenzen auf und verbindet sich mit dem unsichtbaren Strom des Lebens" },
    strength: { en: "profound intuition, compassion, and the gift of perceiving what lies beyond the obvious", de: "tiefe Intuition, Mitgefühl und die Gabe, das zu spüren, was jenseits des Offensichtlichen liegt" },
    shadow: { en: "losing oneself in others' realities or escaping difficulty instead of meeting it with presence", de: "sich in der Realität anderer verlieren oder Schwierigkeiten ausweichen statt ihnen präsent zu begegnen" },
  },
};

// ── Per-house domain data ────────────────────────────────────────────────────

interface HouseDomain {
  area: I18n;
  coreTheme: I18n;
  lifeQuestion: I18n;
}

const HOUSE_DOMAIN: Record<number, HouseDomain> = {
  1:  {
    area: { en: "identity, appearance, and how you meet the world", de: "Identität, Erscheinung und die Art, wie du der Welt begegnest" },
    coreTheme: { en: "Self-definition and first impressions", de: "Selbstdefinition und erste Eindrücke" },
    lifeQuestion: { en: "Who do I show myself to be?", de: "Wer zeige ich mich der Welt?" },
  },
  2:  {
    area: { en: "material resources, values, and sense of self-worth", de: "materielle Ressourcen, Werte und Selbstwertgefühl" },
    coreTheme: { en: "Security, possessions, and personal values", de: "Sicherheit, Besitz und persönliche Werte" },
    lifeQuestion: { en: "What do I truly value and how do I build security?", de: "Was schätze ich wirklich und wie schaffe ich Sicherheit?" },
  },
  3:  {
    area: { en: "communication, learning, and your immediate environment", de: "Kommunikation, Lernen und dein unmittelbares Umfeld" },
    coreTheme: { en: "Expression, curiosity, and mental connection", de: "Ausdruck, Neugier und mentale Verbindung" },
    lifeQuestion: { en: "How do I communicate, learn, and connect with my world?", de: "Wie kommuniziere, lerne und verbinde ich mich mit meiner Welt?" },
  },
  4:  {
    area: { en: "home, family, ancestry, and emotional foundations", de: "Zuhause, Familie, Vorfahren und emotionale Fundamente" },
    coreTheme: { en: "Roots, belonging, and private life", de: "Wurzeln, Zugehörigkeit und Privatleben" },
    lifeQuestion: { en: "Where do I truly belong and what nourishes me at my core?", de: "Wo gehöre ich wirklich hin und was nährt mich in meinem Kern?" },
  },
  5:  {
    area: { en: "creativity, joy, romance, and self-expression", de: "Kreativität, Freude, Romantik und Selbstausdruck" },
    coreTheme: { en: "Pleasure, play, and authentic creation", de: "Genuss, Spiel und authentisches Erschaffen" },
    lifeQuestion: { en: "What brings me pure joy and how do I express my heart?", de: "Was bringt mir reine Freude und wie drücke ich mein Herz aus?" },
  },
  6:  {
    area: { en: "daily routines, health, work, and acts of service", de: "Alltagsroutinen, Gesundheit, Arbeit und Dienst an anderen" },
    coreTheme: { en: "Wellbeing, discipline, and meaningful contribution", de: "Wohlbefinden, Disziplin und sinnvoller Beitrag" },
    lifeQuestion: { en: "How do I care for my body and show up in daily life?", de: "Wie kümmere ich mich um meinen Körper und erscheine im Alltag?" },
  },
  7:  {
    area: { en: "partnerships, relationships, and significant others", de: "Partnerschaften, Beziehungen und bedeutsame andere Menschen" },
    coreTheme: { en: "Commitment, mirroring, and the art of relating", de: "Bindung, Spiegelung und die Kunst des Verbindens" },
    lifeQuestion: { en: "What do I seek and give in deep partnership?", de: "Was suche und gebe ich in tiefer Partnerschaft?" },
  },
  8:  {
    area: { en: "transformation, shared power, and the mysteries of life and death", de: "Transformation, gemeinsame Macht und die Mysterien von Leben und Tod" },
    coreTheme: { en: "Rebirth, intimacy, and facing the depths", de: "Wiedergeburt, Intimität und das Eintauchen in die Tiefe" },
    lifeQuestion: { en: "What am I ready to release so I can truly transform?", de: "Was bin ich bereit loszulassen, um mich wirklich zu wandeln?" },
  },
  9:  {
    area: { en: "philosophy, higher learning, travel, and belief systems", de: "Philosophie, höheres Lernen, Reisen und Glaubenssysteme" },
    coreTheme: { en: "Expansion, truth-seeking, and the bigger picture", de: "Ausdehnung, Wahrheitssuche und das größere Bild" },
    lifeQuestion: { en: "What is my truth and how does it expand my world?", de: "Was ist meine Wahrheit und wie erweitert sie meine Welt?" },
  },
  10: {
    area: { en: "career, public role, social status, and long-term ambition", de: "Karriere, öffentliche Rolle, sozialer Status und langfristige Ambitionen" },
    coreTheme: { en: "Legacy, achievement, and mastery", de: "Vermächtnis, Leistung und Meisterschaft" },
    lifeQuestion: { en: "What is my calling and how do I leave my mark on the world?", de: "Was ist meine Berufung und wie hinterlasse ich meinen Eindruck in der Welt?" },
  },
  11: {
    area: { en: "community, friendship, groups, and collective ideals", de: "Gemeinschaft, Freundschaft, Gruppen und kollektive Ideale" },
    coreTheme: { en: "Belonging, vision, and social contribution", de: "Zugehörigkeit, Vision und gesellschaftlicher Beitrag" },
    lifeQuestion: { en: "Where do I belong in the larger human story?", de: "Wo gehöre ich in die größere menschliche Geschichte?" },
  },
  12: {
    area: { en: "solitude, spirituality, hidden matters, and karmic patterns", de: "Einsamkeit, Spiritualität, verborgene Dinge und karmische Muster" },
    coreTheme: { en: "Transcendence, surrender, and the hidden self", de: "Transzendenz, Hingabe und das verborgene Selbst" },
    lifeQuestion: { en: "What must I release to find peace and spiritual depth?", de: "Was muss ich loslassen, um Frieden und spirituelle Tiefe zu finden?" },
  },
};

// ── House name fallback ───────────────────────────────────────────────────────

const HOUSE_NAME: Record<number, I18n> = {
  1:  { en: "Self",           de: "Selbst"        },
  2:  { en: "Resources",      de: "Ressourcen"    },
  3:  { en: "Mind",           de: "Geist"         },
  4:  { en: "Foundation",     de: "Fundament"     },
  5:  { en: "Creativity",     de: "Kreativität"   },
  6:  { en: "Service",        de: "Dienst"        },
  7:  { en: "Partnership",    de: "Partnerschaft" },
  8:  { en: "Transformation", de: "Wandel"        },
  9:  { en: "Expansion",      de: "Horizont"      },
  10: { en: "Career",         de: "Beruf"         },
  11: { en: "Community",      de: "Gemeinschaft"  },
  12: { en: "Transcendence",  de: "Transzendenz"  },
};

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generates a rich, personalised house tooltip from a sign + house number.
 * Falls back to a minimal text if sign data is missing.
 */
export function buildHouseTooltip(
  houseNum: number,
  sign: string,
  lang: Lang,
): string {
  const signData = SIGN_DATA[sign];
  const domain = HOUSE_DOMAIN[houseNum];
  const houseName = HOUSE_NAME[houseNum];

  if (!domain || !houseName) return "";

  if (!signData) {
    // Minimal fallback if sign unknown
    if (lang === "de") {
      return `Haus ${houseNum} (${houseName.de}) — der Lebensbereich von ${domain.area.de}. Thema: ${domain.coreTheme.de}.`;
    }
    return `House ${houseNum} (${houseName.en}) — the life arena of ${domain.area.en}. Theme: ${domain.coreTheme.en}.`;
  }

  if (lang === "de") {
    return (
      `Haus ${houseNum} – ${houseName.de}: Hier zeigt sich der Lebensbereich von ${domain.area.de}. ` +
      `Kernfrage: „${domain.lifeQuestion.de}" ` +
      `Mit ${sign} in diesem Haus bringst du ${signData.energy.de} in diesen Raum — du ${signData.mode.de}. ` +
      `Stärke: ${signData.strength.de}. ` +
      `Lernaufgabe: Achte auf ${signData.shadow.de}.`
    );
  }

  return (
    `House ${houseNum} – ${houseName.en}: This house governs ${domain.area.en}. ` +
    `Core question: "${domain.lifeQuestion.en}" ` +
    `With ${sign} here, you bring ${signData.energy.en} into this arena — you ${signData.mode.en}. ` +
    `Strength: ${signData.strength.en}. ` +
    `Learning task: Watch for ${signData.shadow.en}.`
  );
}

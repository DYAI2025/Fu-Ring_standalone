import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sun, Moon, ArrowUp, ArrowLeft, RefreshCw, Zap, Phone, PhoneOff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { BirthChartOrrery } from "./BirthChartOrrery";
import { useLanguage } from "../contexts/LanguageContext";
import { WUXING_ELEMENTS, getWuxingByKey } from "../lib/astro-data/wuxing";
import { getBranchByAnimal } from "../lib/astro-data/earthlyBranches";

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

const WESTERN_EMOJIS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const ZODIAC_SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
] as const;

/** Convert 0-based zodiac index → sign name (mirrors api.ts signFromIndex) */
function signFromIndex(idx: number | undefined | null): string {
  if (idx == null || idx < 0 || idx > 11) return "";
  return ZODIAC_SIGNS[idx];
}

const PILLAR_KEYS: Record<string, string> = {
  year:  "dashboard.pillars.year",
  month: "dashboard.pillars.month",
  day:   "dashboard.pillars.day",
  hour:  "dashboard.pillars.hour",
};

// ── Western Astrological Houses ───────────────────────────────────────────
// Traditional names + 1-line keyword per house, bilingual.

const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"] as const;

interface HouseMeaning {
  name:    { en: string; de: string };
  keyword: { en: string; de: string };
}

const HOUSE_MEANINGS: Record<number, HouseMeaning> = {
  1:  { name: { en: "Self",          de: "Selbst"        }, keyword: { en: "Identity & Appearance",          de: "Identität & Erscheinung"           } },
  2:  { name: { en: "Resources",     de: "Ressourcen"    }, keyword: { en: "Wealth, Possessions & Values",   de: "Besitz, Vermögen & Werte"          } },
  3:  { name: { en: "Mind",          de: "Geist"         }, keyword: { en: "Communication, Siblings & Trips",de: "Kommunikation, Geschwister & Reisen"} },
  4:  { name: { en: "Foundation",    de: "Fundament"     }, keyword: { en: "Home, Family & Roots",           de: "Heim, Familie & Wurzeln"           } },
  5:  { name: { en: "Creativity",    de: "Kreativität"   }, keyword: { en: "Pleasure, Romance & Play",       de: "Freude, Romantik & Ausdruck"       } },
  6:  { name: { en: "Service",       de: "Dienst"        }, keyword: { en: "Health, Work & Daily Routine",   de: "Gesundheit, Arbeit & Alltag"       } },
  7:  { name: { en: "Partnership",   de: "Partnerschaft" }, keyword: { en: "Relationships & Contracts",      de: "Beziehungen & Verträge"            } },
  8:  { name: { en: "Transformation",de: "Wandel"        }, keyword: { en: "Depth, Shared Power & Rebirth",  de: "Tiefe, gemeinsame Macht & Wandel"  } },
  9:  { name: { en: "Expansion",     de: "Horizont"      }, keyword: { en: "Philosophy, Travel & Higher Learning", de: "Philosophie, Weite & Studium" } },
  10: { name: { en: "Career",        de: "Beruf"         }, keyword: { en: "Public Role, Status & Ambition", de: "Öffentl. Rolle & Ambition"         } },
  11: { name: { en: "Community",     de: "Gemeinschaft"  }, keyword: { en: "Friendships, Groups & Ideals",   de: "Freundschaften, Gruppen & Ziele"   } },
  12: { name: { en: "Transcendence", de: "Transzendenz"  }, keyword: { en: "Solitude, Karma & Hidden Matters",de: "Einsamkeit, Karma & Verborgenes"  } },
};

/** Extract house number (1–12) from any API key format. */
function parseHouseNum(key: string): number | null {
  // Handle "1"…"12", "House1", "house_2", "H3", roman numerals treated below
  const stripped = key.replace(/[^0-9]/g, "");
  const n = parseInt(stripped, 10);
  return n >= 1 && n <= 12 ? n : null;
}

/** Resolve sign name from an API house value object. */
function resolveSign(val: any): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) {
    // Try named string first
    if (val.sign && typeof val.sign === "string") return val.sign;
    // Try 0-based index
    const idx = val.zodiac_sign ?? val.sign_index ?? val.index;
    if (typeof idx === "number") return signFromIndex(idx);
  }
  return "";
}

// ── Animation helper ──────────────────────────────────────────────────────

function fadeIn(delay = 0) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

function DualSectionHeader({
  leftLabel, leftTitle, rightLabel, rightTitle,
}: { leftLabel: string; leftTitle: string; rightLabel: string; rightTitle: string }) {
  return (
    <div className="grid grid-cols-2 gap-6 mb-8 max-md:grid-cols-1">
      <div className="border-b border-[#8B6914]/15 pb-4">
        <p className="text-[#8B6914]/55 text-[8px] uppercase tracking-[0.45em] mb-1">{leftLabel}</p>
        <h2 className="font-serif text-2xl text-[#1E2A3A]">{leftTitle}</h2>
      </div>
      <div className="border-b border-[#8B6914]/15 pb-4">
        <p className="text-[#8B6914]/55 text-[8px] uppercase tracking-[0.45em] mb-1">{rightLabel}</p>
        <h2 className="font-serif text-2xl text-[#1E2A3A]">{rightTitle}</h2>
      </div>
    </div>
  );
}

function SectionDivider({ label, title }: { label: string; title: string }) {
  return (
    <div className="border-b border-[#8B6914]/15 pb-4 mb-8">
      <p className="text-[#8B6914]/55 text-[8px] uppercase tracking-[0.45em] mb-1">{label}</p>
      <h2 className="font-serif text-2xl text-[#1E2A3A]">{title}</h2>
    </div>
  );
}

/** Small muted label badge */
function Badge({ text }: { text: string }) {
  return (
    <span className="text-[8px] uppercase tracking-widest text-[#8B6914]/45 font-sans">
      {text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardProps {
  interpretation: string;
  apiData: any;
  userId: string;
  birthDate: string | null;
  onReset: () => void;
  onRegenerate: () => void;
  isLoading: boolean;
  apiIssues: { endpoint: string; message: string }[];
  onStopAudio: () => void;
  onResumeAudio: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function Dashboard({
  interpretation,
  apiData,
  userId,
  birthDate,
  onReset,
  onRegenerate,
  isLoading,
  apiIssues,
  onStopAudio,
  onResumeAudio,
}: DashboardProps) {
  const { lang, t } = useLanguage();
  const [leviActive, setLeviActive] = useState(false);
  const leviSectionRef = useRef<HTMLDivElement>(null);

  // Load ElevenLabs widget
  useEffect(() => {
    if (!document.querySelector('script[src="https://unpkg.com/@elevenlabs/convai-widget-embed"]')) {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      s.async = true; s.type = "text/javascript";
      document.body.appendChild(s);
    }
  }, []);

  const handleCallLevi = () => {
    onStopAudio();
    setLeviActive(true);
    setTimeout(() => leviSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };
  const handleHangUp = () => { setLeviActive(false); onResumeAudio(); };

  // ── Data extraction ────────────────────────────────────────────────

  const sunSign       = apiData.western?.zodiac_sign      || "";
  const moonSign      = apiData.western?.moon_sign        || "";
  const ascendantSign = apiData.western?.ascendant_sign   || "";
  const zodiacAnimal  = apiData.bazi?.zodiac_sign         || apiData.chinese?.zodiac || "";
  const dayMaster     = apiData.bazi?.day_master          || "—";
  const monthStem     = apiData.bazi?.pillars?.month?.stem || "—";
  const dominantEl    = apiData.wuxing?.dominant_element  || "";

  const sunEmoji  = WESTERN_EMOJIS[sunSign]       || "✨";
  const moonEmoji = WESTERN_EMOJIS[moonSign]      || "✨";
  const ascEmoji  = WESTERN_EMOJIS[ascendantSign] || "✨";

  const yearBranch     = useMemo(() => getBranchByAnimal(zodiacAnimal), [zodiacAnimal]);
  const yearAnimalName = yearBranch ? yearBranch.animal[lang] : zodiacAnimal;
  const dominantWuxing = useMemo(() => getWuxingByKey(dominantEl), [dominantEl]);

  // WuXing element counts
  const wuxingCounts: Record<string, number> = useMemo(
    () => apiData.wuxing?.elements || apiData.wuxing?.element_counts || {},
    [apiData.wuxing],
  );
  const hasWuxingData = useMemo(
    () => Object.values(wuxingCounts).some((v) => Number(v) > 0),
    [wuxingCounts],
  );
  const maxCount = useMemo(
    () => Math.max(...Object.values(wuxingCounts).map(Number), 1),
    [wuxingCounts],
  );

  // Houses
  const houses: Record<string, any> = useMemo(
    () => apiData.western?.houses || {},
    [apiData.western],
  );
  const houseEntries = useMemo(
    () =>
      Object.entries(houses)
        .filter(([, v]) => v != null)
        .sort(([a], [b]) => {
          const na = parseHouseNum(a) ?? 99;
          const nb = parseHouseNum(b) ?? 99;
          return na - nb;
        }),
    [houses],
  );

  const orreryDate = useMemo(() => {
    if (!birthDate) return new Date();
    const d = new Date(birthDate);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [birthDate]);

  const elevenLabsAgentId =
    import.meta.env.VITE_ELEVENLABS_AGENT_ID || "agent_1801kje0zqc8e4b89swbt7wekawv";

  /** First sentence only — for card previews */
  function firstSentence(text: string): string {
    const idx = text.indexOf(".");
    return idx > 0 ? text.slice(0, idx + 1) : text;
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-6xl mx-auto px-4 md:px-6"
    >
      {/* Back */}
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-[#1E2A3A]/40 hover:text-[#8B6914] transition-colors mb-10 text-[10px] uppercase tracking-[0.3em]"
      >
        <ArrowLeft className="w-4 h-4" /> {t("dashboard.startOver")}
      </button>

      {/* Issues banner */}
      {apiIssues.length > 0 && (
        <div className="mb-8 rounded-xl border border-amber-400/40 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t("dashboard.fallbackNote")}
          <ul className="mt-2 list-disc pl-4 space-y-1">
            {apiIssues.map((issue, i) => (
              <li key={i}><span className="font-semibold">{issue.endpoint}</span>: {issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══ PAGE HEADER ═══════════════════════════════════════════════ */}
      <motion.header
        className="mb-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <p className="text-[#8B6914]/55 text-[9px] uppercase tracking-[0.5em] mb-3">
          {t("dashboard.welcome")}
        </p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-4xl md:text-5xl leading-tight text-[#1E2A3A] max-w-xl">
            {t("dashboard.title")}
          </h1>
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="mt-1 shrink-0 p-3 text-[#8B6914]/45 hover:text-[#8B6914] hover:bg-[#8B6914]/10 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#8B6914]/20"
            title="Regenerate"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="mt-4 italic text-[#1E2A3A]/38 font-serif text-base md:max-w-xl leading-relaxed">
          {t("dashboard.quote")}
        </p>
      </motion.header>

      {/* ═══ 3D ORRERY ════════════════════════════════════════════════ */}
      <motion.div className="mb-14" {...fadeIn(0.1)}>
        <BirthChartOrrery birthDate={orreryDate} height="460px" />
      </motion.div>

      {/* ═══ PRIMARY GRID: Western (left) | BaZi/WuXing (right) ═══════ */}
      <motion.div className="mb-12" {...fadeIn(0.2)}>
        <DualSectionHeader
          leftLabel={t("dashboard.western.sectionLabel")}
          leftTitle={t("dashboard.western.sectionTitle")}
          rightLabel={t("dashboard.bazi.sectionLabel")}
          rightTitle={t("dashboard.bazi.sectionTitle")}
        />

        <div className="morning-grid-2">

          {/* LEFT — Western */}
          <div className="flex flex-col gap-5">

            {/* Sun Sign */}
            <div className="morning-card p-7 flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  >
                    <Sun className="text-[#C8930A] w-5 h-5" />
                  </motion.div>
                  <Badge text={t("dashboard.western.sunLabel")} />
                </div>
                <h3 className="font-serif text-xl text-[#1E2A3A] mb-1">
                  {t("dashboard.western.sunTitle")}
                </h3>
                <p className="text-xs text-[#1E2A3A]/45 tracking-wide">
                  {t("dashboard.western.sunDesc")}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-[#8B6914]/10 pt-4 mt-4">
                <span className="text-xl font-light flex items-center gap-3 text-[#1E2A3A]">
                  <span className="text-[#C8930A] text-2xl">{sunEmoji}</span>
                  {sunSign || "—"}
                </span>
                <Badge text={t("dashboard.western.sunSignBadge")} />
              </div>
            </div>

            {/* Moon Sign */}
            <div className="morning-card p-7 flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    animate={{ rotate: [-12, 12, -12] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Moon className="text-[#1A6BB5] w-5 h-5" />
                  </motion.div>
                  <Badge text={t("dashboard.western.moonLabel")} />
                </div>
                <h3 className="font-serif text-xl text-[#1E2A3A] mb-1">
                  {t("dashboard.western.moonTitle")}
                </h3>
                <p className="text-xs text-[#1E2A3A]/45 tracking-wide">
                  {t("dashboard.western.moonDesc")}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-[#8B6914]/10 pt-4 mt-4">
                <span className="text-xl font-light flex items-center gap-3 text-[#1E2A3A]">
                  <span className="text-[#1A6BB5] text-2xl">{moonEmoji}</span>
                  {moonSign || "—"}
                </span>
                <Badge text={t("dashboard.western.moonSignBadge")} />
              </div>
            </div>

            {/* Ascendant */}
            <div className="morning-card p-7 flex flex-col justify-between min-h-[180px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 12, -12, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowUp className="text-[#3D8B37] w-5 h-5" />
                  </motion.div>
                  <Badge text={t("dashboard.western.ascLabel")} />
                </div>
                <h3 className="font-serif text-xl text-[#1E2A3A] mb-1">
                  {t("dashboard.western.ascTitle")}
                </h3>
                <p className="text-xs text-[#1E2A3A]/45 tracking-wide">
                  {t("dashboard.western.ascDesc")}
                </p>
              </div>
              <div className="flex justify-between items-end border-t border-[#8B6914]/10 pt-4 mt-4">
                <span className="text-xl font-light flex items-center gap-3 text-[#1E2A3A]">
                  <span className="text-[#3D8B37] text-2xl">{ascEmoji}</span>
                  {ascendantSign || "—"}
                </span>
                <Badge text={t("dashboard.western.ascBadge")} />
              </div>
            </div>
          </div>

          {/* RIGHT — BaZi / WuXing */}
          <div className="flex flex-col gap-5">

            {/* Year Animal */}
            <div className="morning-card p-7 flex flex-col justify-between min-h-[200px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl leading-none">{yearBranch?.emoji || "✨"}</span>
                  <Badge text={t("dashboard.bazi.zodiacLabel")} />
                </div>
                <h3 className="font-serif text-xl text-[#1E2A3A] mb-2">
                  {t("dashboard.bazi.yearAnimalTitle")}
                </h3>
                {yearBranch && (
                  <p className="text-xs text-[#1E2A3A]/45 leading-relaxed line-clamp-2">
                    {firstSentence(yearBranch.description[lang])}
                  </p>
                )}
              </div>
              <div className="flex justify-between items-end border-t border-[#8B6914]/10 pt-4 mt-4">
                <div className="flex items-center gap-3">
                  {yearBranch && (
                    <span className="font-serif text-2xl text-[#8B6914] leading-none">
                      {yearBranch.chinese}
                    </span>
                  )}
                  <div>
                    <div className="text-lg font-light text-[#1E2A3A]">{yearAnimalName || "—"}</div>
                    {yearBranch && (
                      <div className="text-[10px] text-[#1E2A3A]/35 tracking-wide">
                        {yearBranch.branch} · {yearBranch.element}
                      </div>
                    )}
                  </div>
                </div>
                <Badge text={t("dashboard.bazi.yearAnimalBadge")} />
              </div>
            </div>

            {/* Dominant WuXing Element */}
            <div
              className="morning-card p-7 flex flex-col gap-4"
              style={dominantWuxing ? {
                borderLeftColor: dominantWuxing.color + "55",
                borderLeftWidth: "3px",
                borderLeftStyle: "solid",
              } : undefined}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-[#1E2A3A]">
                  {t("dashboard.bazi.dominantElementTitle")}
                </h3>
                <Badge text={t("dashboard.bazi.essenceLabel")} />
              </div>

              {dominantWuxing ? (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-serif leading-none select-none" style={{ color: dominantWuxing.color }}>
                      {dominantWuxing.chinese}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xl font-serif text-[#1E2A3A]">{dominantWuxing.name[lang]}</div>
                      <div className="text-[11px] text-[#1E2A3A]/35 tracking-wide mt-0.5">{dominantWuxing.pinyin}</div>
                    </div>
                    <span className="text-2xl leading-none select-none shrink-0">{dominantWuxing.emoji}</span>
                  </div>
                  <p className="text-xs text-[#1E2A3A]/55 leading-relaxed">
                    {firstSentence(dominantWuxing.description[lang])}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 text-[10px] text-[#1E2A3A]/35 pt-3 border-t border-[#8B6914]/10">
                    <span>↗ {dominantWuxing.direction[lang]}</span>
                    <span>◆ {dominantWuxing.season[lang]}</span>
                  </div>
                </>
              ) : (
                <div className="font-serif text-2xl text-[#1E2A3A]">{dominantEl || "—"}</div>
              )}
            </div>

            {/* Day Master */}
            <div className="morning-card p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="text-[#8B6914] w-4 h-4 shrink-0" />
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#8B6914]/65">
                    {t("dashboard.bazi.dayMasterTitle")}
                  </h3>
                </div>
                <Badge text={t("dashboard.bazi.vitalityLabel")} />
              </div>
              <div className="font-serif text-2xl text-[#1E2A3A]">{dayMaster}</div>
              <p className="text-xs text-[#1E2A3A]/45 leading-relaxed">
                {t("dashboard.bazi.dayMasterDesc")}
              </p>
            </div>

            {/* Month Stem */}
            <div className="morning-card p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#8B6914]/65">
                  {t("dashboard.bazi.monthStemTitle")}
                </h3>
                <Badge text={t("dashboard.bazi.monthStemBadge")} />
              </div>
              <div className="font-serif text-2xl text-[#1E2A3A]">{monthStem}</div>
              <p className="text-xs text-[#1E2A3A]/45 leading-relaxed">
                {t("dashboard.bazi.monthStemDesc")}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ BAZI FOUR PILLARS ════════════════════════════════════════ */}
      {apiData.bazi?.pillars && (
        <motion.div className="mb-10" {...fadeIn(0.3)}>
          <SectionDivider label="BaZi 八字" title={t("dashboard.pillars.sectionTitle")} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(apiData.bazi.pillars).map(([key, val]: [string, any]) => (
              <div key={key} className="morning-stele group cursor-default">
                <div className="text-[8px] uppercase tracking-[0.3em] text-[#8B6914]/55 mb-5 group-hover:text-[#8B6914] transition-colors">
                  {t(PILLAR_KEYS[key] ?? `dashboard.pillars.${key}`)}
                </div>
                <div className="font-serif text-2xl mb-1 text-[#1E2A3A]">{val.stem || "—"}</div>
                <div className="text-[10px] text-[#1E2A3A]/35 uppercase tracking-widest">{val.branch || ""}</div>
                {val.animal && (
                  <div className="text-[9px] text-[#8B6914]/45 mt-1.5 tracking-wide">{val.animal}</div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══ WUXING BALANCE ═══════════════════════════════════════════ */}
      <motion.div className="mb-10" {...fadeIn(0.35)}>
        <SectionDivider label="WuXing 五行" title={t("dashboard.wuxing.sectionTitle")} />
        <p className="text-xs text-[#1E2A3A]/45 mb-6 leading-relaxed max-w-2xl">
          {t("dashboard.wuxing.sectionDesc")}
        </p>

        {/* Compact horizontal bar chart inside a single card */}
        <div className="morning-card p-6 md:p-8">
          <div className="space-y-4">
            {WUXING_ELEMENTS.map((el) => {
              const count = Number(wuxingCounts[el.key] ?? wuxingCounts[el.name.de] ?? 0);
              const pct   = hasWuxingData ? (count / maxCount) * 100 : 0;
              const isDom = el.key === dominantEl || el.name.de === dominantEl;

              return (
                <div key={el.key} className="flex items-center gap-4">
                  {/* Identity: Chinese char + name */}
                  <div className="w-28 md:w-36 shrink-0 flex items-center gap-2.5">
                    <span
                      className="text-2xl font-serif leading-none select-none"
                      style={{ color: el.color }}
                    >
                      {el.chinese}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#1E2A3A] truncate">{el.name[lang]}</div>
                      <div className="text-[10px] text-[#1E2A3A]/35">{el.pinyin}</div>
                    </div>
                  </div>

                  {/* Bar track */}
                  <div className="flex-1 wuxing-bar-track">
                    {hasWuxingData ? (
                      <motion.div
                        className="wuxing-bar-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
                        transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
                        style={{ backgroundColor: el.color }}
                      />
                    ) : (
                      /* No data: subtle placeholder */
                      <div className="h-full rounded-full" style={{ backgroundColor: el.color + "20", width: "100%" }} />
                    )}
                  </div>

                  {/* Count or dominant star */}
                  <div className="w-8 shrink-0 text-right">
                    {isDom ? (
                      <span className="text-sm" style={{ color: el.color }}>★</span>
                    ) : hasWuxingData && count > 0 ? (
                      <span className="text-[10px] text-[#1E2A3A]/40 font-mono">{count}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend when no data */}
          {!hasWuxingData && (
            <p className="mt-5 text-[10px] text-[#1E2A3A]/35 italic text-center">
              {lang === "de"
                ? "Elementgewichtung wird bei Verfügbarkeit der API-Daten angezeigt."
                : "Element weighting shown when API data is available."}
            </p>
          )}
        </div>
      </motion.div>

      {/* ═══ WESTERN HOUSES ══════════════════════════════════════════ */}
      {houseEntries.length > 0 && (
        <motion.div className="mb-10" {...fadeIn(0.4)}>
          <SectionDivider
            label={t("dashboard.western.sectionLabel")}
            title={t("dashboard.houses.sectionTitle")}
          />
          <p className="text-xs text-[#1E2A3A]/45 mb-6 leading-relaxed max-w-2xl">
            {t("dashboard.houses.sectionDesc")}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {houseEntries.map(([houseKey, val]) => {
              const sign    = resolveSign(val);
              const emoji   = WESTERN_EMOJIS[sign] || "";
              const num     = parseHouseNum(houseKey);
              const roman   = num !== null ? ROMAN[num] : houseKey;
              const meaning = num !== null ? HOUSE_MEANINGS[num] : null;

              return (
                <div key={houseKey} className="morning-card p-5">
                  {/* House number + name */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="font-serif text-sm text-[#8B6914] font-medium leading-none">
                      {roman}
                    </span>
                    {meaning && (
                      <span className="text-[10px] text-[#1E2A3A]/45 tracking-wide truncate">
                        {meaning.name[lang]}
                      </span>
                    )}
                  </div>

                  {/* Sign */}
                  <div className="font-serif text-lg text-[#1E2A3A] flex items-center gap-2 mb-2">
                    <span className="text-[#8B6914]/80">{emoji}</span>
                    {sign || "—"}
                  </div>

                  {/* Keyword */}
                  {meaning && (
                    <p className="text-[10px] text-[#1E2A3A]/38 leading-relaxed">
                      {meaning.keyword[lang]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ═══ INTERPRETATION + LEVI ═══════════════════════════════════ */}
      <motion.div
        className="grid md:grid-cols-3 gap-8 mb-16"
        {...fadeIn(0.45)}
      >
        {/* AI Interpretation — 2/3 width */}
        <div className="morning-card p-8 md:col-span-2">
          <div className="flex items-center gap-4 mb-5">
            <span className="h-[1px] w-10 bg-[#8B6914]/20" />
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#8B6914]/55">
              {t("dashboard.interpretation.sectionLabel")}
            </span>
          </div>
          <h3 className="font-serif text-2xl text-[#1E2A3A] mb-5">
            {t("dashboard.interpretation.sectionTitle")}
          </h3>
          <div className="
            text-[13px] text-[#1E2A3A]/60 leading-relaxed
            prose prose-sm max-w-none
            prose-headings:text-[#1E2A3A] prose-headings:font-serif
            prose-p:text-[#1E2A3A]/60 prose-strong:text-[#1E2A3A]/80
            prose-a:text-[#8B6914] prose-a:no-underline hover:prose-a:underline
            prose-hr:border-[#8B6914]/15
          ">
            <ReactMarkdown>{interpretation}</ReactMarkdown>
          </div>
        </div>

        {/* Levi — 1/3 width */}
        <div ref={leviSectionRef} className="morning-card p-7 flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="relative mt-1.5 shrink-0">
              <div className={`w-2 h-2 rounded-full breathing ${
                leviActive
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                  : "bg-[#8B6914] shadow-[0_0_8px_rgba(139,105,20,0.55)]"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B6914] mb-1.5 font-semibold">
                {leviActive ? t("dashboard.levi.active") : t("dashboard.levi.ready")}
              </p>
              <p className="text-[11px] text-[#1E2A3A]/45 italic leading-relaxed">
                {leviActive ? t("dashboard.levi.activeDesc") : t("dashboard.levi.readyDesc")}
              </p>
            </div>
          </div>

          <button
            onClick={leviActive ? handleHangUp : handleCallLevi}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] font-semibold transition-all ${
              leviActive
                ? "bg-red-50 border border-red-300 text-red-600 hover:bg-red-100"
                : "bg-[#8B6914]/10 border border-[#8B6914]/30 text-[#8B6914] hover:bg-[#8B6914]/[0.18]"
            }`}
          >
            {leviActive
              ? <><PhoneOff className="w-4 h-4" /> {t("dashboard.levi.hangUpBtn")}</>
              : <><Phone className="w-4 h-4" /> {t("dashboard.levi.callBtn")}</>}
          </button>

          <AnimatePresence>
            {leviActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative z-20 w-full flex justify-center overflow-hidden"
              >
                {/* @ts-ignore */}
                <elevenlabs-convai
                  agent-id={elevenLabsAgentId}
                  dynamic-variables={JSON.stringify({
                    user_id: userId,
                    chart_context: `${sunSign} / ${zodiacAnimal} / ${dominantEl}`,
                  })}
                >
                {/* @ts-ignore */}
                </elevenlabs-convai>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

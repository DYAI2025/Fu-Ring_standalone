import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";

export function AuthGate() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } =
      mode === "login"
        ? await signIn(email, password)
        : await signUp(email, password);

    setLoading(false);

    if (authError) {
      setError(authError);
    } else if (mode === "signup") {
      setSignupSuccess(true);
    }
  };

  if (signupSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-auto text-center"
      >
        <div className="glass-card p-10 space-y-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-gold/20 flex items-center justify-center text-gold text-xl">
            ✓
          </div>
          <h2 className="font-serif text-2xl">Konto erstellt</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Bitte bestätige deine E-Mail-Adresse, dann logge dich ein.
          </p>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setMode("login");
            }}
            className="w-full py-3 rounded-xl bg-gold/10 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.3em] hover:bg-gold/20 transition-colors"
          >
            Zum Login
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-sm mx-auto"
    >
      <div className="text-center mb-10">
        <p className="text-gold/60 text-[9px] uppercase tracking-[0.5em] mb-4">
          Zugang
        </p>
        <h2 className="font-serif text-3xl mb-2">
          {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
        </h2>
        <p className="text-white/40 text-sm italic font-serif">
          {mode === "login"
            ? "Melde dich an, um dein Chart zu speichern."
            : "Registriere dich, um dein persönliches Profil zu erstellen."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        {error && (
          <div className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-[0.3em] text-gold/60 block">
            E-Mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
            placeholder="deine@email.de"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-[0.3em] text-gold/60 block">
            Passwort
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-gold/30 transition-colors"
            placeholder="Mindestens 6 Zeichen"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gold/20 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.3em] font-semibold hover:bg-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "..."
            : mode === "login"
              ? "Einloggen"
              : "Registrieren"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-white/40 text-xs hover:text-gold/80 transition-colors"
          >
            {mode === "login"
              ? "Noch kein Konto? Registrieren"
              : "Bereits registriert? Einloggen"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

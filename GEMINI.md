# Astro-Noctum (Bazodiac) — Project Context

## Project Overview
Astro-Noctum (Bazodiac) is a high-end fusion astrology platform combining Western Astrology, Chinese BaZi (Four Pillars of Destiny), and Wu-Xing (Five Elements). The application offers personalized horoscopes, 3D solar system visualizations, and AI-powered voice agents.

### Core Architecture
- **Frontend:** React 19 SPA with TypeScript, Vite 6, and Tailwind CSS v4.
- **Backend:** Express (`server.mjs`) serving as a secure proxy for API keys and upstream services.
- **Routing:** React Router handles navigation (e.g., `/`, `/fu-ring`).
- **Data Persistence:** Supabase (Auth + Postgres) for user profiles and natal charts.
- **AI Integration:** 
  - **Gemini 2.0 Flash:** Server-side horoscope text generation (`/api/interpret`).
  - **ElevenLabs:** "Levi Bazi" voice agent integration.
- **Upstream Logic:** BAFE API handles the complex astronomical and BaZi calculations.

## Building and Running

### Development
1. **Prerequisites:** Node.js **20.19+** (defined in `.nvmrc`).
2. **Environment:** Copy `.env.example` to `.env.local` and fill in secrets.
3. **Frontend:** `npm run dev` (starts Vite on port 3000).
4. **API Proxy:** `PORT=3001 node server.mjs` (starts Express on port 3001).
   - *Note:* Vite proxies `/api` requests to port 3001 in development.

### Production
- **Build:** `npm run build` (outputs to `dist/`).
- **Start:** `npm run start` (starts Express server which serves `dist/`).
- **Lint:** `npm run lint` (runs `tsc --noEmit` for type checking).

## Development Conventions

### API Mapping (BAFE)
Upstream BAFE responses use German keys (e.g., `stamm`, `zweig`). The frontend transforms these into English keys (e.g., `stem`, `branch`) in `src/services/api.ts` before consumption.
- **Reference:** See `src/types/bafe.ts` for `BafePillarRaw` vs. `MappedPillar`.

### Styling & Assets
- **Tailwind v4:** Uses custom theme tokens in `src/index.css` (e.g., `--color-obsidian`, `--color-gold`).
- **Public Directory:** Configured to `media/` in `vite.config.ts`. Static assets should be placed there.
- **3D Visualization:** Uses Three.js with Keplerian orbital mechanics in `src/components/BirthChartOrrery.tsx`.

### Path Aliases
- `@/*` maps to the **project root** (e.g., `@/src/services/api`).

### Sub-Module Contexts
Specific integration details for sub-components can be found in:
- `features/plan/LeanDeep-annotator-main/GEMINI.md` (Semantic marker system).
- `features/plan/QuizzMe-main/GEMINI.md` (Quiz engine architecture).

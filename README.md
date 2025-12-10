# Pokédex React

Modern Pokédex built with React + Vite + Tailwind, featuring rich filters, battle simulation, Firebase caching, and local favorites.

## Web
<img width="1903" height="875" alt="image" src="https://github.com/user-attachments/assets/e9ff1b6b-ba0a-4f09-9c02-e26fbe0449f8" />

## Mobile
<img width="383" height="851" alt="image" src="https://github.com/user-attachments/assets/7846f545-4420-44a4-b1f8-6e92ca9b03e1" />


## Features
- 🔍 Search by name, number, type, or image (upload) across all generations (1–9).
- 🎚️ Filters for Pokémon types and generations with colorful badges per generation.
- 🧭 Pagination limited to 151 per page to keep browsing fast.
- 🖼️ Liquid-glass style cards with hover interactions, type icons, and generation badges.
- ❤️ Favorites with heart toggle and list view sorted by Pokédex number (stored locally).
- ⚔️ Battle simulator with type chart, STAB, weather effects, starter selection (speed/left/right/random), and recent move log with multipliers.
- 🌗 Light/Dark theme toggle stored locally.
- 🔥 Types page includes legendary/mythical highlights; Generations page lists regional batches.
- ☁️ Firebase Realtime Database caching for Pokémon data to speed up subsequent loads.
- 🖥️ Responsive layout, 4 cards per row on desktop, centered and padded; keeps card sizes intact on mobile.

## Getting Started

### Prerequisites
- Node.js 18+ recommended
- npm (bundled with Node)

### Install dependencies
```bash
npm install
```

### Run locally
```bash
npm run dev
```
Then open the URL shown in the terminal (default: `http://localhost:5173`).

### Build for production
```bash
npm run build
```

### Preview the production build
```bash
npm run preview
```

## Configuration
- Firebase config lives in `src/lib/firebase.js` (uses Realtime Database). Update with your project keys if needed.
- Path aliases are configured via `jsconfig.json` (`@/*` points to `src`).

## Project Structure
- `src/components/` – UI pieces (Header, filters, badges, cards, theme toggle, etc.).
- `src/pages/` – Home, Types, Generations, Battle, Favorites, Detail.
- `src/hooks/` – Shared favorites store.
- `src/lib/` – Firebase setup and caching helpers.
- `public/` – Static assets.

## Scripts
- `npm run dev` – Start Vite dev server.
- `npm run build` – Build optimized production bundle.
- `npm run preview` – Preview the production build locally.

## ☕️ Buying me a coffee

If you enjoy this project and would like to support its development, consider buying me a coffee!  
Every coffee helps turn ideas into code, games, and new features. 💛

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/amorimivan1)

---

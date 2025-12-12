# Pokedex React

Pokedex built with React + Vite + Tailwind, featuring advanced filters, image search, PvE/PvP battle modes, and Firebase caching for fast loading.

## Web

<img width="1903" height="875" alt="image" src="https://github.com/user-attachments/assets/e9ff1b6b-ba0a-4f09-9c02-e26fbe0449f8" />

## Mobile

<img width="383" height="851" alt="image" src="https://github.com/user-attachments/assets/7846f545-4420-44a4-b1f8-6e92ca9b03e1" />

## Game updates

* Image search: upload or camera using TensorFlow/MobileNet with similarity matching; redirects directly to the found Pokémon.
* Revamped Battle Mode: fast PvE and online PvP with damage calculation (type chart, STAB, and weather bonuses) and battle logs.
* Online PvP: Google login, real-time presence, player list, invites, rematch, region-based matchmaking, and Classic or Card modes (best of 3/5) with stat comparison.
* Pokedex cache in Firebase Realtime Database to load 1,000+ Pokémon without waiting for the API on every launch.
* Persistent favorites stored locally and synced with your account when logged in.
* Light/dark theme and fixed bottom navigation on mobile.

## Features

* Search by name, number, or type; shortcuts to favorites by typing "fav" or "lik".
* Filter by type and generation with badges, plus pagination (151 per page).
* Image search with camera/upload (TensorFlow) integrated into navigation.
* Glassmorphism-style cards with type icons and generation badges.
* Detail page with stats, abilities, and initial moves.
* Types pages (with counters + legendary/mythical) and Regions/Generations pages.
* Favorites toggle on cards (local + Firebase).
* Light/dark theme remembered on the device.

## Requirements

* Node.js 18+
* npm

## Installation

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Open `http://localhost:5173`.

## Production build

```bash
npm run build
```

## Build preview

```bash
npm run preview
```

## Firebase setup

1. Create a project in the Firebase Console, add a Web app, and copy the credentials.
2. Enable Authentication > Google and Realtime Database (Production mode; create rules as needed).
3. Replace the `firebaseConfig` object in `src/lib/firebase.js` with your project data:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "...",
};
```

4. Structures used in Realtime Database:

   * `pokemon/` for Pokedex cache.
   * `favorites/{uid}` for synced favorites.
   * `presence/`, `invites/`, and `rooms/` for PvP lobby and matches.

## Structure

* `src/components/` - Header, filters, cards, image search, etc.
* `src/pages/` - Home, Types, Generations, Battle, Favorites, Detail.
* `src/hooks/` - Authentication and favorites store.
* `src/lib/` - Firebase and Pokedex cache.
* `public/` - Static assets.

## Scripts

* `npm run dev` - Development.
* `npm run build` - Production build.
* `npm run preview` - Build preview.

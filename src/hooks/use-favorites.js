import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pokedex:favorites";

const loadFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

let favoritesStore = loadFromStorage();
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const toggleFavoriteStore = (pokemon) => {
  const exists = favoritesStore.some((f) => f.id === pokemon.id);
  if (exists) {
    favoritesStore = favoritesStore.filter((f) => f.id !== pokemon.id);
  } else {
    favoritesStore = [
      ...favoritesStore,
      {
        id: pokemon.id,
        name: pokemon.name,
        types: pokemon.types,
        sprites: pokemon.sprites,
      },
    ];
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritesStore));
  }
  emitChange();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => favoritesStore;

const getServerSnapshot = () => [];

export const useFavorites = () => {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isFavorite = (id) => favorites.some((f) => f.id === id);

  const toggleFavorite = (pokemon) => toggleFavoriteStore(pokemon);

  return { favorites, isFavorite, toggleFavorite };
};

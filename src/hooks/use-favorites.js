import { useCallback, useEffect } from "react";
import { useSyncExternalStore } from "react";
import { db } from "@/lib/firebase";
import { onValue, ref, set } from "firebase/database";
import { useAuth } from "@/hooks/useAuth";

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
let currentUserId = null;
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const toMinimalPokemon = (pokemon) => ({
  id: pokemon.id,
  name: pokemon.name,
  types: pokemon.types,
  sprites: pokemon.sprites,
});

const setStore = (list) => {
  favoritesStore = list;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  emitChange();
};

const pushToFirebase = async (uid, list) => {
  const payload = list.reduce((acc, p) => {
    acc[p.id] = toMinimalPokemon(p);
    return acc;
  }, {});
  await set(ref(db, `favorites/${uid}`), payload);
};

export const toggleFavoriteStore = async (pokemon) => {
  const exists = favoritesStore.some((f) => f.id === pokemon.id);
  const updated = exists
    ? favoritesStore.filter((f) => f.id !== pokemon.id)
    : [...favoritesStore, toMinimalPokemon(pokemon)];
  setStore(updated);
  if (currentUserId) {
    try {
      await pushToFirebase(currentUserId, updated);
    } catch (err) {
      console.error("Failed to sync favorite to Firebase", err);
    }
  }
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => favoritesStore;

const getServerSnapshot = () => [];

export const useFavorites = () => {
  const { user } = useAuth();
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!user) {
      currentUserId = null;
      setStore(loadFromStorage());
      return;
    }

    currentUserId = user.uid;
    const userRef = ref(db, `favorites/${user.uid}`);

    const unsub = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const list = Object.values(snap.val());
        setStore(list);
      } else {
        const local = loadFromStorage();
        setStore(local);
        if (local.length) {
          pushToFirebase(user.uid, local).catch((err) =>
            console.error("Failed to backfill favorites to Firebase", err)
          );
        }
      }
    });

    return () => {
      unsub();
    };
  }, [user]);

  const isFavorite = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (pokemon) => {
      toggleFavoriteStore(pokemon);
    },
    []
  );

  return { favorites, isFavorite, toggleFavorite };
};

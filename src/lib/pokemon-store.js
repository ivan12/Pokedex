import { db } from "@/lib/firebase";
import { get, ref, set } from "firebase/database";

const POKEMON_PATH = "pokemon";

const mapToMinimalPokemon = (p) => ({
  id: p.id,
  name: p.name,
  types: p.types,
  sprites: {
    front_default: p.sprites?.front_default ?? "",
    other: {
      "official-artwork": {
        front_default:
          p.sprites?.other?.["official-artwork"]?.front_default ?? "",
      },
    },
  },
});

export const fetchPokemonFromDb = async () => {
  const snapshot = await get(ref(db, POKEMON_PATH));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.values(data);
};

export const savePokemonToDb = async (pokemonList) => {
  const payload = pokemonList.reduce((acc, p) => {
    acc[p.id] = mapToMinimalPokemon(p);
    return acc;
  }, {});

  await set(ref(db, POKEMON_PATH), payload);
};

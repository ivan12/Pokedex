import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import PokemonCard from '@/components/PokemonCard';
import { Badge } from '@/components/ui/badge';
import TypeBadge from '@/components/TypeBadge';
import {
  Shield,
  Flame,
  Droplets,
  Zap,
  Leaf,
  Snowflake,
  Sword,
  Skull,
  Mountain,
  Wind,
  Brain,
  Bug,
  Gem,
  Ghost,
  Sparkles,
  Moon,
  Cog,
  Star,
} from 'lucide-react';

const TYPE_META = {
  normal: { label: 'Normal', icon: Shield },
  fire: { label: 'Fire', icon: Flame },
  water: { label: 'Water', icon: Droplets },
  electric: { label: 'Electric', icon: Zap },
  grass: { label: 'Grass', icon: Leaf },
  ice: { label: 'Ice', icon: Snowflake },
  fighting: { label: 'Fighting', icon: Sword },
  poison: { label: 'Poison', icon: Skull },
  ground: { label: 'Ground', icon: Mountain },
  flying: { label: 'Flying', icon: Wind },
  psychic: { label: 'Psychic', icon: Brain },
  bug: { label: 'Bug', icon: Bug },
  rock: { label: 'Rock', icon: Gem },
  ghost: { label: 'Ghost', icon: Ghost },
  dragon: { label: 'Dragon', icon: Sparkles },
  dark: { label: 'Dark', icon: Moon },
  steel: { label: 'Steel', icon: Cog },
  fairy: { label: 'Fairy', icon: Star },
};

const CATEGORY_META = {
  legendary: { label: 'Legendary', icon: Sparkles, background: 'linear-gradient(155deg, rgba(14,165,233,0.9), rgba(139,92,246,0.75))' },
  mythical: { label: 'Mythical', icon: Star, background: 'linear-gradient(155deg, rgba(236,72,153,0.9), rgba(249,115,22,0.75))' },
};

const POKEMON_TYPES = Object.entries(TYPE_META).map(([value, meta]) => ({
  value,
  label: meta.label,
  count: 0,
}));

const TOTAL_POKEMON = 1010;
const FETCH_CHUNK_SIZE = 40;

const TypesPage = () => {
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState([]);
  const [selectedType, setSelectedType] = useState('normal');
  const [filteredPokemon, setFilteredPokemon] = useState([]);
  const [typeCounts, setTypeCounts] = useState(POKEMON_TYPES);
  const [categoryCounts, setCategoryCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon();
  }, []);

  useEffect(() => {
    if (selectedType) {
      let filtered;
      if (selectedType === 'legendary') {
        filtered = pokemon.filter((p) => p.isLegendary);
      } else if (selectedType === 'mythical') {
        filtered = pokemon.filter((p) => p.isMythical);
      } else {
        filtered = pokemon.filter((p) =>
          p.types.some((t) => t.type.name === selectedType)
        );
      }
      setFilteredPokemon(filtered);
    }
  }, [selectedType, pokemon]);

  const fetchPokemon = async () => {
    try {
      setLoading(true);
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`);
      const data = await response.json();

      const detailedPokemon = [];
      for (let i = 0; i < data.results.length; i += FETCH_CHUNK_SIZE) {
        const chunk = data.results.slice(i, i + FETCH_CHUNK_SIZE);
        const chunkData = await Promise.all(
          chunk.map(async (p) => {
            const res = await fetch(p.url);
            const pokeData = await res.json();
            const speciesRes = await fetch(pokeData.species.url);
            const speciesData = await speciesRes.json();
            return {
              ...pokeData,
              isLegendary: speciesData.is_legendary,
              isMythical: speciesData.is_mythical,
            };
          })
        );
        detailedPokemon.push(...chunkData);
      }

      setPokemon(detailedPokemon);

      const counts = POKEMON_TYPES.map((type) => {
        const count = detailedPokemon.filter((p) =>
          p.types.some((t) => t.type.name === type.value)
        ).length;
        return { ...type, count };
      });
      setTypeCounts(counts);

      const legCount = detailedPokemon.filter((p) => p.isLegendary).length;
      const mythCount = detailedPokemon.filter((p) => p.isMythical).length;
      setCategoryCounts([
        { value: 'legendary', label: 'Legendary', count: legCount },
        { value: 'mythical', label: 'Mythical', count: mythCount },
      ]);
    } catch (error) {
      console.error('Error fetching Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const cardEntries = [...typeCounts, ...categoryCounts.filter((c) => c.count > 0)];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gradient">
            Pokémon Types
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Browse Pokémon by type and discover their traits
          </p>

          {/* Type Selector */}
          <div className="flex justify-center mb-8">
            <select
              value={selectedType || 'normal'}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-background shadow-sm text-sm md:text-base min-w-[240px] capitalize"
            >
              <optgroup label="Types">
                {POKEMON_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </optgroup>
              {categoryCounts.length > 0 && (
                <optgroup label="Categories">
                  {categoryCounts.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Current Selection Info */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <TypeBadge type={selectedType || 'normal'} />
                {selectedType && (
                  <Badge variant="secondary" className="text-base">
                    {filteredPokemon.length} Pokémon
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pokemon Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4 animate-slide-up">
              {filteredPokemon.map((p) => (
                <PokemonCard key={p.id} pokemon={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypesPage;

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
  const [selectedType, setSelectedType] = useState(null);
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
          
          {/* Type Grid */}
          {!selectedType && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
              {cardEntries.map((type) => {
                const meta = TYPE_META[type.value] ?? CATEGORY_META[type.value];
                const Icon = meta.icon;
                const background = meta.background ?? `linear-gradient(155deg, hsl(var(--type-${type.value}) / 0.9), hsl(var(--type-${type.value}) / 0.65))`;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl border border-white/20 text-left backdrop-blur-lg"
                    style={{
                      background,
                    }}
                  >
                    <div className="absolute inset-0 opacity-25 bg-white mix-blend-overlay" />
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-3xl transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-1" />
                    <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-black/10 blur-2xl" />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/12 via-transparent to-white/5 opacity-70" />
                    <div className="absolute inset-x-0 -top-12 h-24 bg-white/10 blur-2xl group-hover:opacity-80 transition-opacity duration-300" />
                    
                    <div className="relative flex flex-col gap-4 min-h-[170px]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform duration-300">
                          <Icon className="h-6 w-6 drop-shadow-sm" />
                        </div>
                        <Badge variant="secondary" className="bg-white/25 text-white border-white/40 backdrop-blur-sm shadow-sm">
                          {type.count} mons
                        </Badge>
                      </div>

                      <div className="text-white space-y-1">
                        <div className="text-2xl font-extrabold drop-shadow-sm tracking-tight">
                          {meta.label}
                        </div>
                        <div className="text-sm text-white/85 font-medium">
                          Click to view Pokémon of this type
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          
          {/* Selected Type View */}
          {selectedType && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TypeBadge type={selectedType} />
                  <span className="text-2xl font-bold capitalize">
                    {typeCounts.find((t) => t.value === selectedType)?.label}
                  </span>
                  <Badge variant="secondary">{filteredPokemon.length} Pokémon</Badge>
                </div>
                <button
                  onClick={() => setSelectedType(null)}
                  className="text-primary hover:underline font-semibold"
                >
                  View all types
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
                {filteredPokemon.map((p) => (
                  <PokemonCard key={p.id} pokemon={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypesPage;

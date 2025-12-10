import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PokemonCard from '@/components/PokemonCard';
import { Badge } from '@/components/ui/badge';

const GENERATIONS = [
  { id: 1, name: 'Generation I', region: 'Kanto', start: 1, end: 151, color: 'hsl(0 85% 55%)' },
  { id: 2, name: 'Generation II', region: 'Johto', start: 152, end: 251, color: 'hsl(48 100% 50%)' },
  { id: 3, name: 'Generation III', region: 'Hoenn', start: 252, end: 386, color: 'hsl(211 85% 55%)' },
  { id: 4, name: 'Generation IV', region: 'Sinnoh', start: 387, end: 493, color: 'hsl(120 45% 45%)' },
  { id: 5, name: 'Generation V', region: 'Unova', start: 494, end: 649, color: 'hsl(300 55% 50%)' },
  { id: 6, name: 'Generation VI', region: 'Kalos', start: 650, end: 721, color: 'hsl(330 70% 75%)' }
];

const GenerationsPage = () => {
  const [pokemon, setPokemon] = useState([]);
  const [selectedGen, setSelectedGen] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon();
  }, [selectedGen]);

  const fetchPokemon = async () => {
    try {
      setLoading(true);
      const gen = GENERATIONS.find((g) => g.id === selectedGen);
      const limit = gen.end - gen.start + 1;
      const offset = gen.start - 1;
      
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
      const data = await response.json();
      
      const detailedPokemon = await Promise.all(
        data.results.map(async (p) => {
          const res = await fetch(p.url);
          return res.json();
        })
      );
      
      setPokemon(detailedPokemon);
    } catch (error) {
      console.error('Error fetching Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentGen = GENERATIONS.find((g) => g.id === selectedGen);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gradient">
            Pokémon Generations
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Browse Pokémon by generation and region
          </p>
          
          {/* Generation Selector */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {GENERATIONS.map((gen) => (
              <button
                key={gen.id}
                onClick={() => setSelectedGen(gen.id)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
                  selectedGen === gen.id
                    ? 'shadow-lg'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                style={{
                  backgroundColor: selectedGen === gen.id ? gen.color : undefined,
                  color: selectedGen === gen.id ? 'white' : undefined
                }}
              >
                {gen.name}
              </button>
            ))}
          </div>
          
          {/* Current Generation Info */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{currentGen.region}</h2>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <Badge variant="secondary" className="text-base">
                #{currentGen.start} - #{currentGen.end}
              </Badge>
              <Badge variant="secondary" className="text-base">
                {currentGen.end - currentGen.start + 1} Pokémon
              </Badge>
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
              {pokemon.map((p) => (
                <PokemonCard key={p.id} pokemon={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationsPage;


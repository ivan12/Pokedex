import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler, Weight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import TypeBadge from '@/components/TypeBadge';
import Header from '@/components/Header';

const PokemonDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState(null);
  const [species, setSpecies] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemonDetail();
  }, [id]);

  const fetchPokemonDetail = async () => {
    try {
      setLoading(true);
      const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const pokemonData = await pokemonRes.json();
      setPokemon(pokemonData);
      
      const speciesRes = await fetch(pokemonData.species.url);
      const speciesData = await speciesRes.json();
      setSpecies(speciesData);
    } catch (error) {
      console.error('Error fetching Pokemon details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="h-96 bg-muted rounded-3xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!pokemon) return null;

  const primaryType = pokemon.types[0].type.name;
  const flavorText = species?.flavor_text_entries.find(
    (entry) => entry.language.name === 'en'
  )?.flavor_text.replace(/\f/g, ' ');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6 hover:bg-accent/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pokédex
          </Button>
          
          {/* Main Card */}
          <div className="bg-card rounded-3xl shadow-lg overflow-hidden animate-scale-in">
            {/* Header Section with Background */}
            <div
              className="relative p-8 pb-32"
              style={{
                background: `linear-gradient(135deg, hsl(var(--type-${primaryType})) 0%, hsl(var(--type-${primaryType}) / 0.6) 100%)`
              }}
            >
              <div className="flex items-start justify-between text-white">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold capitalize">
                    {pokemon.name}
                  </h1>
                  <div className="flex gap-2 mt-4">
                    {pokemon.types.map((t) => (
                      <TypeBadge key={t.type.name} type={t.type.name} />
                    ))}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xl font-bold px-4 py-2">
                  #{String(pokemon.id).padStart(3, '0')}
                </Badge>
              </div>
              
              {/* Pokemon Image */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-24 w-64 h-64">
                <img
                  src={pokemon.sprites.other['official-artwork'].front_default}
                  alt={pokemon.name}
                  className="w-full h-full object-contain drop-shadow-2xl animate-float"
                />
              </div>
            </div>
            
            {/* Content Section */}
            <div className="px-8 pt-32 pb-8">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-muted rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Ruler className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{pokemon.height / 10}m</p>
                  <p className="text-sm text-muted-foreground">Height</p>
                </div>
                
                <div className="bg-muted rounded-2xl p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Weight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{pokemon.weight / 10}kg</p>
                  <p className="text-sm text-muted-foreground">Weight</p>
                </div>
                
                <div className="bg-muted rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold">{pokemon.base_experience}</p>
                  <p className="text-sm text-muted-foreground">Base XP</p>
                </div>
                
                <div className="bg-muted rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold capitalize">{species?.habitat?.name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">Habitat</p>
                </div>
              </div>
              
              {/* Description */}
              {flavorText && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-3">About</h3>
                  <p className="text-muted-foreground leading-relaxed">{flavorText}</p>
                </div>
              )}
              
              {/* Tabs */}
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="abilities">Abilities</TabsTrigger>
                  <TabsTrigger value="moves">Moves</TabsTrigger>
                </TabsList>
                
                <TabsContent value="stats" className="space-y-4 mt-6">
                  {pokemon.stats.map((stat) => {
                    const percentage = (stat.base_stat / 255) * 100;
                    return (
                      <div key={stat.stat.name}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-semibold capitalize">
                            {stat.stat.name.replace('-', ' ')}
                          </span>
                          <span className="text-sm font-bold">{stat.base_stat}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </TabsContent>
                
                <TabsContent value="abilities" className="mt-6">
                  <div className="grid gap-4">
                    {pokemon.abilities.map((ability) => (
                      <div
                        key={ability.ability.name}
                        className="bg-muted rounded-xl p-4"
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold capitalize text-lg">
                            {ability.ability.name.replace('-', ' ')}
                          </h4>
                          {ability.is_hidden && (
                            <Badge variant="secondary" className="text-xs">
                              Hidden
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="moves" className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {pokemon.moves.slice(0, 20).map((move) => (
                      <div
                        key={move.move.name}
                        className="bg-muted rounded-lg px-3 py-2 text-sm font-medium capitalize text-center"
                      >
                        {move.move.name.replace('-', ' ')}
                      </div>
                    ))}
                  </div>
                  {pokemon.moves.length > 20 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Showing 20 of {pokemon.moves.length} moves
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokemonDetailPage;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import PokemonCard from '@/components/PokemonCard';
import TypeFilter from '@/components/TypeFilter';
import GenerationFilter, { getGenerationRange } from '@/components/GenerationFilter';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ImageSearch from '@/components/ImageSearch';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { fetchPokemonFromDb, savePokemonToDb } from '@/lib/pokemon-store';
import { useFavorites } from '@/hooks/use-favorites';

const TOTAL_POKEMON = 1010;
const MIN_POKEMON_CACHE = 800;
const FETCH_CHUNK_SIZE = 50;
const PAGE_SIZE = 151;

const HomePage = () => {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const [pokemon, setPokemon] = useState([]);
  const [filteredPokemon, setFilteredPokemon] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedGeneration, setSelectedGeneration] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPokemon();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    filterPokemon();
  }, [searchTerm, selectedType, selectedGeneration, pokemon, favorites]);

  const fetchPokemon = async () => {
    try {
      setLoading(true);

      const cached = await fetchPokemonFromDb();
      const hasFullCache = cached.length >= MIN_POKEMON_CACHE;

      if (cached.length) {
        setPokemon(cached);
        setFilteredPokemon(cached);
      }

      if (hasFullCache) return;

      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON}`);
      const data = await response.json();
      
      const detailedPokemon = [];
      for (let i = 0; i < data.results.length; i += FETCH_CHUNK_SIZE) {
        const chunk = data.results.slice(i, i + FETCH_CHUNK_SIZE);
        const chunkData = await Promise.all(
          chunk.map(async (p) => {
            const res = await fetch(p.url);
            return res.json();
          })
        );
        detailedPokemon.push(...chunkData);
      }

      detailedPokemon.sort((a, b) => a.id - b.id);
      
      setPokemon(detailedPokemon);
      setFilteredPokemon(detailedPokemon);

      savePokemonToDb(detailedPokemon).catch((error) => {
        console.error('Error saving to Firebase:', error);
      });
    } catch (error) {
      console.error('Error fetching Pokemon:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPokemon = () => {
    const term = searchTerm.trim().toLowerCase();
    const matchFavorites = (term.includes('fav') || term.includes('lik')) && favorites.length > 0;

    let filtered = matchFavorites ? [...favorites] : [...pokemon];

    if (term && !matchFavorites) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.id.toString().includes(term) ||
          p.types.some((t) => t.type.name.toLowerCase().includes(term))
      );
    }

    const generationRange = getGenerationRange(selectedGeneration);
    if (generationRange) {
      filtered = filtered.filter(
        (p) => p.id >= generationRange.start && p.id <= generationRange.end
      );
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter((p) =>
        p.types.some((t) => t.type.name === selectedType)
      );
    }
    
    setFilteredPokemon(filtered);
  };

  const totalPages = Math.max(1, Math.ceil(filteredPokemon.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * PAGE_SIZE;
  const visiblePokemon = filteredPokemon.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePokemonFound = (pokemonMatch) => {
    navigate(`/pokemon/${pokemonMatch.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <Header />
      <HeroSection />
      
      {/* Search and Filter Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-base rounded-2xl border-2 focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
            <ImageSearch onPokemonFound={handlePokemonFound} pokemonList={pokemon} />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TypeFilter selectedType={selectedType} onSelectType={setSelectedType} />
            <GenerationFilter
              selectedGeneration={selectedGeneration}
              onSelectGeneration={setSelectedGeneration}
            />
          </div>
        </div>
      </div>
      
      {/* Pokemon Grid */}
      <div className="container mx-auto px-5 md:px-10 pb-16">
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-muted rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4 animate-slide-up">
              {visiblePokemon.map((p) => (
                <PokemonCard key={p.id} pokemon={p} />
              ))}
            </div>
          )}
          
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                disabled={currentPageSafe === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="text-sm font-semibold">
                Page {currentPageSafe} of {totalPages}
              </div>
              <Button
                variant="outline"
                disabled={currentPageSafe === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
          
          {!loading && filteredPokemon.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl font-bold text-muted-foreground">No PokÃ©mon found</p>
              <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;

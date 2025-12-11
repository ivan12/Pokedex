import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import PokemonCard from '@/components/PokemonCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/use-favorites';

const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [showEmptyDialog, setShowEmptyDialog] = useState(false);

  useEffect(() => {
    setShowEmptyDialog(favorites.length === 0);
  }, [favorites]);

  const sortedFavorites = useMemo(
    () => [...favorites].sort((a, b) => a.id - b.id),
    [favorites]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gradient">Favorites</h1>
              <p className="text-muted-foreground">
                Your saved Pokemon stay in your browser, and if you’re logged in, they’re also synced to your account.
              </p>
            </div>
          </div>

          {sortedFavorites.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4">
              {sortedFavorites.map((p) => (
                <PokemonCard key={p.id} pokemon={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No favorites yet</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-4">
            Add Pokémon to your favorites by tapping the heart icon on a card. Favorites are stored only in this browser.
          </p>
          <Button onClick={() => setShowEmptyDialog(false)}>Got it</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FavoritesPage;

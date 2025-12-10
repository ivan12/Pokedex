import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import TypeBadge from '@/components/TypeBadge';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/use-favorites';

const getGenerationLabel = (id) => {
  const ranges = [
    { start: 1, end: 151, label: 'Gen 1' },
    { start: 152, end: 251, label: 'Gen 2' },
    { start: 252, end: 386, label: 'Gen 3' },
    { start: 387, end: 493, label: 'Gen 4' },
    { start: 494, end: 649, label: 'Gen 5' },
    { start: 650, end: 721, label: 'Gen 6' },
    { start: 722, end: 809, label: 'Gen 7' },
    { start: 810, end: 898, label: 'Gen 8' },
    { start: 899, end: 1010, label: 'Gen 9' },
  ];

  const match = ranges.find((range) => id >= range.start && id <= range.end);
  return match ? match.label : 'Gen ?';
};

const getGenerationBadgeClass = (label) => {
  const palette = {
    'Gen 1': 'bg-rose-100 text-rose-800',
    'Gen 2': 'bg-amber-100 text-amber-800',
    'Gen 3': 'bg-emerald-100 text-emerald-800',
    'Gen 4': 'bg-cyan-100 text-cyan-800',
    'Gen 5': 'bg-indigo-100 text-indigo-800',
    'Gen 6': 'bg-fuchsia-100 text-fuchsia-800',
    'Gen 7': 'bg-orange-100 text-orange-900',
    'Gen 8': 'bg-lime-100 text-lime-800',
    'Gen 9': 'bg-slate-200 text-slate-800',
    'Gen ?': 'bg-muted text-muted-foreground',
  };
  return palette[label] || palette['Gen ?'];
};

export const PokemonCard = ({ pokemon }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const primaryType = pokemon.types[0].type.name;
  const generationLabel = getGenerationLabel(pokemon.id);
  const generationClass = getGenerationBadgeClass(generationLabel);

  return (
    <div
      onClick={() => navigate(`/pokemon/${pokemon.id}`)}
      className="pokemon-card group"
    >
      {/* Background with type color */}
      <div
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
        style={{
          background: `linear-gradient(135deg, hsl(var(--type-${primaryType})), hsl(var(--type-${primaryType}) / 0.5))`
        }}
      ></div>
      
      {/* Content */}
      <div className="relative p-4 flex flex-col h-full">
        {/* Number + Generation Badges */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Badge variant="secondary" className="text-xs font-bold whitespace-nowrap shrink-0">
              #{String(pokemon.id).padStart(3, '0')}
            </Badge>
            <Badge className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${generationClass}`}>
              {generationLabel}
            </Badge>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(pokemon);
            }}
            aria-label="Toggle favorite"
            className="h-8 w-8 rounded-full border border-border bg-card/80 backdrop-blur flex items-center justify-center hover:scale-105 transition shrink-0"
          >
            <Heart
              className={`h-4 w-4 ${isFavorite(pokemon.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
        
        {/* Pokemon Image */}
        <div className="flex-1 flex items-center justify-center mb-3">
          <img
            src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
            alt={pokemon.name}
            className="w-32 h-32 object-contain group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        </div>
        
        {/* Pokemon Name */}
        <h3 className="text-lg font-bold capitalize text-center mb-2">
          {pokemon.name}
        </h3>
        
        {/* Type Badges */}
        <div className="flex gap-1 justify-center flex-wrap">
          {pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PokemonCard;

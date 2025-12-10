import { useNavigate } from 'react-router-dom';
import TypeBadge from '@/components/TypeBadge';
import { Badge } from '@/components/ui/badge';

export const PokemonCard = ({ pokemon }) => {
  const navigate = useNavigate();
  const primaryType = pokemon.types[0].type.name;

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
        {/* Number Badge */}
        <div className="flex justify-end mb-2">
          <Badge variant="secondary" className="text-xs font-bold">
            #{String(pokemon.id).padStart(3, '0')}
          </Badge>
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

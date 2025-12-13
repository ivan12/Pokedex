import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import TypeBadge from '@/components/TypeBadge';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/hooks/use-favorites';

// --- Emla Chips Card Helpers & Constants ---

const TEXTURE_MAP = {
  fire: 'radial-gradient(circle at 20% 20%, rgba(255,140,66,0.25) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,80,80,0.25) 0, transparent 42%)',
  water: 'radial-gradient(circle at 20% 20%, rgba(90,180,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(60,110,255,0.2) 0, transparent 42%)',
  grass: 'radial-gradient(circle at 20% 20%, rgba(130,210,90,0.25) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(80,180,80,0.25) 0, transparent 42%)',
  electric: 'radial-gradient(circle at 20% 20%, rgba(255,230,120,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,200,80,0.25) 0, transparent 42%)',
  ground: 'radial-gradient(circle at 20% 20%, rgba(180,140,80,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(140,100,60,0.25) 0, transparent 42%)',
  rock: 'radial-gradient(circle at 20% 20%, rgba(150,130,90,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(110,90,70,0.25) 0, transparent 42%)',
  ice: 'radial-gradient(circle at 20% 20%, rgba(180,240,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(130,210,255,0.25) 0, transparent 42%)',
  psychic: 'radial-gradient(circle at 20% 20%, rgba(255,160,220,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(190,120,240,0.25) 0, transparent 42%)',
  dragon: 'radial-gradient(circle at 20% 20%, rgba(140,120,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(90,80,220,0.25) 0, transparent 42%)',
  dark: 'radial-gradient(circle at 20% 20%, rgba(40,40,60,0.35) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(20,20,30,0.25) 0, transparent 42%)',
  steel: 'radial-gradient(circle at 20% 20%, rgba(180,190,200,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(130,140,150,0.25) 0, transparent 42%)',
  ghost: 'radial-gradient(circle at 20% 20%, rgba(100,90,180,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(70,60,150,0.25) 0, transparent 42%)',
  bug: 'radial-gradient(circle at 20% 20%, rgba(180,220,90,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(140,190,80,0.25) 0, transparent 42%)',
  poison: 'radial-gradient(circle at 20% 20%, rgba(180,110,220,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(140,90,200,0.25) 0, transparent 42%)',
  flying: 'radial-gradient(circle at 20% 20%, rgba(140,190,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(110,150,230,0.25) 0, transparent 42%)',
  fighting: 'radial-gradient(circle at 20% 20%, rgba(230,120,80,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(190,70,60,0.25) 0, transparent 42%)',
  fairy: 'radial-gradient(circle at 20% 20%, rgba(255,200,230,0.3) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(240,160,210,0.25) 0, transparent 42%)',
  normal: 'radial-gradient(circle at 20% 20%, rgba(190,200,210,0.25) 0, transparent 40%), radial-gradient(circle at 80% 0%, rgba(160,170,180,0.2) 0, transparent 42%)',
};

const EMBLEM_MAP = {
  fire: 'FIRE',
  water: 'WATER',
  grass: 'GRASS',
  electric: 'ELEC',
  ground: 'GROUND',
  rock: 'ROCK',
  ice: 'ICE',
  psychic: 'PSY',
  dragon: 'DRGN',
  dark: 'DARK',
  steel: 'STEEL',
  ghost: 'GHOST',
  bug: 'BUG',
  poison: 'POISON',
  flying: 'FLY',
  fighting: 'FIGHT',
  fairy: 'FAIRY',
  normal: 'NORMAL',
};

const CARD_STAT_OPTIONS = [
  { key: 'strength', label: 'Strength' },
  { key: 'attack', label: 'Attack' },
  { key: 'defense', label: 'Defense' },
  { key: 'agility', label: 'Agility' },
];

const getCardPalette = (type) => {
  const map = {
    fire: { from: 'from-orange-500', to: 'to-red-600', ring: 'ring-orange-400' },
    water: { from: 'from-sky-500', to: 'to-blue-700', ring: 'ring-sky-400' },
    electric: { from: 'from-amber-300', to: 'to-yellow-500', ring: 'ring-amber-400' },
    grass: { from: 'from-emerald-500', to: 'to-lime-600', ring: 'ring-emerald-400' },
    psychic: { from: 'from-pink-500', to: 'to-purple-600', ring: 'ring-pink-400' },
    ice: { from: 'from-cyan-300', to: 'to-blue-500', ring: 'ring-cyan-300' },
    rock: { from: 'from-stone-400', to: 'to-amber-600', ring: 'ring-stone-400' },
    ground: { from: 'from-amber-500', to: 'to-yellow-600', ring: 'ring-amber-500' },
    dragon: { from: 'from-indigo-500', to: 'to-indigo-700', ring: 'ring-indigo-400' },
    dark: { from: 'from-slate-700', to: 'to-gray-900', ring: 'ring-slate-500' },
    fairy: { from: 'from-pink-300', to: 'to-rose-400', ring: 'ring-pink-300' },
    steel: { from: 'from-gray-400', to: 'to-gray-600', ring: 'ring-gray-400' },
    fighting: { from: 'from-orange-600', to: 'to-red-700', ring: 'ring-orange-500' },
    ghost: { from: 'from-indigo-700', to: 'to-slate-800', ring: 'ring-indigo-500' },
    bug: { from: 'from-lime-500', to: 'to-green-600', ring: 'ring-lime-400' },
    poison: { from: 'from-purple-500', to: 'to-violet-600', ring: 'ring-purple-400' },
    flying: { from: 'from-sky-400', to: 'to-indigo-500', ring: 'ring-sky-300' },
    normal: { from: 'from-slate-500', to: 'to-slate-800', ring: 'ring-slate-500' },
  };
  return map[type] ?? map.normal;
};

// Simplified stat calculator for display purposes
const getStatValue = (p, key) => {
  const base = (statName) => p?.stats?.find((s) => s.stat.name === statName)?.base_stat ?? 50;

  // Mapping API stats to Card Stats
  // Strength -> HP
  // Attack -> Attack
  // Defense -> Defense
  // Agility -> Speed

  switch (key) {
    case 'strength': return base('hp') + 50; // Simple boost for visuals
    case 'attack': return base('attack');
    case 'defense': return base('defense');
    case 'agility': return base('speed');
    default: return 0;
  }
};

const isSpecialCard = (poke) => {
  if (!poke) return false;
  // Simple check: Legendaries or high stats
  const total = (poke.stats || []).reduce((acc, s) => acc + s.base_stat, 0);
  return total >= 600 || poke.is_legendary || poke.is_mythical; // Note: is_legendary/mythical might not be on simple Pokemon object from list, so stats is safer fallback
};

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

export const PokemonCard = ({ pokemon, isHidden = false, isRandomView = false, onClose, onReveal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showInfo, setShowInfo] = useState(false);
  const primaryType = pokemon.types?.[0]?.type?.name || 'normal';
  const generationLabel = getGenerationLabel(pokemon.id);
  const generationClass = getGenerationBadgeClass(generationLabel);

  const handleClick = () => {
    // If hidden (mystery mode), reveal the Pokemon
    if (isHidden && onReveal) {
      onReveal();
      return;
    }

    // In Random View, clicking toggles info instead of navigating
    if (isRandomView) {
      setShowInfo(!showInfo);
      return;
    }

    navigate(`/pokemon/${pokemon.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  // Reset showInfo when hidden state changes (new pokemon)
  useEffect(() => {
    if (isHidden) {
      setShowInfo(false);
    }
  }, [isHidden]);

  // Specific Emla Card Layout Logic
  const emlaPalette = getCardPalette(primaryType);
  const special = isSpecialCard(pokemon);
  const sprite = pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default;

  // Use Emla layout if looking for info in RandomView
  if (showInfo && !isHidden && isRandomView) {
    return (
      <div
        onClick={handleClick}
        className={`relative w-full h-full rounded-2xl border-4 bg-gradient-to-b ${emlaPalette.from} ${emlaPalette.to} shadow-lg ring-4 ${emlaPalette.ring} overflow-hidden flex flex-col ${special ? 'ring-amber-300/80 shadow-[0_0_15px_rgba(255,193,7,0.3)]' : ''}`}
        style={{ backgroundImage: TEXTURE_MAP[primaryType] ?? TEXTURE_MAP.normal }}
      >
        {/* Close Button Overlay */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onClose) onClose();
          }}
          className="absolute top-2 right-2 z-50 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition backdrop-blur-sm border border-white/20 shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Vertical Left Label */}
        <div
          className="absolute left-0 top-0 bottom-0 w-8 sm:w-10 bg-black/70 text-white text-xs sm:text-sm font-bold flex items-center justify-center tracking-wider"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textOrientation: 'mixed' }}
        >
          #{String(pokemon.id).padStart(3, '0')} - {pokemon.name.toUpperCase()}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 pl-10 pr-2 py-2 flex flex-col gap-2 relative">

          {/* Emblem/Star Badge */}
          <div className="absolute right-12 top-2 text-[10px] font-bold tracking-wide opacity-80 drop-shadow-sm bg-black/30 text-white px-2 py-0.5 rounded">
            {EMBLEM_MAP[primaryType] ?? 'STAR'}
          </div>

          {/* Sprite */}
          <div className="flex items-center justify-center flex-1 min-h-[140px]">
            {sprite && (
              <img src={sprite} alt={pokemon.name} className="w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" />
            )}
          </div>

          {/* Stats List */}
          <div className="space-y-1.5 text-xs font-semibold px-1 pb-1">
            {CARD_STAT_OPTIONS.map((opt) => {
              const value = getStatValue(pokemon, opt.key);
              const color =
                opt.key === 'strength'
                  ? 'text-amber-100'
                  : opt.key === 'attack'
                    ? 'text-red-100'
                    : opt.key === 'defense'
                      ? 'text-emerald-100'
                      : 'text-yellow-100';
              return (
                <div
                  key={opt.key}
                  className="flex items-center justify-between rounded px-2 py-1.5 border border-white/10 shadow-inner bg-gradient-to-r from-black/40 to-black/10"
                >
                  <span className={`${color} drop-shadow-sm uppercase font-bold tracking-tight`}>{opt.label}</span>
                  <span className="text-white text-sm font-bold">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- STANDARD CARD LAYOUT ---
  return (
    <div
      onClick={handleClick}
      className={`pokemon-card group relative overflow-hidden rounded-3xl border border-white/20 shadow-lg bg-card ${isHidden || isRandomView
        ? 'cursor-default h-full flex flex-col active:scale-100 touch-manipulation select-none'
        : 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl transition-all duration-300'
        } ${isRandomView && !showInfo && !isHidden ? 'justify-center' : ''}`}
    >
      {/* Background with type color - Hidden in mystery mode */}
      <div
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity"
        style={{
          background: isHidden
            ? '#000000'
            : `linear-gradient(135deg, hsl(var(--type-${primaryType})), hsl(var(--type-${primaryType}) / 0.5))`
        }}
      ></div>

      {/* Content */}
      <div className={`relative p-4 flex flex-col h-full`}>

        {/* Header: Number/Gen Badge + Action Button (Heart or Close) */}
        {/* Only show this standard header if NOT in the special info view (handled above) */}
        <div className="flex items-center justify-between mb-2 gap-2 z-10">
          {!isHidden ? (
            <>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge variant="secondary" className="text-xs font-bold whitespace-nowrap shrink-0">
                  #{String(pokemon.id).padStart(3, '0')}
                </Badge>
                <Badge className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${generationClass}`}>
                  {generationLabel}
                </Badge>
              </div>

              {isRandomView ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                  }}
                  aria-label="Close"
                  className="h-8 w-8 rounded-full border border-border bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition shrink-0 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
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
              )}
            </>
          ) : (
            <div className="h-8 w-full"></div> // Spacer
          )}
        </div>

        {/* Pokemon Image & Name (Standard View) */}
        <div className="flex-1 flex items-center justify-center mb-3">
          <img
            src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
            alt={isHidden ? "Who's that Pokemon?" : pokemon.name}
            className={`object-contain transition-all duration-300 ${isRandomView ? 'w-[85%] h-auto aspect-square' : 'w-32 h-32' // Fluid size for random view
              } ${isHidden
                ? 'brightness-0 contrast-200'
                : 'group-hover:scale-110'
              }`}
            loading="lazy"
          />
        </div>

        <h3 className={`font-bold capitalize text-center mb-2 ${isHidden
          ? 'text-4xl text-black'
          : 'text-lg'
          }`}>
          {isHidden ? '?' : pokemon.name}
        </h3>

        <div className="flex gap-1 justify-center flex-wrap">
          {!isHidden && pokemon.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} />
          ))}
        </div>

        {!isHidden && isRandomView && (
          <p className="text-xs text-center text-muted-foreground mt-2 animate-pulse">
            Tap for details
          </p>
        )}
      </div>
    </div>
  );
};

export default PokemonCard;

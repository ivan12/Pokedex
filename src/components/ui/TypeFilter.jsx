import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

const POKEMON_TYPES = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'normal', label: 'Normal' },
  { value: 'fire', label: 'Fogo' },
  { value: 'water', label: 'Água' },
  { value: 'electric', label: 'Elétrico' },
  { value: 'grass', label: 'Planta' },
  { value: 'ice', label: 'Gelo' },
  { value: 'fighting', label: 'Lutador' },
  { value: 'poison', label: 'Veneno' },
  { value: 'ground', label: 'Terra' },
  { value: 'flying', label: 'Voador' },
  { value: 'psychic', label: 'Psíquico' },
  { value: 'bug', label: 'Inseto' },
  { value: 'rock', label: 'Pedra' },
  { value: 'ghost', label: 'Fantasma' },
  { value: 'dragon', label: 'Dragão' },
  { value: 'dark', label: 'Sombrio' },
  { value: 'steel', label: 'Metálico' },
  { value: 'fairy', label: 'Fada' }
];

export const TypeFilter = ({ selectedType, onSelectType }) => {
  return (
    <Select value={selectedType} onValueChange={onSelectType}>
      <SelectTrigger className="w-full sm:w-64 h-14 text-base rounded-2xl border-2">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <SelectValue placeholder="Filtrar por tipo" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {POKEMON_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value} className="text-base">
            <div className="flex items-center gap-2">
              {type.value !== 'all' && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: `hsl(var(--type-${type.value}))` }}
                />
              )}
              <span>{type.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TypeFilter;

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

const POKEMON_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'normal', label: 'Normal' },
  { value: 'fire', label: 'Fire' },
  { value: 'water', label: 'Water' },
  { value: 'electric', label: 'Electric' },
  { value: 'grass', label: 'Grass' },
  { value: 'ice', label: 'Ice' },
  { value: 'fighting', label: 'Fighting' },
  { value: 'poison', label: 'Poison' },
  { value: 'ground', label: 'Ground' },
  { value: 'flying', label: 'Flying' },
  { value: 'psychic', label: 'Psychic' },
  { value: 'bug', label: 'Bug' },
  { value: 'rock', label: 'Rock' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'dragon', label: 'Dragon' },
  { value: 'dark', label: 'Dark' },
  { value: 'steel', label: 'Steel' },
  { value: 'fairy', label: 'Fairy' }
];

export const TypeFilter = ({ selectedType, onSelectType }) => {
  return (
    <Select value={selectedType} onValueChange={onSelectType}>
      <SelectTrigger className="w-full sm:w-64 h-14 text-base rounded-2xl border-2">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <SelectValue placeholder="Filter by type" />
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

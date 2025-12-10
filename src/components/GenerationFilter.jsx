import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export const GENERATIONS = [
  { value: "all", label: "All generations (1-1010)", range: null },
  { value: "gen1", label: "Generation 1 (1-151)", range: { start: 1, end: 151 } },
  { value: "gen2", label: "Generation 2 (152-251)", range: { start: 152, end: 251 } },
  { value: "gen3", label: "Generation 3 (252-386)", range: { start: 252, end: 386 } },
  { value: "gen4", label: "Generation 4 (387-493)", range: { start: 387, end: 493 } },
  { value: "gen5", label: "Generation 5 (494-649)", range: { start: 494, end: 649 } },
  { value: "gen6", label: "Generation 6 (650-721)", range: { start: 650, end: 721 } },
  { value: "gen7", label: "Generation 7 (722-809)", range: { start: 722, end: 809 } },
  { value: "gen8", label: "Generation 8 (810-898)", range: { start: 810, end: 898 } },
  { value: "gen9", label: "Generation 9 (899-1010)", range: { start: 899, end: 1010 } },
];

export const getGenerationRange = (value) =>
  GENERATIONS.find((gen) => gen.value === value)?.range ?? null;

export const GenerationFilter = ({ selectedGeneration, onSelectGeneration }) => {
  return (
    <Select value={selectedGeneration} onValueChange={onSelectGeneration}>
      <SelectTrigger className="w-full sm:w-64 h-14 text-base rounded-2xl border-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <SelectValue placeholder="Filter by generation" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {GENERATIONS.map((gen) => (
          <SelectItem key={gen.value} value={gen.value} className="text-base">
            {gen.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default GenerationFilter;

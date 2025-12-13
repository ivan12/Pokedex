import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";

export const GENERATIONS = [
  { value: "all", label: "All Regions", range: null },
  { value: "gen1", label: "Kanto (Gen 1)", range: { start: 1, end: 151 } },
  { value: "gen2", label: "Johto (Gen 2)", range: { start: 152, end: 251 } },
  { value: "gen3", label: "Hoenn (Gen 3)", range: { start: 252, end: 386 } },
  { value: "gen4", label: "Sinnoh (Gen 4)", range: { start: 387, end: 493 } },
  { value: "gen5", label: "Unova (Gen 5)", range: { start: 494, end: 649 } },
  { value: "gen6", label: "Kalos (Gen 6)", range: { start: 650, end: 721 } },
  { value: "gen7", label: "Alola (Gen 7)", range: { start: 722, end: 809 } },
  { value: "gen8", label: "Galar (Gen 8)", range: { start: 810, end: 898 } },
  { value: "gen9", label: "Paldea (Gen 9)", range: { start: 899, end: 1010 } },
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

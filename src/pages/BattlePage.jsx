import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Swords, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';

const TYPE_CHART = {
  fire: { strong: ['grass', 'ice', 'bug', 'steel'], weak: ['water', 'rock', 'fire', 'dragon'], immune: [] },
  water: { strong: ['fire', 'rock', 'ground'], weak: ['grass', 'dragon', 'water'], immune: [] },
  grass: { strong: ['water', 'ground', 'rock'], weak: ['fire', 'flying', 'bug', 'poison', 'ice'], immune: [] },
  electric: { strong: ['water', 'flying'], weak: ['grass', 'dragon', 'electric'], immune: ['ground'] },
  rock: { strong: ['fire', 'ice', 'flying', 'bug'], weak: ['water', 'grass', 'fighting', 'ground', 'steel'], immune: [] },
  fighting: { strong: ['normal', 'rock', 'ice', 'dark', 'steel'], weak: ['psychic', 'flying', 'fairy', 'poison'], immune: ['ghost'] },
  dark: { strong: ['psychic', 'ghost'], weak: ['fighting', 'fairy', 'dark'], immune: [] },
  ghost: { strong: ['psychic', 'ghost'], weak: ['dark'], immune: ['normal'] },
  psychic: { strong: ['fighting', 'poison'], weak: ['bug', 'dark', 'ghost'], immune: [] },
  ice: { strong: ['dragon', 'grass', 'ground', 'flying'], weak: ['fire', 'steel', 'fighting', 'rock'], immune: [] },
  dragon: { strong: ['dragon'], weak: ['ice', 'fairy', 'dragon'], immune: ['fairy'] },
  fairy: { strong: ['dragon', 'dark', 'fighting'], weak: ['poison', 'steel', 'fire'], immune: [] },
  bug: { strong: ['grass', 'psychic', 'dark'], weak: ['fire', 'flying', 'rock'], immune: [] },
  poison: { strong: ['grass', 'fairy'], weak: ['ground', 'psychic'], immune: ['steel'] },
  steel: { strong: ['ice', 'rock', 'fairy'], weak: ['fire', 'fighting', 'ground'], immune: [] },
  ground: { strong: ['fire', 'electric', 'rock', 'steel', 'poison'], weak: ['water', 'grass', 'ice'], immune: ['flying'] },
  flying: { strong: ['grass', 'bug', 'fighting'], weak: ['electric', 'ice', 'rock'], immune: [] },
  normal: { strong: [], weak: ['rock', 'steel'], immune: ['ghost'] },
};

const WEATHER_BONUS = {
  clear: {},
  sun: { boost: ['fire'], nerf: ['water'] },
  rain: { boost: ['water'], nerf: ['fire'] },
  snow: { boost: ['ice'], nerf: [] },
  sandstorm: { boost: ['rock'], nerf: [] },
};

const BattlePage = () => {
  const [pokemon, setPokemon] = useState([]);
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');
  const [filteredLeft, setFilteredLeft] = useState([]);
  const [filteredRight, setFilteredRight] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [battling, setBattling] = useState(false);
  const [startMode, setStartMode] = useState('speed'); // speed | left | right | random
  const [weather, setWeather] = useState('clear'); // clear | sun | rain | snow | sandstorm

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1010');
        const data = await res.json();
        const detailed = [];
        const CHUNK = 50;
        for (let i = 0; i < data.results.length; i += CHUNK) {
          const chunk = data.results.slice(i, i + CHUNK);
          const chunkData = await Promise.all(
            chunk.map(async (p) => {
              const r = await fetch(p.url);
              return r.json();
            })
          );
          detailed.push(...chunkData);
        }
        detailed.sort((a, b) => a.id - b.id);
        setPokemon(detailed);
      } catch (err) {
        console.error('Error fetching Pokemon:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (searchLeft) {
      const term = searchLeft.toLowerCase();
      const list = pokemon.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.types.some((t) => t.type.name.toLowerCase().includes(term))
      );
      setFilteredLeft(list);
    } else {
      setFilteredLeft([]);
    }
  }, [searchLeft, pokemon]);

  useEffect(() => {
    if (searchRight) {
      const term = searchRight.toLowerCase();
      const list = pokemon.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.types.some((t) => t.type.name.toLowerCase().includes(term))
      );
      setFilteredRight(list);
    } else {
      setFilteredRight([]);
    }
  }, [searchRight, pokemon]);

  const selectLeft = (p) => {
    setSelectedLeft(p);
    setSearchLeft('');
    setFilteredLeft([]);
  };

  const selectRight = (p) => {
    setSelectedRight(p);
    setSearchRight('');
    setFilteredRight([]);
  };

  const getTypeEffect = (attackType, defenderTypes) => {
    const chart = TYPE_CHART[attackType] || { strong: [], weak: [], immune: [] };
    let mult = 1;
    defenderTypes.forEach((dt) => {
      if (chart.immune.includes(dt)) {
        mult *= 0;
      } else if (chart.strong.includes(dt)) {
        mult *= 2;
      } else if (chart.weak.includes(dt)) {
        mult *= 0.5;
      }
    });
    const weatherCfg = WEATHER_BONUS[weather] || {};
    const weatherMult = weatherCfg.boost?.includes(attackType) ? 1.2 : weatherCfg.nerf?.includes(attackType) ? 0.8 : 1;
    return { baseMult: mult, weatherMult };
  };

  const calcDamage = (attacker, defender) => {
    const attackerTypes = attacker.types.map((t) => t.type.name);
    const defenderTypes = defender.types.map((t) => t.type.name);
    let best = {
      totalMult: 1,
      attackType: attackerTypes[0] ?? 'normal',
      baseTypeMult: 1,
      stabMult: 1,
      weatherMult: 1,
    };
    attackerTypes.forEach((atkType) => {
      const { baseMult, weatherMult } = getTypeEffect(atkType, defenderTypes);
      const stabMult = attackerTypes.includes(atkType) ? 1.5 : 1;
      const totalMult = baseMult * weatherMult * stabMult;
      if (totalMult > best.totalMult) {
        best = { totalMult, attackType: atkType, baseTypeMult: baseMult, stabMult, weatherMult };
      }
    });

    const atk = attacker.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 50;
    const def = defender.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 50;
    const spd = attacker.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 50;
    const base = Math.max(10, Math.floor((atk / Math.max(def, 1)) * 20));
    const speedBonus = Math.floor(spd / 20);
    const randomFactor = Math.random() * 0.3 + 0.85;
    const damage = Math.floor((base + speedBonus) * randomFactor * best.totalMult);
    return { damage, ...best };
  };

  const simulateBattle = () => {
    if (!selectedLeft || !selectedRight) {
      toast.error('Select two Pokémon to battle!');
      return;
    }

    setBattling(true);
    setBattleResult(null);

    setTimeout(() => {
      let hp1 = selectedLeft.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 80;
      let hp2 = selectedRight.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 80;
      const maxHP1 = hp1;
      const maxHP2 = hp2;
      const speed1 = selectedLeft.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 50;
      const speed2 = selectedRight.stats.find((s) => s.stat.name === 'speed')?.base_stat ?? 50;
      let first = 'left';
      if (startMode === 'speed') {
        first = speed1 >= speed2 ? 'left' : 'right';
      } else if (startMode === 'right') {
        first = 'right';
      } else if (startMode === 'random') {
        first = Math.random() < 0.5 ? 'left' : 'right';
      }
      const log = [];
      let turns = 0;

      while (hp1 > 0 && hp2 > 0 && turns < 50) {
        turns += 1;
        if (first === 'left') {
          const dmg = calcDamage(selectedLeft, selectedRight);
          hp2 = Math.max(0, hp2 - dmg.damage);
          log.push({ turn: turns, attacker: selectedLeft.name, defender: selectedRight.name, ...dmg, remainingHP: hp2 });
          if (hp2 > 0) {
            const d2 = calcDamage(selectedRight, selectedLeft);
            hp1 = Math.max(0, hp1 - d2.damage);
            log.push({ turn: turns, attacker: selectedRight.name, defender: selectedLeft.name, ...d2, remainingHP: hp1 });
          }
        } else {
          const dmg = calcDamage(selectedRight, selectedLeft);
          hp1 = Math.max(0, hp1 - dmg.damage);
          log.push({ turn: turns, attacker: selectedRight.name, defender: selectedLeft.name, ...dmg, remainingHP: hp1 });
          if (hp1 > 0) {
            const d2 = calcDamage(selectedLeft, selectedRight);
            hp2 = Math.max(0, hp2 - d2.damage);
            log.push({ turn: turns, attacker: selectedLeft.name, defender: selectedRight.name, ...d2, remainingHP: hp2 });
          }
        }
      }

      const winner = hp1 > 0 ? selectedLeft : selectedRight;
      const loser = hp1 > 0 ? selectedRight : selectedLeft;
      const winnerHP = hp1 > 0 ? hp1 : hp2;
      const winnerMaxHP = hp1 > 0 ? maxHP1 : maxHP2;

      setBattleResult({
        winner,
        loser,
        turns,
        winnerHP,
        winnerMaxHP,
        battleLog: log.slice(-6),
      });
      setBattling(false);
      toast.success(`${winner.name} won in ${turns} turns!`);
    }, 1200);
  };

  const reset = () => {
    setSelectedLeft(null);
    setSelectedRight(null);
    setBattleResult(null);
    setSearchLeft('');
    setSearchRight('');
    setFilteredLeft([]);
    setFilteredRight([]);
  };

  const leftPlaceholder = useMemo(() => 'Search Pokémon...', []);
  const rightPlaceholder = leftPlaceholder;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gradient">
            Pokémon Battle
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Select two Pokémon and simulate an epic battle!
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col gap-3 md:col-span-2">
              <div className="flex flex-wrap gap-4 items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Start:</span>
                  <select
                    className="border rounded-md px-3 py-2 bg-background"
                    value={startMode}
                    onChange={(e) => setStartMode(e.target.value)}
                  >
                    <option value="speed">By speed</option>
                    <option value="left">Pokémon 1 starts</option>
                    <option value="right">Pokémon 2 starts</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Weather:</span>
                  <select
                    className="border rounded-md px-3 py-2 bg-background"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                  >
                    <option value="clear">Clear</option>
                    <option value="sun">Sunny</option>
                    <option value="rain">Rain</option>
                    <option value="snow">Snow</option>
                    <option value="sandstorm">Sandstorm</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Left Pokemon */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center">Pokémon 1</h3>
              
              {!selectedLeft ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder={leftPlaceholder}
                      value={searchLeft}
                      onChange={(e) => setSearchLeft(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {filteredLeft.length > 0 && (
                    <div className="bg-card border rounded-lg divide-y max-h-80 overflow-y-auto">
                      {filteredLeft.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectLeft(p)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted transition-colors"
                        >
                          <img src={p.sprites.front_default} alt={p.name} className="w-12 h-12" />
                          <div className="text-left">
                            <div className="font-semibold capitalize">{p.name}</div>
                            <div className="text-sm text-muted-foreground">#{p.id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border-2 border-primary rounded-2xl p-6 text-center">
                  <img
                    src={selectedLeft.sprites.other['official-artwork'].front_default}
                    alt={selectedLeft.name}
                    className="w-48 h-48 mx-auto mb-4"
                  />
                  <h4 className="text-2xl font-bold capitalize mb-2">{selectedLeft.name}</h4>
                  <Badge variant="secondary" className="mb-4">#{selectedLeft.id}</Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>HP:</span>
                      <span className="font-bold">{selectedLeft.stats.find((s) => s.stat.name === 'hp').base_stat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attack:</span>
                      <span className="font-bold">{selectedLeft.stats.find((s) => s.stat.name === 'attack').base_stat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Defense:</span>
                      <span className="font-bold">{selectedLeft.stats.find((s) => s.stat.name === 'defense').base_stat}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLeft(null)}
                    className="mt-4"
                  >
                    Swap Pokémon
                  </Button>
                </div>
              )}
            </div>
            
            {/* Right Pokemon */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center">Pokémon 2</h3>
              
              {!selectedRight ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder={rightPlaceholder}
                      value={searchRight}
                      onChange={(e) => setSearchRight(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {filteredRight.length > 0 && (
                    <div className="bg-card border rounded-lg divide-y max-h-80 overflow-y-auto">
                      {filteredRight.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => selectRight(p)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-muted transition-colors"
                        >
                          <img src={p.sprites.front_default} alt={p.name} className="w-12 h-12" />
                          <div className="text-left">
                            <div className="font-semibold capitalize">{p.name}</div>
                            <div className="text-sm text-muted-foreground">#{p.id}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border-2 border-accent rounded-2xl p-6 text-center">
                  <img
                    src={selectedRight.sprites.other['official-artwork'].front_default}
                    alt={selectedRight.name}
                    className="w-48 h-48 mx-auto mb-4"
                  />
                  <h4 className="text-2xl font-bold capitalize mb-2">{selectedRight.name}</h4>
                  <Badge variant="secondary" className="mb-4">#{selectedRight.id}</Badge>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>HP:</span>
                      <span className="font-bold">{selectedRight.stats.find((s) => s.stat.name === 'hp').base_stat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Attack:</span>
                      <span className="font-bold">{selectedRight.stats.find((s) => s.stat.name === 'attack').base_stat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Defense:</span>
                      <span className="font-bold">{selectedRight.stats.find((s) => s.stat.name === 'defense').base_stat}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRight(null)}
                    className="mt-4"
                  >
                    Swap Pokémon
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* Battle Buttons */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              onClick={simulateBattle}
              disabled={!selectedLeft || !selectedRight || battling}
              size="lg"
              className="px-8"
            >
              {battling ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Battling...
                </>
              ) : (
                <>
                  <Swords className="mr-2 h-5 w-5" />
                  Start Battle
                </>
              )}
            </Button>
            
            {(selectedLeft || selectedRight || battleResult) && (
              <Button onClick={reset} variant="outline" size="lg">
                Reset
              </Button>
            )}
          </div>
          
          {/* Battle Result */}
          {battleResult && (
            <div className="bg-card border rounded-2xl p-6 animate-scale-in">
              <h3 className="text-2xl font-bold text-center mb-6">Battle Result</h3>
              
              <div className="max-w-md mx-auto space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-4">
                    <span className="text-xl font-bold capitalize">{battleResult.winner.name} won!</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">HP Remaining:</span>
                      <span className="font-bold">{battleResult.winnerHP} / {battleResult.winnerMaxHP}</span>
                    </div>
                    <Progress
                      value={(battleResult.winnerHP / battleResult.winnerMaxHP) * 100}
                      className="h-3"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{battleResult.turns}</div>
                    <div className="text-sm text-muted-foreground">Turns</div>
                  </div>
                  <div className="bg-muted rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-destructive">0</div>
                    <div className="text-sm text-muted-foreground capitalize">HP of {battleResult.loser.name}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold mb-3">Latest moves:</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {battleResult.battleLog.map((log, idx) => (
                      <div key={idx} className="text-sm bg-muted/50 p-2 rounded">
                        <span className="font-semibold capitalize">{log.attacker}</span> dealt{' '}
                        <span className="text-destructive font-bold">{log.damage}</span> damage to{' '}
                        <span className="font-semibold capitalize">{log.defender}</span>
                        {' '} (HP: {log.remainingHP})
                        <div className="text-xs text-muted-foreground">
                          Type {log.attackType} | type x{log.baseTypeMult.toFixed(2)} | STAB x{log.stabMult.toFixed(2)} | weather x{log.weatherMult.toFixed(2)} | total x{log.totalMult.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattlePage;

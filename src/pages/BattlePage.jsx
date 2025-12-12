import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
import PokemonCard from '@/components/PokemonCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Search, Swords, RefreshCw, Users, Gamepad2, LogIn, ShieldAlert, DoorOpen, Sparkles, Zap, Flame } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { onValue, onDisconnect, push, ref, remove, runTransaction, set, update } from 'firebase/database';

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
  const [startMode, setStartMode] = useState('speed'); // speed | left | right | random
  const [battleMode, setBattleMode] = useState('pve'); // pve | pvp
  const { user, authLoading, loginWithGoogle } = useAuth();
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [outgoingInvite, setOutgoingInvite] = useState(null);
  const [inviteWatcher, setInviteWatcher] = useState(null);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [room, setRoom] = useState(null);
  const [pvpSearch, setPvpSearch] = useState('');
  const [pvpFiltered, setPvpFiltered] = useState([]);
  const [selectedMove, setSelectedMove] = useState(null);
  const [showRematchModal, setShowRematchModal] = useState(false);
  const [cardResultModal, setCardResultModal] = useState(null);
  const [cardModalStage, setCardModalStage] = useState('front'); // front -> back -> result
  const [myCardDisplay, setMyCardDisplay] = useState(null);
  const [myCardRevealStage, setMyCardRevealStage] = useState('front'); // front | back
  const [myCardRolling, setMyCardRolling] = useState(false);
  const [pveBattle, setPveBattle] = useState(null);
  const [pveLocked, setPveLocked] = useState(false);
  const pveTimersRef = useRef([]);
  const resetPveBattle = useCallback(() => {
    setPveLocked(false);
    setPveBattle(null);
    pveTimersRef.current.forEach(clearTimeout);
    pveTimersRef.current = [];
  }, []);
  const endNotifiedRef = useRef(false);
  const presenceStatus = useMemo(() => {
    if (activeRoomId) return 'battle';
    return 'online';
  }, [activeRoomId]);
  useEffect(() => {
    endNotifiedRef.current = false;
  }, [activeRoomId]);

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

  useEffect(() => {
    if (pvpSearch) {
      const term = pvpSearch.toLowerCase();
      const list = pokemon.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.types.some((t) => t.type.name.toLowerCase().includes(term))
      );
      setPvpFiltered(list);
    } else {
      setPvpFiltered([]);
    }
  }, [pvpSearch, pokemon]);

  useEffect(() => {
    if (!user) {
      setOnlinePlayers([]);
      setIncomingInvites([]);
      setActiveRoomId(null);
      setRoom(null);
      return;
    }

    const presenceRef = ref(db, `presence/${user.uid}`);
    set(
      presenceRef,
      {
        uid: user.uid,
        name: user.displayName ?? 'Trainer',
        photoURL: user.photoURL ?? '',
        status: presenceStatus,
        lastSeen: Date.now(),
      }
    );
    const disconnect = onDisconnect(presenceRef);
    disconnect.remove();

    return () => {
      remove(presenceRef);
    };
  }, [user, presenceStatus]);

  useEffect(() => {
    if (!user) return;
    const presenceRef = ref(db, `presence/${user.uid}`);
    update(presenceRef, { status: presenceStatus, lastSeen: Date.now(), roomId: activeRoomId ?? null }).catch(() => {});
  }, [user, activeRoomId, presenceStatus]);

  useEffect(() => {
    const presenceRef = ref(db, 'presence');
    const unsub = onValue(presenceRef, (snap) => {
      if (!snap.exists()) {
        setOnlinePlayers([]);
        return;
      }
      const entries = [];
      snap.forEach((child) => {
        entries.push({ uid: child.key, ...child.val() });
      });
      setOnlinePlayers(entries.filter((p) => p.uid !== user?.uid && p.status !== 'battle'));
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const invitesRef = ref(db, `invites/${user.uid}`);
    const unsub = onValue(invitesRef, (snap) => {
      if (!snap.exists()) {
        setIncomingInvites([]);
        return;
      }
      const entries = Object.entries(snap.val() || {}).map(([id, value]) => ({ id, ...value }));
      setIncomingInvites(entries);
      const accepted = entries.find((i) => i.status === 'accepted' && i.roomId);
      if (accepted && !activeRoomId) {
        setActiveRoomId(accepted.roomId);
        remove(ref(db, `invites/${user.uid}/${accepted.id}`)).catch(() => {});
      }
    });
    return () => unsub();
  }, [user, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) {
      setRoom(null);
      return;
    }
    const roomRef = ref(db, `rooms/${activeRoomId}`);
    const unsub = onValue(roomRef, (snap) => {
      if (!snap.exists()) {
        setRoom(null);
        setActiveRoomId(null);
        return;
      }
      const data = snap.val();
      // If room ended or no longer contains this user, clear and return to lobby.
      const missingUser = user && data?.players && !data.players[user.uid];
      const ended = data?.state === 'ended' || !data?.players;
      if (ended || missingUser) {
        if (!endNotifiedRef.current) {
          endNotifiedRef.current = true;
      toast.message('Room closed. Look for another opponent.');
        }
        resetSessionState();
        cleanupRoomIfEmpty(activeRoomId);
        return;
      }
      setRoom({ id: activeRoomId, ...data });
    });
    return () => unsub();
  }, [activeRoomId, user]);

  useEffect(() => {
    const cleanup = () => {
      if (!activeRoomId || !user) return;
      remove(ref(db, `rooms/${activeRoomId}/players/${user.uid}`)).catch(() => {});
      cleanupRoomIfEmpty(activeRoomId);
      update(ref(db, `presence/${user.uid}`), { status: 'online', roomId: null, lastSeen: Date.now() }).catch(() => {});
    };
    window.addEventListener('beforeunload', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
    };
  }, [activeRoomId, user]);

  useEffect(() => {
    if (battleMode === 'pvp') {
      setBattleResult(null);
      setSelectedLeft(null);
      setSelectedRight(null);
      resetPveBattle();
    }
  }, [battleMode, resetPveBattle]);

  const DEFAULT_LEVEL = 100;
  const DEFAULT_IV = 31;
  const DEFAULT_EV = 0;
  const REGION_RANGES = {
    all: { start: 1, end: 1010 },
    kanto: { start: 1, end: 151 },
    johto: { start: 152, end: 251 },
    hoenn: { start: 252, end: 386 },
    sinnoh: { start: 387, end: 493 },
    unova: { start: 494, end: 649 },
    kalos: { start: 650, end: 721 },
    alola: { start: 722, end: 809 },
    galar: { start: 810, end: 905 },
    paldea: { start: 906, end: 1025 },
  };

  const computeBattleStats = (p) => {
    const level = p?.level ?? DEFAULT_LEVEL;
    const ivs = p?.ivs ?? {};
    const evs = p?.evs ?? {};
    const nature = p?.nature ?? {};
    const boost = nature.boost ?? null;
    const lower = nature.lower ?? null;

    const base = (key, fallback = 0) => p?.stats?.find((s) => s.stat.name === key)?.base_stat ?? fallback;
    const iv = (key) => (typeof ivs[key] === 'number' ? ivs[key] : DEFAULT_IV);
    const ev = (key) => (typeof evs[key] === 'number' ? evs[key] : DEFAULT_EV);
    const natureMult = (key) => (boost === key ? 1.1 : lower === key ? 0.9 : 1);

    const calcStat = (key, isHp = false) => {
      const baseVal = base(key, isHp ? 80 : 60);
      if (isHp) {
        return Math.floor(((2 * baseVal + iv(key) + Math.floor(ev(key) / 4)) * level) / 100) + level + 10;
      }
      const raw = Math.floor(((2 * baseVal + iv(key) + Math.floor(ev(key) / 4)) * level) / 100) + 5;
      return Math.floor(raw * natureMult(key));
    };

    return {
      hp: calcStat('hp', true),
      attack: calcStat('attack'),
      defense: calcStat('defense'),
      'special-attack': calcStat('special-attack'),
      'special-defense': calcStat('special-defense'),
      speed: calcStat('speed'),
    };
  };

  const baseHP = (p) => computeBattleStats(p).hp;

  const getRandomPokemonByRegion = (region = 'all') => {
    const range = REGION_RANGES[region] ?? REGION_RANGES.all;
    const pool = pokemon.filter((p) => p.id >= range.start && p.id <= range.end);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const getStatValue = (p, statKey) => {
    const stats = computeBattleStats(p);
    const map = {
      strength: stats.hp ?? 0,
      attack: stats.attack ?? 0,
      defense: stats.defense ?? 0,
      agility: stats.speed ?? 0,
    };
    return map[statKey] ?? 0;
  };

  const serializePokemon = (p) => ({
    id: p.id,
    name: p.name,
    types: p.types,
    stats: p.stats,
    sprites: {
      front_default: p.sprites?.front_default ?? '',
      other: {
        'official-artwork': {
          front_default: p.sprites?.other?.['official-artwork']?.front_default ?? '',
        },
      },
    },
    moves: (p.moves ?? []).slice(0, 6).map((m) => m.move?.name ?? 'attack'),
  });

  const formatMoveName = (name) =>
    (name || 'attack')
      .replace(/-/g, ' ')
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');

  const formatPokemonName = (name) => {
    if (!name) return 'Pokemon';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const estimateLevel = (p) => {
    if (!p?.stats) return 50;
    const hpStat = p.stats.find((s) => s.stat.name === 'hp')?.base_stat ?? 60;
    const atkStat = p.stats.find((s) => s.stat.name === 'attack')?.base_stat ?? 60;
    const defStat = p.stats.find((s) => s.stat.name === 'defense')?.base_stat ?? 60;
    return Math.min(100, Math.max(20, Math.round((hpStat + atkStat + defStat) / 3)));
  };

  const getPokemonMoves = (p) => {
    const rawMoves = p?.moves ?? p?.pokemon?.moves ?? [];
    const atk = p?.stats?.find((s) => s.stat.name === 'attack')?.base_stat ?? 60;
    const basePower = Math.max(40, Math.floor(atk / 2));
    const icons = [Swords, Flame, Zap, Sparkles];
    if (!rawMoves.length) {
      return ['Quick Strike', 'Charge', 'Guard Break', 'Ace Hit'].map((name, idx) => ({
        name,
        power: basePower + idx * 10,
        icon: icons[idx % icons.length],
      }));
    }
    return rawMoves.slice(0, 4).map((m, idx) => ({
      name: formatMoveName(m.move?.name ?? m),
      power: basePower + idx * 10,
      icon: icons[idx % icons.length],
    }));
  };

  const decideFirstTurn = useCallback(() => {
    if (!selectedLeft || !selectedRight) return 'left';
    const speed1 = computeBattleStats(selectedLeft).speed ?? 50;
    const speed2 = computeBattleStats(selectedRight).speed ?? 50;
    if (startMode === 'speed') return speed1 >= speed2 ? 'left' : 'right';
    if (startMode === 'right') return 'right';
    if (startMode === 'random') return Math.random() < 0.5 ? 'left' : 'right';
    return 'left';
  }, [selectedLeft, selectedRight, startMode]);

  const pushPveTimer = (id) => {
    pveTimersRef.current.push(id);
  };

  const [nowTs, setNowTs] = useState(Date.now());
  const opponentId = useMemo(() => {
    if (!room?.players) return null;
    return Object.keys(room.players).find((pid) => pid !== user?.uid) ?? null;
  }, [room, user]);
  const lastRevealRef = useRef({ round: 0, revealed: false });
  const cardStageTimerRef = useRef([]);
  const cardRollTimerRef = useRef(null);
  const prevHandRef = useRef(null);
  const prevCardRoundRef = useRef(0);

  const resetSessionState = () => {
    setOutgoingInvite(null);
    inviteWatcher?.();
    setInviteWatcher(null);
    setActiveRoomId(null);
    setRoom(null);
    setShowPlayersModal(false);
    setShowLog(false);
    if (user) {
      update(ref(db, `presence/${user.uid}`), { status: 'online', roomId: null, lastSeen: Date.now() }).catch(() => {});
    }
  };

  const selfPlayer = room?.players?.[user?.uid] ?? null;
  const opponentPlayer = opponentId ? room?.players?.[opponentId] ?? null : null;
  const bothPlayersInRoom = Boolean(selfPlayer && opponentPlayer);
  const isMyTurn = room?.currentTurn === user?.uid;
  const matchFinished = room?.state === 'finished';
  const pendingInvites = incomingInvites.filter((inv) => inv.status === 'pending');
  const rematchRequest = room?.rematchRequest ?? null;
  const opponentRematchPending =
    rematchRequest && rematchRequest.status === 'pending' && rematchRequest.fromUid !== user?.uid;
  const myRematchPending =
    rematchRequest && rematchRequest.status === 'pending' && rematchRequest.fromUid === user?.uid;
  const isInRoom = Boolean(room?.players?.[user?.uid]);
  const selfName = selfPlayer?.name ?? user?.displayName ?? 'You';
  const opponentName = opponentPlayer?.name ?? 'Opponent';
  const cardBattle = room?.cardBattle ?? null;
  const cardRound = cardBattle?.round ?? 0;
  const cardMaxRounds = cardBattle?.maxRounds ?? room?.cardBestOf ?? 3;
  const outgoingInviteSecondsLeft = outgoingInvite
    ? Math.max(0, 60 - Math.floor((nowTs - (outgoingInvite.createdAt ?? nowTs)) / 1000))
    : 0;
  const cardScores = cardBattle?.scores ?? {};
  const cardRevealed = Boolean(cardBattle?.revealed);
  const cardMatchWinner = cardBattle?.matchWinner ?? null;
  const cardWinnerRound = cardBattle?.winnerRound ?? null;
  const myCard = user ? cardBattle?.hands?.[user.uid] : null;
  const oppCard = opponentId ? cardBattle?.hands?.[opponentId] : null;
  const selectedStat = cardBattle?.selectedStat ?? null;
  const chooserUid = cardBattle?.chooserUid ?? null;
  const myCardChoice = selectedStat && chooserUid === user?.uid ? selectedStat : null;
  const oppCardChoice = selectedStat && chooserUid === opponentId ? selectedStat : null;
  const cardChooserName =
    chooserUid === user?.uid ? 'You choose this round' : chooserUid === opponentId ? `${opponentName} chooses` : 'Random chooser';
  const decliningRef = useRef(new Set());
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    endNotifiedRef.current = false;
    setShowRematchModal(Boolean(opponentRematchPending));
    if (!opponentRematchPending) {
      setSelectedMove(null);
    }
  }, [opponentRematchPending, activeRoomId]);
  useEffect(() => {
    if (room?.gameMode !== 'cards') {
      setCardResultModal(null);
      return;
    }
    if (!cardBattle || !cardRevealed || !selectedStat) return;
    const round = cardBattle.round ?? 0;
    if (lastRevealRef.current.round === round && lastRevealRef.current.revealed) return;
    if (!myCard || !oppCard) return;
    const myVal = getStatValue(myCard, selectedStat);
    const oppVal = getStatValue(oppCard, selectedStat);
    const outcome = cardWinnerRound === null ? 'tie' : cardWinnerRound === user?.uid ? 'win' : 'lose';
    setCardResultModal({
      outcome,
      stat: selectedStat,
      myVal,
      oppVal,
      myCardSnapshot: myCard,
      oppCardSnapshot: oppCard,
    });
    lastRevealRef.current = { round, revealed: true };
  }, [room?.gameMode, cardBattle, cardRevealed, selectedStat, myCard, oppCard, cardWinnerRound, user?.uid]);
  useEffect(() => {
    cardStageTimerRef.current.forEach(clearTimeout);
    cardStageTimerRef.current = [];
    if (!cardResultModal) return;
    setCardModalStage('front');
    cardStageTimerRef.current.push(
      setTimeout(() => setCardModalStage('back'), 1200),
      setTimeout(() => setCardModalStage('result'), 2400)
    );
    return () => {
      cardStageTimerRef.current.forEach(clearTimeout);
      cardStageTimerRef.current = [];
    };
  }, [cardResultModal]);
  useEffect(() => {
    if (cardBattle?.round !== prevCardRoundRef.current) {
      setCardResultModal(null);
      setCardModalStage('front');
      prevCardRoundRef.current = cardBattle?.round ?? 0;
    }
  }, [cardBattle?.round]);
  const handleRevealBack = () => {
    if (myCardRolling) return;
    setMyCardRevealStage('back');
  };
  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    pveTimersRef.current.forEach(clearTimeout);
    pveTimersRef.current = [];
  }, []);

  // Auto-decline expired invites (60s)
  useEffect(() => {
    pendingInvites.forEach((invite) => {
      const created = invite.createdAt ?? nowTs;
      const expired = nowTs - created > 60000;
      if (expired && !decliningRef.current.has(invite.id)) {
        decliningRef.current.add(invite.id);
        declineInvite(invite).finally(() => {
          decliningRef.current.delete(invite.id);
        });
      }
    });
  }, [pendingInvites, nowTs]);

  useEffect(() => {
    if (!pveBattle?.winner) return;
    if (!selectedLeft || !selectedRight) return;
    const winnerPokemon = pveBattle.winner === 'left' ? selectedLeft : selectedRight;
    const loserPokemon = pveBattle.winner === 'left' ? selectedRight : selectedLeft;
    const winnerHP = pveBattle.winner === 'left' ? pveBattle.hpLeft : pveBattle.hpRight;
    const winnerMaxHP = pveBattle.winner === 'left' ? pveBattle.maxLeft : pveBattle.maxRight;
    setBattleResult({
      winner: winnerPokemon,
      loser: loserPokemon,
      turns: pveBattle.log?.length ?? 0,
      winnerHP,
      winnerMaxHP,
      battleLog: pveBattle.log ?? [],
    });
    // clear selections after capturing the result so the result card stands out
    setSelectedLeft(null);
    setSelectedRight(null);
    setSearchLeft('');
    setSearchRight('');
    setFilteredLeft([]);
    setFilteredRight([]);
  }, [pveBattle, selectedLeft, selectedRight]);
  const selectLeft = (p) => {
    resetPveBattle();
    setBattleResult(null);
    setSelectedLeft(p);
    setSearchLeft('');
    setFilteredLeft([]);
  };

  const selectRight = (p) => {
    resetPveBattle();
    setBattleResult(null);
    setSelectedRight(p);
    setSearchRight('');
    setFilteredRight([]);
  };

  const toggleStarter = (side) => {
    setStartMode((prev) => (prev === side ? 'speed' : side));
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
    const weatherCfg = WEATHER_BONUS.clear;
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

    const attackerStats = computeBattleStats(attacker);
    const defenderStats = computeBattleStats(defender);
    const atk = attackerStats.attack ?? 50;
    const def = defenderStats.defense ?? 50;
    const spd = attackerStats.speed ?? 50;
    const base = Math.max(10, Math.floor((atk / Math.max(def, 1)) * 20));
    const speedBonus = Math.floor(spd / 20);
    const randomFactor = Math.random() * 0.3 + 0.85;
    const damage = Math.floor((base + speedBonus) * randomFactor * best.totalMult);
    return { damage, ...best };
  };

  const maybeStartRoom = useCallback(
    async (roomId) => {
      await runTransaction(ref(db, `rooms/${roomId}`), (current) => {
        if (!current || current.state !== 'selecting' || current.gameMode === 'cards') return current;
        const ids = Object.keys(current.players || {});
        const ready = ids.every((pid) => current.players[pid]?.pokemon && current.players[pid]?.ready);
        if (!ready || current.currentTurn) return current;
        const first = ids[Math.floor(Math.random() * ids.length)];
        return { ...current, state: 'in-progress', currentTurn: first, log: current.log ?? [] };
      });
    },
    []
  );

  const setPokemonForRoom = async (p) => {
    if (!room || !user) return;
    const hp = baseHP(p);
    await update(ref(db, `rooms/${room.id}/players/${user.uid}`), {
      pokemon: serializePokemon(p),
      hp,
      maxHp: hp,
      ready: false,
    });
  };

  const markReadyForRoom = async () => {
    if (!room || !user) return;
    await update(ref(db, `rooms/${room.id}/players/${user.uid}`), { ready: true });
    await maybeStartRoom(room.id);
  };

  const setGameMode = async (mode) => {
    if (!room || !user || room.adminUid !== user.uid) return;
    const updates =
      mode === 'cards'
        ? {
            gameMode: 'cards',
            state: 'card-selecting',
            cardBattle: null,
          }
        : {
            gameMode: 'classic',
            state: 'selecting',
            cardBattle: null,
          };
    await update(ref(db, `rooms/${room.id}`), updates);
  };

  const setRegionFilter = async (region) => {
    if (!room || !user || room.adminUid !== user.uid) return;
    await update(ref(db, `rooms/${room.id}`), { regionFilter: region, cardBattle: null });
  };

  const setCardBestOf = async (val) => {
    if (!room || !user || room.adminUid !== user.uid) return;
    const parsed = Number(val);
    const best = parsed === 5 ? 5 : 3;
    await update(ref(db, `rooms/${room.id}`), { cardBestOf: best });
  };

  const takeTurn = async (move) => {
    if (!room || !user || room.currentTurn !== user.uid) return;
    if (!opponentId) return;
    const moveName = move?.name ?? 'Attack';
    const movePower = move?.power ?? 0;
    const roomRef = ref(db, `rooms/${room.id}`);
    await runTransaction(roomRef, (current) => {
      if (!current || current.state !== 'in-progress' || current.currentTurn !== user.uid) return current;
      const players = current.players || {};
      const attacker = players[user.uid];
      const defender = players[opponentId];
      if (!attacker?.pokemon || !defender?.pokemon) return current;

      const dmg = calcDamage(attacker.pokemon, defender.pokemon);
      const defenderHP = defender.hp ?? baseHP(defender.pokemon);
      const nextHP = Math.max(0, defenderHP - dmg.damage);
      const log = [
        ...(current.log ?? []).slice(-20),
        {
          turn: (current.log?.length ?? 0) + 1,
          attacker: attacker.name ?? 'You',
          defender: defender.name ?? 'Opponent',
          moveName,
          movePower,
          ...dmg,
          remainingHP: nextHP,
        },
      ];

      const updatedPlayers = {
        ...players,
        [opponentId]: { ...defender, hp: nextHP },
      };

      const finished = nextHP <= 0;
      return {
        ...current,
        players: updatedPlayers,
        log,
        state: finished ? 'finished' : 'in-progress',
        winnerUid: finished ? user.uid : null,
        currentTurn: finished ? null : opponentId,
      };
    });
  };

  const startCardRound = async () => {
    if (!room || !pokemon.length) return;
    setCardResultModal(null);
    setCardModalStage('front');
    const roomRef = ref(db, `rooms/${room.id}`);
    await runTransaction(roomRef, (current) => {
      if (!current) return current;
      if (current.gameMode !== 'cards') return current;
      const playerIds = Object.keys(current.players || {});
      const round = (current.cardBattle?.round ?? 0) + 1;
      const bestOf = current.cardBestOf ?? current.cardBattle?.maxRounds ?? 3;
      if (round > bestOf && current.cardBattle?.matchWinner) return current;
      const prevWinner = current.cardBattle?.winnerRound ?? null;
      const chooserUid =
        prevWinner && playerIds.includes(prevWinner)
          ? prevWinner
          : playerIds[Math.floor(Math.random() * Math.max(playerIds.length, 1))];
      const hands = {};
      playerIds.forEach((pid) => {
        const rnd = getRandomPokemonByRegion(current.regionFilter || 'all');
        if (rnd) hands[pid] = serializePokemon(rnd);
      });
      if (Object.keys(hands).length < 2) return current;
      return {
        ...current,
        cardBattle: {
          round,
          maxRounds: bestOf,
          region: current.regionFilter || 'all',
          scores: current.cardBattle?.scores || {},
          hands,
          choices: {},
          selectedStat: null,
          chooserUid,
          revealed: false,
          winnerRound: null,
          matchWinner: current.cardBattle?.matchWinner ?? null,
        },
      };
    });
  };

  const pickCardStat = async (statKey) => {
    if (!room || !user || room.gameMode !== 'cards') return;
    const roomRef = ref(db, `rooms/${room.id}`);
    await runTransaction(roomRef, (current) => {
      if (!current?.cardBattle || current.cardBattle.matchWinner) return current;
      const battle = current.cardBattle;
      if (battle.revealed) return current;
      if (battle.chooserUid && battle.chooserUid !== user.uid) return current;
      const choices = { ...(battle.choices || {}) };
      if (choices[user.uid] === statKey) {
        delete choices[user.uid];
        return {
          ...current,
          cardBattle: {
            ...battle,
            choices,
            selectedStat: null,
            revealed: false,
            winnerRound: null,
          },
        };
      }
      choices[user.uid] = statKey;
      const selectedStat = statKey;
      let scores = { ...(battle.scores || {}) };
      let revealed = battle.revealed;
      let winnerRound = battle.winnerRound ?? null;
      let matchWinner = battle.matchWinner ?? null;
      if (selectedStat && !battle.revealed) {
        const playerIds = Object.keys(current.players || {});
        if (playerIds.length === 2) {
          const [a, b] = playerIds;
          const statA = getStatValue(battle.hands?.[a], selectedStat);
          const statB = getStatValue(battle.hands?.[b], selectedStat);
          if (statA > statB) {
            scores[a] = (scores[a] || 0) + 1;
            winnerRound = a;
          } else if (statB > statA) {
            scores[b] = (scores[b] || 0) + 1;
            winnerRound = b;
          } else {
            winnerRound = null;
          }
          revealed = true;
          const maxScore = Math.max(scores[a] || 0, scores[b] || 0);
          const needed = Math.ceil((battle.maxRounds ?? 3) / 2);
          if (maxScore >= needed || battle.round >= (battle.maxRounds ?? 3)) {
            matchWinner =
              (scores[a] || 0) === (scores[b] || 0) ? null : (scores[a] || 0) > (scores[b] || 0) ? a : b;
          }
        }
      }
      return {
        ...current,
        cardBattle: {
          ...battle,
          choices,
          scores,
          revealed,
          winnerRound,
          selectedStat,
          matchWinner,
          chooserUid: winnerRound ?? battle.chooserUid,
        },
      };
    });
  };

  const sendInvite = async (player) => {
    if (!user) {
      setShowLoginGate(true);
      return;
    }
    if (outgoingInvite && nowTs - (outgoingInvite.createdAt ?? 0) < 60000) {
      toast.info('You already have a pending invite. Wait or cancel it first.');
      return;
    }
    try {
      const inviteRef = push(ref(db, `invites/${player.uid}`));
      if (player.status === 'battle') {
        toast.error('Player is already in a battle.');
        return;
      }
      const payload = {
        fromUid: user.uid,
        fromName: user.displayName ?? 'Trainer',
        fromPhoto: user.photoURL ?? '',
        status: 'pending',
        createdAt: Date.now(),
      };
      await set(inviteRef, payload);
      inviteWatcher?.();
      const watcher = onValue(inviteRef, (snap) => {
        const data = snap.val();
        if (!data) return;
        if (data.status === 'accepted' && data.roomId) {
          toast.success(`${player.name ?? 'Player'} accepted the invite!`);
          setActiveRoomId(data.roomId);
          setShowPlayersModal(false);
          setOutgoingInvite(null);
          inviteWatcher?.();
          setInviteWatcher(null);
        }
        if (data.status === 'declined') {
          toast.error(`${player.name ?? 'Player'} declined the invite.`);
          inviteWatcher?.();
          setInviteWatcher(null);
          setOutgoingInvite(null);
        }
      });
      setInviteWatcher(() => watcher);
      setOutgoingInvite({
        id: inviteRef.key,
        targetUid: player.uid,
        targetName: player.name ?? 'Player',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('Error sending invite', err);
      toast.error('Could not send the invite.');
    }
  };

  const cancelOutgoingInvite = async () => {
    if (!outgoingInvite) return;
    try {
      await remove(ref(db, `invites/${outgoingInvite.targetUid}/${outgoingInvite.id}`));
    } catch (err) {
      console.error('Error cancelling invite', err);
    }
    inviteWatcher?.();
    setInviteWatcher(null);
    setOutgoingInvite(null);
  };

  const acceptInvite = async (invite) => {
    if (!user) {
      setShowLoginGate(true);
      return;
    }
    try {
      const roomRef = push(ref(db, 'rooms'));
      const payload = {
        state: 'selecting',
        createdAt: Date.now(),
        currentTurn: null,
        log: [],
        gameMode: 'classic',
        regionFilter: 'all',
        cardBestOf: 3,
        adminUid: invite.fromUid,
        players: {
          [user.uid]: {
            uid: user.uid,
            name: user.displayName ?? 'Trainer',
            photoURL: user.photoURL ?? '',
          },
          [invite.fromUid]: {
            uid: invite.fromUid,
            name: invite.fromName ?? 'Trainer',
            photoURL: invite.fromPhoto ?? '',
          },
        },
      };
      await set(roomRef, payload);
      await update(ref(db, `invites/${user.uid}/${invite.id}`), {
        status: 'accepted',
        roomId: roomRef.key,
      });
      setActiveRoomId(roomRef.key);
      toast.success('Invite accepted! Starting room...');
    } catch (err) {
      console.error('Error accepting invite', err);
      toast.error('Could not accept the invite.');
    }
  };

  const declineInvite = async (invite) => {
    if (!user) return;
    await update(ref(db, `invites/${user.uid}/${invite.id}`), { status: 'declined' });
  };

  const cleanupRoomIfEmpty = async (roomId) => {
    if (!roomId) return;
    try {
      await runTransaction(ref(db, `rooms/${roomId}`), (current) => {
        if (!current) return current;
        const players = current.players ? Object.keys(current.players) : [];
        if (players.length <= 1) {
          return null;
        }
        return current;
      });
    } catch (err) {
      console.error('Error cleaning room', err);
    }
  };

  const leaveRoom = async () => {
    const roomId = activeRoomId;
    resetSessionState();
    if (roomId && user) {
      try {
        await remove(ref(db, `rooms/${roomId}/players/${user.uid}`));
        await update(ref(db, `rooms/${roomId}`), {
          rematchRequest: null,
          state: 'ended',
          currentTurn: null,
        });
        update(ref(db, `presence/${user.uid}`), { status: 'online', roomId: null, lastSeen: Date.now() }).catch(() => {});
        await cleanupRoomIfEmpty(roomId);
      } catch (err) {
        console.error('Error leaving room', err);
      }
    }
  };

  const resetRoomBattle = async () => {
    if (!room) return;
    const updates = {
      state: 'selecting',
      currentTurn: null,
      winnerUid: null,
      log: [],
      rematchRequest: null,
      cardBattle: null,
    };
    Object.keys(room.players || {}).forEach((pid) => {
      updates[`players/${pid}/pokemon`] = null;
      updates[`players/${pid}/hp`] = null;
      updates[`players/${pid}/maxHp`] = null;
       updates[`players/${pid}/ready`] = false;
    });
    await update(ref(db, `rooms/${room.id}`), updates);
  };

  const requestRematch = async () => {
    if (!room || !user) return;
    if (room.rematchRequest?.status === 'pending') {
      toast.message('Waiting for the opponent to respond.');
      return;
    }
    await update(ref(db, `rooms/${room.id}`), {
      rematchRequest: {
        fromUid: user.uid,
        fromName: user.displayName ?? 'Trainer',
        status: 'pending',
        createdAt: Date.now(),
      },
    });
    toast.success('Rematch request sent.');
  };

  const acceptRematch = async () => {
    if (!room || !room.rematchRequest) return;
    await resetRoomBattle();
  };

  const declineRematch = async () => {
    if (!room) return;
    // Update request then leave the room (recusar sai da sala)
    await update(ref(db, `rooms/${room.id}/rematchRequest`), { status: 'declined' }).catch(() => {});
    await leaveRoom();
  };

  const resolvePveTurn = useCallback(
    (attackerSide, move) => {
      if (!selectedLeft || !selectedRight) return;
      if (!pveBattle?.active || pveBattle?.winner) return;
      if (pveBattle.turn && pveBattle.turn !== attackerSide) return;
      if (pveLocked) return;

      const attacker = attackerSide === 'left' ? selectedLeft : selectedRight;
      const defender = attackerSide === 'left' ? selectedRight : selectedLeft;
      const defenderSide = attackerSide === 'left' ? 'right' : 'left';
      const moveName = move?.name ?? 'Ataque';
      const dmgPack = calcDamage(attacker, defender);
      const movePower = move?.power ?? 70;
      const scaledDamage = Math.max(5, Math.round(dmgPack.damage * (movePower / 80)));

      setPveLocked(true);
      setPveBattle((prev) => {
        if (!prev?.active) return prev;
        const currentTargetHP = defenderSide === 'left' ? prev.hpLeft : prev.hpRight;
        const nextHP = Math.max(0, currentTargetHP - scaledDamage);
        const logEntry = {
          turn: (prev.log?.length ?? 0) + 1,
          attacker: attacker.name,
          defender: defender.name,
          moveName,
          movePower,
          damage: scaledDamage,
          remainingHP: nextHP,
          attackType: dmgPack.attackType,
          totalMult: dmgPack.totalMult,
        };
        const next = {
          ...prev,
          message: `${formatPokemonName(attacker.name)} used ${moveName}!`,
          anim: {
            ...(prev.anim || {}),
            [attackerSide]: 'attack',
            [defenderSide]: 'hit',
          },
          log: [...(prev.log ?? []), logEntry].slice(-8),
          lastMove: logEntry,
        };
        if (defenderSide === 'left') {
          next.hpLeft = nextHP;
        } else {
          next.hpRight = nextHP;
        }
        if (nextHP <= 0) {
          next.winner = attackerSide;
          next.turn = null;
          next.active = false;
          next.message = `${formatPokemonName(attacker.name)} won!`;
        } else {
          next.turn = defenderSide;
        }
        return next;
      });

      pushPveTimer(
        setTimeout(() => {
          setPveBattle((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              anim: { ...(prev.anim || {}), [attackerSide]: '', [defenderSide]: '' },
            };
          });
          setPveLocked(false);
        }, 550)
      );
    },
    [selectedLeft, selectedRight, pveBattle, pveLocked]
  );

  useEffect(() => {
    if (battleMode !== 'pve') return;
    if (!pveBattle?.active || pveBattle?.winner || pveLocked) return;
    if (!pveBattle.turn) return;
    const attackerSide = pveBattle.turn;
    const attacker = attackerSide === 'left' ? selectedLeft : selectedRight;
    if (!attacker) return;
    const moves = getPokemonMoves(attacker);
    const move = moves[Math.floor(Math.random() * moves.length)];
    const timerId = setTimeout(() => resolvePveTurn(attackerSide, move), 3000);
    pushPveTimer(timerId);
    return () => clearTimeout(timerId);
  }, [battleMode, pveBattle?.active, pveBattle?.winner, pveBattle?.turn, pveLocked, selectedLeft, selectedRight, resolvePveTurn]);

  const startPveBattle = () => {
    if (!selectedLeft || !selectedRight) {
      toast.error('Select two Pokemon to start the battle.');
      return;
    }
    resetPveBattle();
    setBattleResult(null);
    const hpLeft = baseHP(selectedLeft);
    const hpRight = baseHP(selectedRight);
    const first = decideFirstTurn();
    setPveBattle({
      active: true,
      turn: first,
      hpLeft,
      hpRight,
      maxLeft: hpLeft,
      maxRight: hpRight,
      log: [],
      anim: { left: 'enter', right: 'enter' },
      message:
        first === 'left'
          ? `${formatPokemonName(selectedLeft.name)} enters the field!`
          : `${formatPokemonName(selectedRight.name)} takes the lead!`,
      winner: null,
      lastMove: null,
    });
    if (first === 'right') {
      pushPveTimer(
        setTimeout(() => {
          const enemyMoves = getPokemonMoves(selectedRight);
          const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)];
          resolvePveTurn('right', enemyMove);
        }, 850)
      );
    }
  };

  const reset = () => {
    resetPveBattle();
    setSelectedLeft(null);
    setSelectedRight(null);
    setBattleResult(null);
    setSearchLeft('');
    setSearchRight('');
    setFilteredLeft([]);
    setFilteredRight([]);
  };

  const leftPlaceholder = useMemo(() => 'Search Pokemon...', []);
  const rightPlaceholder = leftPlaceholder;
  const leftHPCurrent = pveBattle?.hpLeft ?? (selectedLeft ? baseHP(selectedLeft) : 0);
  const rightHPCurrent = pveBattle?.hpRight ?? (selectedRight ? baseHP(selectedRight) : 0);
  const leftHPMax = pveBattle?.maxLeft ?? (selectedLeft ? baseHP(selectedLeft) : 1);
  const rightHPMax = pveBattle?.maxRight ?? (selectedRight ? baseHP(selectedRight) : 1);
  const leftHPPercent = Math.max(0, Math.min(100, Math.round((leftHPCurrent / leftHPMax) * 100)));
  const rightHPPercent = Math.max(0, Math.min(100, Math.round((rightHPCurrent / rightHPMax) * 100)));
  const isPlayerTurn = pveBattle?.turn === 'left';
  const pveReady = Boolean(selectedLeft && selectedRight);
  const pveWinnerSide = pveBattle?.winner ?? null;
  const autoSimPve = battleMode === 'pve';
  useEffect(() => {
    const currentId = myCard?.id ?? null;
    if (!currentId || prevHandRef.current === currentId) return;
    prevHandRef.current = currentId;
    setMyCardRevealStage('front');
    setMyCardRolling(true);
    const total = Math.floor(Math.random() * 6) + 3; // 3 to 8 swaps
    let count = 0;
    const rollFn = () => {
      count += 1;
      if (count >= total) {
        setMyCardDisplay(myCard);
        setMyCardRolling(false);
        clearInterval(cardRollTimerRef.current);
        cardRollTimerRef.current = null;
      } else {
        const pool = pokemon.length ? pokemon : [myCard];
        const rnd = pool[Math.floor(Math.random() * pool.length)];
        setMyCardDisplay(rnd);
      }
    };
    rollFn();
    cardRollTimerRef.current = setInterval(rollFn, 450);
    return () => {
      if (cardRollTimerRef.current) {
        clearInterval(cardRollTimerRef.current);
        cardRollTimerRef.current = null;
      }
    };
  }, [myCard, pokemon]);
  const cardStatOptions = [
    { key: 'strength', label: 'Strength (HP)' },
    { key: 'attack', label: 'Attack' },
    { key: 'defense', label: 'Defense' },
    { key: 'agility', label: 'Agility (Speed)' },
  ];
  const SPECIAL_IDS = new Set([
    144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 716, 717, 718, 719, 720, 721, 785, 786, 787, 788, 791, 792, 800, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008,
  ]);
  const isSpecialCard = (poke) => {
    if (!poke) return false;
    const statTotal = Array.isArray(poke.stats) ? poke.stats.reduce((sum, s) => sum + (s?.base_stat ?? 0), 0) : 0;
    return SPECIAL_IDS.has(poke.id) || statTotal >= 600;
  };
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

  const renderFrontTeaserCard = (poke) => {
    if (!poke) return null;
    const primaryType = poke.types?.[0]?.type?.name ?? 'normal';
    const palette = getCardPalette(primaryType);
    return (
      <div
        className={`relative w-full max-w-[280px] mx-auto aspect-[3/4] rounded-2xl border-4 bg-gradient-to-b ${palette.from} ${palette.to} shadow-[0_10px_35px_rgba(0,0,0,0.35)] ring-4 ${palette.ring} overflow-hidden flex`}
        style={{ backgroundImage: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0, transparent 38%)` }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="flex-1 p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs font-bold bg-white/90 text-black">
              #{String(poke.id).padStart(3, '0')}
            </Badge>
            <div className="text-base sm:text-lg font-bold text-white drop-shadow-sm capitalize">
              {formatPokemonName(poke.name)}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center flex-1">
            <img
              src={poke.sprites?.other?.['official-artwork']?.front_default ?? poke.sprites?.front_default}
              alt={poke.name}
              className="w-36 h-36 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            />
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {(poke.types ?? []).map((t) => (
              <Badge key={t.type.name} variant="outline" className="text-xs capitalize bg-white/18 border-white/30 text-white">
                {t.type.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderElmaCard = (poke, { hidden = false, reveal = false, selectedStat = null, onSelectStat = null } = {}) => {
    if (!poke && hidden) {
      return (
        <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] rounded-2xl border-4 border-slate-400 bg-gradient-to-b from-slate-200 to-slate-400 shadow-lg flex items-center justify-center text-4xl font-extrabold text-slate-600">
          ?
        </div>
      );
    }
    if (!poke) return null;
    if (hidden && !reveal) {
      return (
        <div className="relative w-full max-w-[280px] mx-auto aspect-[3/4] rounded-2xl border-4 border-slate-400 bg-gradient-to-b from-slate-200 to-slate-400 shadow-lg flex items-center justify-center text-4xl font-extrabold text-slate-600">
          ?
        </div>
      );
    }
    const primaryType = poke.types?.[0]?.type?.name ?? 'normal';
    const palette = getCardPalette(primaryType);
    const textureMap = {
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
    const emblemMap = {
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
    const sprite =
      poke.sprites?.front_default ??
      poke.sprites?.other?.['official-artwork']?.front_default ??
      poke.sprites?.front_shiny;
    const stats = {
      strength: getStatValue(poke, 'strength'),
      attack: getStatValue(poke, 'attack'),
      defense: getStatValue(poke, 'defense'),
      agility: getStatValue(poke, 'agility'),
    };
    const special = isSpecialCard(poke);
    return (
        <div
          className={`relative w-full max-w-[280px] mx-auto aspect-[3/4] rounded-2xl border-4 bg-gradient-to-b ${palette.from} ${palette.to} shadow-[0_10px_35px_rgba(0,0,0,0.35)] ring-4 ${palette.ring} overflow-hidden flex ${special ? 'ring-amber-300/80 shadow-[0_0_28px_rgba(255,193,7,0.45)]' : ''}`}
          style={{ backgroundImage: textureMap[primaryType] ?? textureMap.normal }}
        >
        <div
          className="absolute left-0 top-0 text-lg bottom-0 w-10 bg-black/70 text-white text-base font-bold flex items-center justify-center tracking-wider"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          #{poke.id} - {formatPokemonName(poke.name)}
        </div>
        <div className="flex-1 pl-10 pr-3 py-3 flex flex-col gap-3">
          <div className="absolute right-2 top-2 text-xs font-bold tracking-wide opacity-80 drop-shadow-sm bg-black/30 text-white px-2 py-1 rounded">
            {emblemMap[primaryType] ?? 'STAR'}
          </div>
          {special && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {sprite && (
                <img src={sprite} alt={poke.name} className="w-28 h-28 object-contain drop-shadow-lg" />
              )}
            </div>
          </div>
          <div className="space-y-2 text-sm font-semibold mt-1 px-2">
            {cardStatOptions.map((opt) => {
              const value = reveal || !hidden ? stats[opt.key] : '?';
              const color =
                opt.key === 'strength'
                  ? 'text-amber-100 font-bold'
                  : opt.key === 'attack'
                  ? 'text-red-100 font-bold'
                  : opt.key === 'defense'
                  ? 'text-emerald-100 font-bold'
                  : 'text-yellow-100 font-bold';
              const isSelected = selectedStat === opt.key;
              const selectable = Boolean(onSelectStat);
              return (
                <div
                  key={opt.key}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 border shadow-inner transition bg-gradient-to-r from-black/35 to-black/10 ${
                    isSelected ? 'border-white ring-2 ring-white/70 shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'border-white/10'
                  } ${selectable ? 'cursor-pointer hover:from-black/45 hover:to-black/20' : 'opacity-60'}`}
                  onClick={() => selectable && onSelectStat(opt.key)}
                >
                  <span className={`${color} drop-shadow-sm uppercase`}>{opt.label.replace(' (HP)', '')}</span>
                  <span className="text-white text-base tracking-tight font-bold">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <Header />
      
      <div className="container mx-auto px-4 pt-3 sm:pt-6 md:pt-8 pb-24 md:pb-12">
        <div className="max-w-6xl mx-auto">
          {!bothPlayersInRoom && (
            <>
              <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gradient hidden sm:block">
                Pokemon Battle
              </h1>
              <p className="text-center text-muted-foreground mb-8 hidden sm:block">
                Select two Pokemon and simulate an epic battle!
              </p>
            </>
          )}
          
          {!isInRoom && (
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Button
                variant="outline"
                onClick={() => setBattleMode('pve')}
                className={`gap-2 border-sky-700 hover:border-sky-700 ${
                  battleMode === 'pve'
                    ? 'bg-sky-700 text-white hover:bg-sky-600 hover:text-white'
                    : 'text-sky-800 hover:bg-sky-100 hover:text-sky-900'
                }`}
              >
                <Gamepad2 className="h-4 w-4" />
                PC vs PC
              </Button>
              <Button
                variant={battleMode === 'pvp' ? 'default' : 'outline'}
                onClick={() => {
                  setBattleMode('pvp');
                  if (!user) setShowLoginGate(true);
                }}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Player vs Player
              </Button>
            </div>
          )}

          {battleMode === 'pve' && (
            <>
          <div className={`grid grid-cols-2 gap-5 md:gap-8 mb-8 ${pveBattle?.active ? 'hidden' : ''}`}>
            <div className="flex flex-col gap-2 col-span-2">
              <div className="hidden sm:flex items-center justify-center text-sm text-muted-foreground px-1 text-center">
                Click the indicator next to each Pokemon to choose who starts. If none selected, the fastest starts.
              </div>
            </div>

            {/* Left Pokemon */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStarter('left')}
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                    startMode === 'left' ? 'border-primary bg-primary/20' : 'border-border bg-background'
                  }`}
                  aria-label="Select Pokemon 1 to start"
                >
                  {startMode === 'left' && <span className="h-3 w-3 rounded-full bg-primary" />}
                </button>
                <h3 className="text-xl font-bold text-center">Pokemon 1</h3>
              </div>

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
                    <div className="bg-card border rounded-lg divide-y max-h-64 md:max-h-80 overflow-y-auto">
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
                <div className="space-y-3">
                  <div className="pointer-events-none max-w-xs w-full mx-auto">
                    <PokemonCard pokemon={selectedLeft} />
                  </div>
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLeft(null)}>
                      Swap Pokemon
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Pokemon */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleStarter('right')}
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                    startMode === 'right' ? 'border-primary bg-primary/20' : 'border-border bg-background'
                  }`}
                  aria-label="Select Pokemon 2 to start"
                >
                  {startMode === 'right' && <span className="h-3 w-3 rounded-full bg-primary" />}
                </button>
                <h3 className="text-xl font-bold text-center">Pokemon 2</h3>
              </div>

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
                    <div className="bg-card border rounded-lg divide-y max-h-64 md:max-h-80 overflow-y-auto">
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
                <div className="space-y-3">
                  <div className="pointer-events-none max-w-xs w-full mx-auto">
                    <PokemonCard pokemon={selectedRight} />
                  </div>
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => setSelectedRight(null)}>
                      Swap Pokemon
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {selectedLeft && selectedRight && !pveBattle?.active && (
            <div className="flex justify-center mb-6">
              <Button size="lg" onClick={startPveBattle} className="gap-2">
                <Swords className="h-5 w-5" />
                Start Battle
              </Button>
            </div>
          )}

          {selectedLeft && selectedRight && pveBattle?.active && (
            <div className="gba-battle-shell battle-shell-gapless mb-8 relative overflow-hidden">
              <div className="gba-battle-bg" />
              <div className="gba-stage">
                <div className="gba-status-row foe">
                  <div className="gba-status-box foe">
                    <div className="gba-status-header">
                      <span className="gba-name">{(selectedRight?.name ?? 'Pokemon').toUpperCase()}</span>
                      <span className="gba-level">Lv {estimateLevel(selectedRight)}</span>
                    </div>
                    <div className="gba-hp-row">
                      <span className="gba-hp-label">HP</span>
                      <div className="gba-hp-bar">
                        <div
                          className={`gba-hp-fill ${rightHPPercent <= 25 ? 'low' : rightHPPercent <= 60 ? 'mid' : ''}`}
                          style={{ width: `${rightHPPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="gba-hp-text">{rightHPCurrent} / {rightHPMax}</div>
                  </div>
                </div>

                <div
                  className={`gba-sprite foe ${pveBattle?.anim?.right === 'attack' ? 'attack' : ''} ${pveBattle?.anim?.right === 'hit' ? 'hit' : ''} ${pveWinnerSide === 'right' ? 'winner' : ''}`}
                >
                  <img
                    src={selectedRight?.sprites?.other?.['official-artwork']?.front_default ?? selectedRight?.sprites?.front_default}
                    alt={selectedRight?.name}
                  />
                </div>

                <div
                  className={`gba-sprite player ${pveBattle?.anim?.left === 'attack' ? 'attack' : ''} ${pveBattle?.anim?.left === 'hit' ? 'hit' : ''} ${pveWinnerSide === 'left' ? 'winner' : ''} ${selectedLeft?.sprites?.back_default ? '' : 'front-fallback'}`}
                >
                  <img
                    src={selectedLeft?.sprites?.back_default ?? selectedLeft?.sprites?.front_default ?? selectedLeft?.sprites?.other?.['official-artwork']?.front_default}
                    alt={selectedLeft?.name}
                  />
                </div>

                <div className="gba-status-row player">
                  <div className="gba-status-box player">
                    <div className="gba-status-header">
                      <span className="gba-name">{(selectedLeft?.name ?? 'Pokemon').toUpperCase()}</span>
                      <span className="gba-level">Lv {estimateLevel(selectedLeft)}</span>
                    </div>
                    <div className="gba-hp-row">
                      <span className="gba-hp-label">HP</span>
                      <div className="gba-hp-bar">
                        <div
                          className={`gba-hp-fill ${leftHPPercent <= 25 ? 'low' : leftHPPercent <= 60 ? 'mid' : ''}`}
                          style={{ width: `${leftHPPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="gba-hp-text">{leftHPCurrent} / {leftHPMax}</div>
                  </div>
                </div>
              </div>

              <div className="gba-message-box">
                <div className="gba-message">
                  {pveBattle?.message ?? 'Click Start Battle to begin.'}
                </div>
                {(pveBattle?.log ?? []).length > 0 && (
                  <div className="gba-log">
                    {((pveBattle.log ?? []).slice(-1)).map((entry, idx) => (
                      <div key={idx} className="gba-log-row">
                        <span className="font-semibold capitalize">{entry.attacker}</span>
                        <span> used {entry.moveName}</span>
                        <span className="text-destructive font-semibold"> -{entry.damage} HP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="gba-menu">
                {pveBattle?.winner ? (
                  <div className="gba-winner-row">
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="font-semibold">
                        {formatPokemonName(pveBattle.winner === 'left' ? selectedLeft.name : selectedRight.name)} won!
                      </span>
                      <span className="text-muted-foreground">
                        {pveBattle.log?.length ?? 0} turns | Replay or swap Pokemon.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={startPveBattle} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        New battle
                      </Button>
                      <Button size="sm" variant="outline" onClick={reset}>
                        Swap Pokemon
                      </Button>
                    </div>
                  </div>
                  ) : (
                    <>
                      <div className="gba-turn-hint">
                        {pveBattle?.active
                          ? isPlayerTurn
                            ? 'Your turn: choose a move.'
                            : 'Opponent turn...'
                          : 'Ready to start the Ruby-style battle.'}
                      </div>
                      {pveBattle?.active && autoSimPve ? (
                        <h2 className="text-lg font-semibold px-2">Simulating moves automatically...</h2>
                      ) : pveBattle?.active && !isPlayerTurn ? (
                        <h2 className="text-lg font-semibold px-2">Waiting for opponent...</h2>
                      ) : (
                        <div className="gba-menu-grid">
                          {getPokemonMoves(selectedLeft).map((move, idx) => (
                            <button
                              key={move.name + idx}
                              className="gba-move move-appear"
                              style={{ animationDelay: `${idx * 70}ms` }}
                              disabled={!pveBattle?.active || pveLocked || autoSimPve || pveBattle?.winner || !isPlayerTurn}
                              onClick={() => resolvePveTurn('left', move)}
                            >
                              <span className="move-name">{move.name.toUpperCase()}</span>
                              <span className="move-power">Pwr {move.power}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    <div className="gba-menu-actions">
                        <Button
                          onClick={startPveBattle}
                          disabled={!pveReady || pveBattle?.active}
                          className="gap-2"
                        >
                          <Swords className="h-4 w-4" />
                          Start battle
                        </Button>
                      <Button onClick={reset} variant="outline">
                        Swap Pokemon
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        {pveBattle?.active ? 'Simulando PC vs PC a cada 3s' : 'Selecione e clique em iniciar'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

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
                          Type {log.attackType} | total x{(log.totalMult ?? 1).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
          {battleMode === 'pvp' && (
            <div className="space-y-6">

              {outgoingInvite && !room && (
                <div className="text-center text-xs text-muted-foreground">
                  Invite sent. Waiting for the other player to respond.
                </div>
              )}

              {myRematchPending && (
                <div className="bg-muted/50 border border-dashed rounded-xl p-3 text-sm text-center">
                  Waiting for {opponentPlayer?.name ?? 'opponent'} to accept the rematch.
                </div>
              )}

              {opponentRematchPending && null}

              {!user && (
                <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold">Login required</div>
                    <p className="text-muted-foreground text-sm">
                      Sign in with Google to invite friends and accept invites.
                    </p>
                  </div>
                  <Button onClick={() => setShowLoginGate(true)} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Login with Google
                  </Button>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="bg-muted/60 border border-dashed rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Received invites
                  </div>
                  {pendingInvites.map((invite) => {
                    const secsLeft = Math.max(0, 60 - Math.floor((nowTs - (invite.createdAt ?? nowTs)) / 1000));
                    return (
                    <div key={invite.id} className="bg-card border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={invite.fromPhoto ?? ''} alt={invite.fromName ?? 'Player'} />
                          <AvatarFallback>
                            {(invite.fromName ?? 'P')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{invite.fromName ?? 'Player'}</div>
                          <div className="text-xs text-muted-foreground">wants to battle now</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" onClick={() => acceptInvite(invite)}>
                          <Swords className="h-4 w-4" />
                          Accept {secsLeft}s
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}

              {isInRoom ? (
                <div className="bg-card border rounded-2xl p-3 sm:p-6 space-y-4 sm:space-y-6 battle-room-card">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="ml-2">
                      <div className="text-sm text-muted-foreground">Active room</div>
                      <div className="text-xl font-bold">{selfName} vs {opponentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.state === 'selecting'
                          ? 'Choose a Pokemon to start'
                          : matchFinished
                          ? 'Match finished'
                          : isMyTurn
                          ? 'Your turn'
                          : opponentName + '`s turn'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => requestRematch()}
                        disabled={room?.rematchRequest?.status === 'pending'}
                      >
                        <RefreshCw className="ml-1 h-4 w-4" />
                        {room?.rematchRequest?.status === 'pending' ? 'Waiting response' : 'Play Again'}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={leaveRoom}>
                        <DoorOpen className="ml-1 h-4 w-4" />
                        Exit Session
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {room.adminUid === user?.uid && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Game mode:</span>
                          <select
                            className="border rounded-md px-2 py-1 text-sm bg-background"
                            value={room.gameMode ?? 'classic'}
                            onChange={(e) => setGameMode(e.target.value)}
                          >
                            <option value="classic">Classic</option>
                            <option value="cards">Elma Chips Cards</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Region:</span>
                          <select
                            className="border rounded-md px-2 py-1 text-sm bg-background"
                            value={room.regionFilter ?? 'all'}
                            onChange={(e) => setRegionFilter(e.target.value)}
                          >
                            <option value="all">All</option>
                            <option value="kanto">Kanto</option>
                            <option value="johto">Johto</option>
                            <option value="hoenn">Hoenn</option>
                            <option value="sinnoh">Sinnoh</option>
                            <option value="unova">Unova</option>
                            <option value="kalos">Kalos</option>
                            <option value="alola">Alola</option>
                            <option value="galar">Galar</option>
                            <option value="paldea">Paldea</option>
                          </select>
                        </div>
                        {room.gameMode === 'cards' && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Best of:</span>
                            <select
                              className="border rounded-md px-2 py-1 text-sm bg-background"
                              value={room.cardBestOf ?? 3}
                              onChange={(e) => setCardBestOf(e.target.value)}
                            >
                              <option value="3">3</option>
                              <option value="5">5</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {room?.gameMode === 'cards' ? (
                    <div className="space-y-4">
                      {cardMatchWinner && (
                        <div className="flex">
                          <Badge className="w-fit bg-emerald-100 text-emerald-800 border-emerald-200">
                            {cardMatchWinner === user?.uid ? `Match Winner: ${selfName}` : `Match Winner: ${opponentName}`}
                          </Badge>
                        </div>
                      )}

                      {room.adminUid === user?.uid && !cardMatchWinner && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button
                            className="gap-2"
                            onClick={startCardRound}
                            disabled={
                              room.adminUid !== user?.uid ||
                              cardMatchWinner ||
                              (cardBattle?.hands && !cardRevealed)
                            }
                          >
                            <Sparkles className="h-4 w-4" />
                            {cardRound ? 'Next round' : 'Start match'}
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="ml-1 h-8 w-8 rounded-full bg-black text-white hover:bg-black/80"
                            onClick={() =>
                              alert('Admin deals a round. Chooser taps one attribute to reveal. Winner keeps choosing.')
                            }
                          >
                            ?
                          </Button>
                        </div>
                      )}

                        <div className="rounded-2xl border bg-gradient-to-br from-slate-900/10 via-slate-800/5 to-slate-900/10 p-3 sm:p-4 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
                          <div className="w-full max-w-2xl mx-auto text-white">
                            <div className="flex items-stretch gap-0 text-sm sm:text-base">
                              <div className="flex-1 flex items-center justify-center px-3 sm:px-3.5 py-1.5 rounded-l-full bg-gradient-to-r from-sky-700 to-sky-500 border border-sky-600 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
                                <div className="flex flex-col items-center leading-tight">
                                  <span className="font-semibold truncate text-sm sm:text-base">{(selfName?.split(' ')[0] || selfName || 'You').slice(0, 8)}</span>
                                  <span className="text-[11px] text-slate-100/85">{chooserUid === user?.uid ? 'Choosing' : 'Waiting'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 px-2 sm:px-3 py-1 bg-slate-900 border border-slate-700 shadow-[0_6px_18px_rgba(0,0,0,0.3)] min-w-[150px] sm:min-w-[200px] justify-center">
                                <span className="text-2xl font-extrabold text-sky-300 leading-none">{cardScores[user?.uid] ?? 0}</span>
                                <div className="px-3 py-1 bg-slate-800 rounded-md text-center min-w-[78px]">
                                  <div className="text-xs uppercase text-slate-200">Round</div>
                                  <div className="text-base sm:text-lg font-bold">{Math.max(cardRound || 1, 1)} / {cardMaxRounds}</div>
                                </div>
                                <span className="text-2xl font-extrabold text-rose-200 leading-none">{cardScores[opponentId] ?? 0}</span>
                              </div>
                              <div className="flex-1 flex items-center justify-center px-3 sm:px-3.5 py-1.5 rounded-r-full bg-gradient-to-l from-rose-900 to-rose-700 border border-rose-700 shadow-[0_6px_18px_rgba(0,0,0,0.3)]">
                                <div className="flex flex-col items-center leading-tight text-right">
                                  <span className="font-semibold truncate text-sm sm:text-base">{(opponentName?.split(' ')[0] || opponentName || 'Opponent').slice(0, 8)}</span>
                                  <span className="text-[11px] text-slate-100/85">{chooserUid === opponentId ? 'Choosing' : 'Waiting'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted/40 border rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold truncate">{selfName}</div>
                            <Badge
                              variant="secondary"
                              className={
                                cardRevealed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : chooserUid === user?.uid
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-800'
                              }
                            >
                              {cardRevealed ? 'Revealed' : chooserUid === user?.uid ? 'You choose' : 'Waiting'}
                            </Badge>
                          </div>

                          {myCard ? (
                            <>
                              <div className="max-w-[280px] w-full mx-auto">
                                {myCardRevealStage === 'front' ? (
                                  <button
                                    type="button"
                                    onClick={handleRevealBack}
                                    className="w-full transition duration-700 ease-out"
                                    disabled={myCardRolling}
                                  >
                                    <div
                                      className={`transition transform duration-700 ${
                                        myCardRolling ? 'opacity-80' : 'hover:scale-[1.02]'
                                      }`}
                                    >
                                      {renderFrontTeaserCard(myCardDisplay ?? myCard)}
                                    </div>
                                  </button>
                                ) : (
                                  renderElmaCard(myCard, {
                                    hidden: false,
                                    reveal: cardRevealed,
                                    selectedStat: myCardChoice,
                                    onSelectStat: cardRevealed || chooserUid !== user?.uid ? null : pickCardStat,
                                  })
                                )}
                              </div>
                              {!cardRevealed && !myCardChoice && (
                                <div className="text-xs text-muted-foreground text-center">
                                  {chooserUid === user?.uid
                                    ? 'Tap a stat on the card to pick your attribute.'
                                    : 'Waiting for the chooser to select an attribute.'}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">Waiting for the admin to start the round.</div>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground text-center">
                          Opponent card will reveal in the result modal.
                        </div>
                      </div>
                  ) : room?.state === 'selecting' ? (
                    <div className="space-y-4">
                        <div className="flex flex-row items-center justify-between bg-muted/30 border rounded-xl p-3 md:p-4 gap-2 sm:gap-3">
                          <div className="font-semibold text-sm md:text-base truncate">{opponentPlayer?.name ?? 'Opponent'}</div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge
                              variant="outline"
                              className={`text-xs md:text-sm ${opponentPlayer?.ready ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                            >
                              {opponentPlayer?.ready ? 'Ready' : 'Waiting'}
                            </Badge>
                            <div className="hidden sm:block text-xs md:text-sm text-muted-foreground">
                              {opponentPlayer?.ready ? 'Waiting for both to start.' : 'Opponent choosing Pokemon.'}
                            </div>
                          </div>
                        </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 max-w-3xl w-full mx-auto">
                        <div
                          className={`bg-muted/40 border rounded-xl p-2.5 md:p-6 space-y-3 md:space-y-5 border-green-500/50 shadow-[0_0_25px_rgba(34,197,94,0.35)] transition-opacity ${
                            isMyTurn || room?.state === 'selecting' ? 'opacity-100 ring-2 ring-green-400' : 'opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold text-xs md:text-base">
                              {selfPlayer?.name ?? user?.displayName ?? 'You'}
                            </div>
                            <Badge variant="secondary">{selfPlayer?.ready ? 'Ready' : 'Choosing'}</Badge>
                          </div>

                          {!selfPlayer?.pokemon ? (
                            <div className="space-y-3">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  placeholder="Search your Pokemon..."
                                  value={pvpSearch}
                                  onChange={(e) => setPvpSearch(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                              {pvpFiltered.length > 0 && (
                                <div className="bg-card border rounded-lg divide-y max-h-56 md:max-h-64 overflow-y-auto">
                                  {pvpFiltered.map((p) => (
                                    <button
                                      key={p.id}
                                      onClick={() => setPokemonForRoom(p)}
                                      className="w-full p-3 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                                    >
                                      <img src={p.sprites.front_default} alt={p.name} className="w-12 h-12" />
                                      <div>
                                        <div className="font-semibold capitalize">{p.name}</div>
                                        <div className="text-sm text-muted-foreground">#{p.id}</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="pointer-events-none max-w-[220px] sm:max-w-xs w-full mx-auto">
                                <PokemonCard pokemon={selfPlayer.pokemon} />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  disabled={selfPlayer?.ready}
                                  onClick={markReadyForRoom}
                                  className="gap-2"
                                >
                                  Ready
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    update(ref(db, `rooms/${room.id}/players/${user.uid}`), {
                                      pokemon: null,
                                      hp: null,
                                      maxHp: null,
                                      ready: false,
                                    })
                                  }
                                  className="gap-2"
                                >
                                  Swap Pokemon
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="hidden sm:flex bg-muted/15 border rounded-xl p-3 md:p-4 items-center justify-end gap-2">
                          <div className="font-semibold text-xs md:text-base">{opponentPlayer?.name ?? 'Opponent'}</div>
                          <Badge
                            variant="outline"
                            className={`${opponentPlayer?.ready ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}
                          >
                            {opponentPlayer?.ready ? 'Ready' : 'Waiting'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="gba-battle-shell gba-compact battle-shell-gapless relative overflow-hidden">
                        <div className="gba-battle-bg" />
                        <div className="gba-stage">
                          <div className="gba-status-row foe">
                            <div className="gba-status-box foe">
                              <div className="gba-status-header">
                                <span className="gba-name">{formatPokemonName(opponentPlayer?.pokemon?.name ?? 'Pokemon').toUpperCase()}</span>
                                <span className="gba-level">Lv {estimateLevel(opponentPlayer?.pokemon ?? {})}</span>
                              </div>
                              <div className="gba-hp-row">
                                <span className="gba-hp-label">HP</span>
                                <div className="gba-hp-bar">
                                  <div
                                    className={`gba-hp-fill ${(opponentPlayer?.hp ?? 0) <= (opponentPlayer?.maxHp ?? 1) * 0.25 ? 'low' : (opponentPlayer?.hp ?? 0) <= (opponentPlayer?.maxHp ?? 1) * 0.6 ? 'mid' : ''}`}
                                    style={{ width: `${Math.max(0, Math.min(100, Math.round(((opponentPlayer?.hp ?? 0) / Math.max(opponentPlayer?.maxHp ?? 1, 1)) * 100)))}%` }}
                                  />
                                </div>
                              </div>
                              <div className="gba-hp-text">
                                {opponentPlayer?.hp ?? baseHP(opponentPlayer?.pokemon ?? {})} / {opponentPlayer?.maxHp ?? baseHP(opponentPlayer?.pokemon ?? {})}
                              </div>
                            </div>
                          </div>

                          <div className={`gba-sprite foe ${room?.currentTurn === opponentId ? 'attack' : ''}`}>
                            <img
                              src={opponentPlayer?.pokemon?.sprites?.other?.['official-artwork']?.front_default ?? opponentPlayer?.pokemon?.sprites?.front_default}
                              alt={opponentPlayer?.pokemon?.name ?? 'Foe Pokemon'}
                            />
                          </div>

                          <div className={`gba-sprite player ${room?.currentTurn === user?.uid ? 'attack' : ''} ${selfPlayer?.pokemon?.sprites?.back_default ? '' : 'front-fallback'}`}>
                            <img
                              src={selfPlayer?.pokemon?.sprites?.back_default ?? selfPlayer?.pokemon?.sprites?.front_default ?? selfPlayer?.pokemon?.sprites?.other?.['official-artwork']?.front_default}
                              alt={selfPlayer?.pokemon?.name ?? 'Player Pokemon'}
                            />
                          </div>

                          <div className="gba-status-row player">
                            <div className="gba-status-box player">
                              <div className="gba-status-header">
                                <span className="gba-name">{formatPokemonName(selfPlayer?.pokemon?.name ?? 'Pokemon').toUpperCase()}</span>
                                <span className="gba-level">Lv {estimateLevel(selfPlayer?.pokemon ?? {})}</span>
                              </div>
                              <div className="gba-hp-row">
                                <span className="gba-hp-label">HP</span>
                                <div className="gba-hp-bar">
                                  <div
                                    className={`gba-hp-fill ${(selfPlayer?.hp ?? 0) <= (selfPlayer?.maxHp ?? 1) * 0.25 ? 'low' : (selfPlayer?.hp ?? 0) <= (selfPlayer?.maxHp ?? 1) * 0.6 ? 'mid' : ''}`}
                                    style={{ width: `${Math.max(0, Math.min(100, Math.round(((selfPlayer?.hp ?? 0) / Math.max(selfPlayer?.maxHp ?? 1, 1)) * 100)))}%` }}
                                  />
                                </div>
                              </div>
                              <div className="gba-hp-text">
                                {selfPlayer?.hp ?? baseHP(selfPlayer?.pokemon ?? {})} / {selfPlayer?.maxHp ?? baseHP(selfPlayer?.pokemon ?? {})}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Message box temporarily hidden to reduce redundancy */}

                        <div className="gba-menu">
                          {matchFinished ? (
                            <div className="gba-winner-row">
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="font-semibold">
                                  {room.winnerUid === user?.uid ? 'You won!' : `${opponentName} won!`}
                                </span>
                                <span className="text-muted-foreground">Choose rematch or leave.</span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={resetRoomBattle} className="gap-2">
                                  <RefreshCw className="h-4 w-4" />
                                  Revanche
                                </Button>
                                <Button size="sm" variant="outline" onClick={leaveRoom}>
                                  Sair
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="gba-turn-hint">
                                {isMyTurn ? 'Your turn to attack.' : 'Waiting for opponent.'}
                              </div>
                              {!isMyTurn ? (
                                <h2 className="text-lg font-semibold px-2">Waiting for opponent...</h2>
                              ) : (
                                <div className="gba-menu-grid">
                                  {getPokemonMoves(selfPlayer.pokemon).map((move, idx) => {
                                    const Icon = move.icon ?? Swords;
                                    const isSelected = selectedMove === move.name;
                                    return (
                                      <button
                                        key={move.name + idx}
                                        className={`gba-move move-appear ${isSelected ? 'ring-2 ring-primary' : ''}`}
                                        style={{ animationDelay: `${idx * 70}ms` }}
                                        disabled={!isMyTurn}
                                        onClick={async () => {
                                          setSelectedMove(move.name);
                                          await takeTurn(move);
                                          setSelectedMove(null);
                                        }}
                                      >
                                        <span className="move-name flex items-center gap-2">
                                          <Icon className="h-4 w-4" />
                                          {move.name.toUpperCase()}
                                        </span>
                                        <span className="move-power">Pwr {move.power}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {room?.log?.length > 0 && (
                        <div className="bg-muted/30 border rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">Latest plays</div>
                            <Button variant="ghost" size="sm" onClick={() => setShowLog((v) => !v)}>
                              {showLog ? 'Collapse' : 'Expand'}
                            </Button>
                          </div>
                          {showLog && (
                            <div className="space-y-2 max-h-56 overflow-y-auto text-sm">
                              {[...room.log].slice(-6).reverse().map((entry, idx) => (
                                <div key={idx} className="bg-background border rounded p-2">
                                  <span className="font-semibold capitalize">{entry.attacker}</span> used{' '}
                                  <span className="font-semibold">{entry.moveName}</span>
                                  {entry.movePower ? ` (Power ${entry.movePower})` : ''} and dealt{' '}
                                  <span className="text-destructive font-bold">{entry.damage}</span> damage to{' '}
                                  <span className="font-semibold capitalize">{entry.defender}</span> (HP {entry.remainingHP})
                                  <div className="text-xs text-muted-foreground">
                                    Type {entry.attackType} | total x{entry.totalMult?.toFixed(2) ?? '1.00'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border rounded-xl p-6 text-center space-y-3">
                  {outgoingInvite ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-amber-900">
                            Invite sent to {outgoingInvite.targetName ?? 'Player'}
                          </div>
                          <div className="text-xs text-amber-800">
                            From {selfName}. Invite sent. Waiting for the other player to respond.
                          </div>
                          <div className="text-xs font-medium text-amber-900">
                            Expires in {outgoingInviteSecondsLeft}s
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelOutgoingInvite}
                          className="border-amber-300 text-amber-900 hover:bg-amber-100"
                        >
                          Cancel invite
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold">Find a challenger</div>
                      <p className="text-muted-foreground text-sm">
                        Click Player vs Player to open the online list and send an invite.
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => (user ? setShowPlayersModal(true) : setShowLoginGate(true))}
                          className="gap-2 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border border-slate-800 hover:border-slate-700"
                        >
                          <Users className="h-4 w-4" />
                          Open player list
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <Dialog open={showLoginGate} onOpenChange={setShowLoginGate}>
            <DialogContent className="max-w-[420px] sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Sign in with Google</DialogTitle>
                <DialogDescription>
                  You need to be logged in to challenge another player.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                      setShowLoginGate(false);
                    } catch (err) {
                      console.error('Login error', err);
                      toast.error('Could not sign in right now.');
                    }
                  }}
                >
                  <LogIn className="h-4 w-4" />
                   Login with Google
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showPlayersModal} onOpenChange={setShowPlayersModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Online players</DialogTitle>
                <DialogDescription>Choose a player to send an invite.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {onlinePlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">No players online right now.</p>
                )}
                {onlinePlayers.map((player) => (
                  <div key={player.uid} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photoURL ?? ''} alt={player.name ?? 'Player'} />
                        <AvatarFallback>{(player.name ?? 'P')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{player.name ?? 'Player'}</div>
                        <div className="text-xs text-muted-foreground">Status: {player.status ?? 'online'}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        sendInvite(player);
                        setShowPlayersModal(false);
                      }}
                      disabled={outgoingInvite?.targetUid === player.uid}
                      className="gap-1 bg-slate-800 text-white hover:bg-slate-700 hover:text-white border border-slate-800 hover:border-slate-700"
                    >
                      {outgoingInvite?.targetUid === player.uid ? 'Invite sent' : 'Invite to battle'}
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={Boolean(cardResultModal)} onOpenChange={(open) => !open && setCardResultModal(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {cardResultModal?.outcome === 'win'
                    ? 'You Win!'
                    : cardResultModal?.outcome === 'lose'
                    ? 'You Lose'
                    : "It's a tie"}
                </DialogTitle>
                <DialogDescription>
                  {cardResultModal
                    ? cardModalStage === 'front'
                      ? 'Opponent card revealed...'
                      : cardModalStage === 'back'
                      ? 'Comparing attributes...'
                      : cardResultModal.outcome === 'win'
                      ? `Your ${cardResultModal.stat} (${cardResultModal.myVal}) beat the opponent (${cardResultModal.oppVal}).`
                      : cardResultModal.outcome === 'lose'
                      ? `Opponent's ${cardResultModal.stat} (${cardResultModal.oppVal}) beat yours (${cardResultModal.myVal}).`
                      : `Both ${cardResultModal.stat} values are ${cardResultModal.myVal}.`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              {cardResultModal && (
                <div className="space-y-3">
                  <div className="relative w-full flex justify-center">
                    <div className="w-full max-w-[320px]">
                      {cardModalStage === 'front' && cardResultModal.oppCardSnapshot && (
                        <div
                          className="transition duration-700 ease-out opacity-100 translate-y-0"
                          style={{ transitionDelay: '150ms' }}
                        >
                          {renderFrontTeaserCard(cardResultModal.oppCardSnapshot)}
                        </div>
                      )}
                      {cardModalStage !== 'front' && cardResultModal.oppCardSnapshot && (
                        <div
                          className="transition duration-700 ease-in-out opacity-100 translate-x-0"
                          style={{ transitionDelay: '200ms' }}
                        >
                          {renderElmaCard(cardResultModal.oppCardSnapshot, {
                            hidden: false,
                            reveal: true,
                            selectedStat: cardResultModal.stat,
                            onSelectStat: null,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  {cardModalStage === 'result' && (
                    <div className="text-sm text-center text-muted-foreground">
                      Attribute: {cardResultModal.stat} - You {cardResultModal.outcome === 'win' ? 'win' : cardResultModal.outcome === 'lose' ? 'lose' : 'tie'} ({cardResultModal.myVal} vs {cardResultModal.oppVal})
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setCardResultModal(null)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRematchModal} onOpenChange={(open) => !open && setShowRematchModal(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New match?</DialogTitle>
                <DialogDescription>
                  {rematchRequest?.fromName ?? 'The opponent'} wants to play again. Accept?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { declineRematch(); setShowRematchModal(false); }}>
                  Decline
                </Button>
                <Button onClick={() => { acceptRematch(); setShowRematchModal(false); }} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Accept
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default BattlePage;

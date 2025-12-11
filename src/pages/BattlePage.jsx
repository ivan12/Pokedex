import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from '@/components/Header';
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
  const [battling, setBattling] = useState(false);
  const [startMode, setStartMode] = useState('speed'); // speed | left | right | random
  const [weather, setWeather] = useState('clear'); // clear | sun | rain | snow | sandstorm
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
          toast.message('Sala encerrada. Volte a procurar um adversario.');
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
      setBattling(false);
      setSelectedLeft(null);
      setSelectedRight(null);
    }
  }, [battleMode]);

  const baseHP = (p) => p?.stats?.find((s) => s.stat.name === 'hp')?.base_stat ?? 80;

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

  const opponentId = useMemo(() => {
    if (!room?.players) return null;
    return Object.keys(room.players).find((pid) => pid !== user?.uid) ?? null;
  }, [room, user]);

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
  const isMyTurn = room?.currentTurn === user?.uid;
  const matchFinished = room?.state === 'finished';
  const pendingInvites = incomingInvites.filter((inv) => inv.status === 'pending');
  const rematchRequest = room?.rematchRequest ?? null;
  const opponentRematchPending =
    rematchRequest && rematchRequest.status === 'pending' && rematchRequest.fromUid !== user?.uid;
  const myRematchPending =
    rematchRequest && rematchRequest.status === 'pending' && rematchRequest.fromUid === user?.uid;
  const isInRoom = Boolean(room?.players?.[user?.uid]);
  const selfName = selfPlayer?.name ?? user?.displayName ?? 'Voce';
  const opponentName = opponentPlayer?.name ?? 'Adversario';
  const [nowTs, setNowTs] = useState(Date.now());
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
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
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

  const maybeStartRoom = useCallback(
    async (roomId) => {
      await runTransaction(ref(db, `rooms/${roomId}`), (current) => {
        if (!current || current.state !== 'selecting') return current;
        const ids = Object.keys(current.players || {});
        const ready = ids.every((pid) => current.players[pid]?.pokemon);
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
    });
    await maybeStartRoom(room.id);
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

  const sendInvite = async (player) => {
    if (!user) {
      setShowLoginGate(true);
      return;
    }
    try {
      const inviteRef = push(ref(db, `invites/${player.uid}`));
      if (player.status === 'battle') {
        toast.error('Jogador ja esta em batalha.');
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
          toast.success(`${player.name ?? 'Jogador'} aceitou o convite!`);
          setActiveRoomId(data.roomId);
          setShowPlayersModal(false);
          inviteWatcher?.();
          setInviteWatcher(null);
        }
        if (data.status === 'declined') {
          toast.error(`${player.name ?? 'Jogador'} recusou o convite.`);
          inviteWatcher?.();
          setInviteWatcher(null);
          setOutgoingInvite(null);
        }
      });
      setInviteWatcher(() => watcher);
      setOutgoingInvite({ id: inviteRef.key, targetUid: player.uid });
    } catch (err) {
      console.error('Error sending invite', err);
      toast.error('Nao foi possivel enviar o convite.');
    }
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
      toast.success('Convite aceito! Iniciando sala...');
    } catch (err) {
      console.error('Error accepting invite', err);
      toast.error('Nao foi possivel aceitar o convite.');
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
    };
    Object.keys(room.players || {}).forEach((pid) => {
      updates[`players/${pid}/pokemon`] = null;
      updates[`players/${pid}/hp`] = null;
      updates[`players/${pid}/maxHp`] = null;
    });
    await update(ref(db, `rooms/${room.id}`), updates);
  };

  const requestRematch = async () => {
    if (!room || !user) return;
    if (room.rematchRequest?.status === 'pending') {
      toast.message('Aguardando o adversario responder.');
      return;
    }
    await update(ref(db, `rooms/${room.id}`), {
      rematchRequest: {
        fromUid: user.uid,
        fromName: user.displayName ?? 'Treinador',
        status: 'pending',
        createdAt: Date.now(),
      },
    });
    toast.success('Pedido de nova partida enviado.');
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

  const simulateBattle = () => {
    if (!selectedLeft || !selectedRight) {
      toast.error('Select two Pokemon to battle!');
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

  const leftPlaceholder = useMemo(() => 'Search Pokemon...', []);
  const rightPlaceholder = leftPlaceholder;

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-3 text-gradient">
            Pokemon Battle
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Select two Pokemon and simulate an epic battle!
          </p>
          
          {!isInRoom && (
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <Button
                variant={battleMode === 'pve' ? 'default' : 'outline'}
                onClick={() => setBattleMode('pve')}
                className="gap-2"
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
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8">
            <div className="flex flex-col gap-3 md:col-span-2">
              <div className="flex flex-wrap gap-3 md:gap-4 items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Start:</span>
                  <select
                    className="border rounded-md px-3 py-2 bg-background"
                    value={startMode}
                    onChange={(e) => setStartMode(e.target.value)}
                  >
                    <option value="speed">By speed</option>
                        <option value="left">Pokemon 1 starts</option>
                        <option value="right">Pokemon 2 starts</option>
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
            <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xl font-bold text-center">Pokemon 1</h3>
              
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
                <div className="bg-card border-2 border-primary rounded-2xl p-4 md:p-6 text-center">
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
                    Swap Pokemon
                  </Button>
                </div>
              )}
            </div>
            
            {/* Right Pokemon */}
            <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xl font-bold text-center">Pokemon 2</h3>
              
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
                <div className="bg-card border-2 border-accent rounded-2xl p-4 md:p-6 text-center">
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
                    Swap Pokemon
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
        </>
      )}
          {battleMode === 'pvp' && (
            <div className="space-y-6">

              {outgoingInvite && !room && (
                <div className="text-center text-xs text-muted-foreground">
                  Convite enviado. Aguardando resposta do outro jogador.
                </div>
              )}

              {myRematchPending && (
                <div className="bg-muted/50 border border-dashed rounded-xl p-3 text-sm text-center">
                  Aguardando {opponentPlayer?.name ?? 'adversario'} aceitar a nova partida.
                </div>
              )}

              {opponentRematchPending && null}

              {!user && (
                <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold">Login necessario</div>
                    <p className="text-muted-foreground text-sm">
                      Entre com sua conta Google para convidar amigos e aceitar convites.
                    </p>
                  </div>
                  <Button onClick={() => setShowLoginGate(true)} className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Login com Google
                  </Button>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="bg-muted/60 border border-dashed rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Convites recebidos
                  </div>
                  {pendingInvites.map((invite) => {
                    const secsLeft = Math.max(0, 60 - Math.floor((nowTs - (invite.createdAt ?? nowTs)) / 1000));
                    return (
                    <div key={invite.id} className="bg-card border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={invite.fromPhoto ?? ''} alt={invite.fromName ?? 'Jogador'} />
                          <AvatarFallback>
                            {(invite.fromName ?? 'J')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{invite.fromName ?? 'Jogador'}</div>
                          <div className="text-xs text-muted-foreground">quer batalhar agora</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1" onClick={() => acceptInvite(invite)}>
                          <Swords className="h-4 w-4" />
                          Aceitar {secsLeft}s
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>
                          Recusar
                        </Button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}

              {isInRoom ? (
                    <div className="bg-card border rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Sala ativa</div>
                      <div className="text-xl font-bold">{selfName} vs {opponentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.state === 'selecting'
                          ? 'Escolha um Pokemon para comecar'
                          : matchFinished
                          ? 'Partida encerrada'
                          : isMyTurn
                          ? 'Sua vez de atacar'
                          : 'Vez do adversario'}
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
                        <RefreshCw className="h-4 w-4" />
                        {room?.rematchRequest?.status === 'pending' ? 'Aguardando resposta' : 'Nova partida'}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2" onClick={leaveRoom}>
                        <DoorOpen className="h-4 w-4" />
                        Sair da sessao
                      </Button>
                    </div>
                  </div>

                  <div
                    className={`grid ${
                      room?.state === 'selecting' ? 'grid-cols-1' : 'grid-cols-2'
                    } gap-2 md:gap-6 max-w-xl w-full mx-auto`}
                  >
                    <div
                      className={`bg-muted/40 border rounded-xl p-2.5 md:p-6 space-y-2.5 md:space-y-5 border-green-500/50 shadow-[0_0_25px_rgba(34,197,94,0.35)] transition-opacity ${
                        isMyTurn || room?.state === 'selecting' ? 'opacity-100 ring-2 ring-green-400' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs md:text-base">
                          {selfPlayer?.name ?? user?.displayName ?? 'Voce'}
                        </div>
                        <Badge variant="secondary">{selfPlayer?.pokemon ? 'Pronto' : 'Escolhendo'}</Badge>
                      </div>
                      {!selfPlayer?.pokemon ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                              placeholder="Buscar seu PokAcmon..."
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
                          <div className="flex flex-col items-start gap-2">
                            <div className="font-bold capitalize text-sm md:text-lg">{selfPlayer.pokemon.name}</div>
                            <div className="space-y-2 text-center">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] md:text-sm">
                                  <span>HP</span>
                                  <span className="font-semibold">
                                    {selfPlayer.hp ?? baseHP(selfPlayer.pokemon)} / {selfPlayer.maxHp ?? baseHP(selfPlayer.pokemon)}
                                  </span>
                                </div>
                                <Progress
                                  value={((selfPlayer.hp ?? baseHP(selfPlayer.pokemon)) / (selfPlayer.maxHp ?? baseHP(selfPlayer.pokemon))) * 100}
                                  className="h-2"
                                />
                              </div>
                              <div className="flex items-center justify-center">
                                <img
                                  src={selfPlayer.pokemon.sprites.other['official-artwork'].front_default}
                                  alt={selfPlayer.pokemon.name}
                                  className="w-16 h-16 md:w-40 md:h-40"
                                />
                              </div>
                            </div>
                          </div>
                          {(room.state === 'selecting' || matchFinished) && (
                            <Button variant="outline" size="sm" onClick={() => resetRoomBattle()}>
                              Trocar Pokemon
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`bg-muted/20 border rounded-xl p-2.5 md:p-6 space-y-2.5 md:space-y-5 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.35)] transition-opacity ${
                        (!isMyTurn && !matchFinished && room?.state !== 'selecting') ? 'opacity-100 ring-2 ring-red-400' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs md:text-base">{opponentPlayer?.name ?? 'Adversario'}</div>
                        <Badge variant="outline">{opponentPlayer?.pokemon ? 'Pronto' : 'Aguardando'}</Badge>
                      </div>
                      {opponentPlayer?.pokemon && room.state !== 'selecting' ? (
                        <div className="space-y-3">
                          <div className="flex flex-col items-start gap-2">
                            <div className="font-bold capitalize text-sm md:text-lg">{opponentPlayer.pokemon.name}</div>
                            <div className="space-y-2 text-center">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px] md:text-sm">
                                  <span>HP</span>
                                  <span className="font-semibold">
                                    {opponentPlayer.hp ?? baseHP(opponentPlayer.pokemon)} / {opponentPlayer.maxHp ?? baseHP(opponentPlayer.pokemon)}
                                  </span>
                                </div>
                                <Progress
                                  value={((opponentPlayer.hp ?? baseHP(opponentPlayer.pokemon)) / (opponentPlayer.maxHp ?? baseHP(opponentPlayer.pokemon))) * 100}
                                  className="h-2"
                                />
                              </div>
                              <div className="flex items-center justify-center">
                                <img
                                  src={opponentPlayer.pokemon.sprites.other['official-artwork'].front_default}
                                  alt={opponentPlayer.pokemon.name}
                                  className="w-16 h-16 md:w-40 md:h-40"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : opponentPlayer?.pokemon ? (
                        <div className="text-sm text-muted-foreground">
                          Pokemon escolhido, revelado quando a batalha começar.
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Aguardando o adversario escolher o Pokemon.</div>
                      )}
                    </div>
                  </div>

                  {matchFinished && selfPlayer?.pokemon && opponentPlayer?.pokemon && (
                    <div className="bg-primary/10 border border-primary rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="font-semibold">
                        {room.winnerUid === user?.uid
                          ? 'Voce venceu!'
                          : `${opponentPlayer?.name ?? 'Oponente'} venceu a partida.`}
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
                  )}

                  {selfPlayer?.pokemon && opponentPlayer?.pokemon && (
                    <div className="bg-muted/40 border rounded-xl p-4 space-y-3">
                      {matchFinished && (
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">Partida finalizada</Badge>
                          <div className="text-sm text-muted-foreground">Escolha nova partida ou saia</div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-base md:text-xl">{isMyTurn ? 'Sua vez de atacar' : 'Turno do adversario'}</div>
                      </div>
                      {!matchFinished ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                          {getPokemonMoves(selfPlayer.pokemon).map((move, idx) => {
                            const Icon = move.icon ?? Swords;
                            const isSelected = selectedMove === move.name;
                            return (
                              <Button
                                key={move.name + idx}
                                variant={isSelected ? 'default' : 'outline'}
                                size="sm"
                                disabled={!isMyTurn}
                                onClick={async () => {
                                  setSelectedMove(move.name);
                                  await takeTurn(move);
                                  setSelectedMove(null);
                                }}
                                className="justify-between h-12 text-xs sm:text-sm gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{move.name}</span>
                                </div>
                                <Badge variant={isSelected ? 'outline' : 'secondary'} className="text-[10px] sm:text-xs">
                                  Power {move.power}
                                </Badge>
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldAlert className="h-4 w-4" />
                          Partida encerrada. Clique em jogar de novo ou escolha novos PokAcmon.
                        </div>
                      )}
                    </div>
                  )}

                  {room?.log?.length > 0 && (
                    <div className="bg-muted/30 border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">Ultimas jogadas</div>
                        <Button variant="ghost" size="sm" onClick={() => setShowLog((v) => !v)}>
                          {showLog ? 'Recolher' : 'Expandir'}
                        </Button>
                      </div>
                      {showLog && (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {[...room.log].slice(-6).reverse().map((entry, idx) => (
                            <div key={idx} className="text-sm bg-background border rounded p-2">
                              <span className="font-semibold capitalize">{entry.attacker}</span> usou{' '}
                              <span className="font-semibold">{entry.moveName}</span>
                              {entry.movePower ? ` (Power ${entry.movePower})` : ''} e causou{' '}
                              <span className="text-destructive font-bold">{entry.damage}</span> de dano em{' '}
                              <span className="font-semibold capitalize">{entry.defender}</span> (HP {entry.remainingHP})
                              <div className="text-xs text-muted-foreground">
                                Tipo {entry.attackType} | total x{entry.totalMult?.toFixed(2) ?? '1.00'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border rounded-xl p-6 text-center space-y-3">
                  <div className="text-lg font-semibold">Procure um desafiante</div>
                  <p className="text-muted-foreground text-sm">
                    Clique em Player vs Player para abrir a lista de jogadores online e enviar um convite.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => (user ? setShowPlayersModal(true) : setShowLoginGate(true))} className="gap-2">
                      <Users className="h-4 w-4" />
                      Abrir lista de jogadores
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Dialog open={showLoginGate} onOpenChange={setShowLoginGate}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Entre com o Google</DialogTitle>
                <DialogDescription>
                  Voce precisa estar logado para desafiar outro jogador.
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
                      toast.error('Nao foi possivel fazer login agora.');
                    }
                  }}
                >
                  <LogIn className="h-4 w-4" />
                  Login com Google
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showPlayersModal} onOpenChange={setShowPlayersModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Jogadores online</DialogTitle>
                <DialogDescription>Escolha um jogador para enviar convite.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {onlinePlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">Nenhum jogador online agora.</p>
                )}
                {onlinePlayers.map((player) => (
                  <div key={player.uid} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photoURL ?? ''} alt={player.name ?? 'Jogador'} />
                        <AvatarFallback>{(player.name ?? 'J')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{player.name ?? 'Jogador'}</div>
                        <div className="text-xs text-muted-foreground">Status: {player.status ?? 'online'}</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendInvite(player)}
                      disabled={outgoingInvite?.targetUid === player.uid}
                      className="gap-1"
                    >
                      {outgoingInvite?.targetUid === player.uid ? 'Convite enviado' : 'Invite to battle'}
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRematchModal} onOpenChange={(open) => !open && setShowRematchModal(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova partida?</DialogTitle>
                <DialogDescription>
                  {rematchRequest?.fromName ?? 'O adversario'} quer jogar novamente. Aceitar?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { declineRematch(); setShowRematchModal(false); }}>
                  Recusar
                </Button>
                <Button onClick={() => { acceptRematch(); setShowRematchModal(false); }} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Aceitar
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

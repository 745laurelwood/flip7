import React, { useEffect, useReducer, useRef, useState } from 'react';
import mqtt from 'mqtt';
import { GameLog, ChatRoom } from '@laurelwood/card-class';
import { Action, gameReducer, INITIAL_STATE, makeEmptyPlayer } from './gameReducer';
import { GameProvider, GameContextValue } from './GameContext';
import { FeltContent } from './components/FeltContent';
import { RoundSummary } from './components/RoundSummary';
import { MomentBanner, isShownMoment } from './components/MomentBanner';
import { Lobby } from './views/Lobby';
import { MOMENT_CUES, sounds } from './utils/sound';
import { chooseTarget, shouldHit } from './utils/ai';
import { MQTT_BROKER, redactForWire, roomTopic } from './utils/net';
import { clearSession, loadSession, saveSession, SavedSession } from './utils/session';
import { ChatMessage, GameState, Player, Spectator, TableMoment } from './types';
import {
  AI_AIM_DELAY_MS, AI_TURN_DELAY_MS, CHAT_MAX_LEN, EMPTY_SLOT_NAME,
  FLIP_THREE_STEP_MS, MOMENT_SHOW_MS, ROUND_END_DELAY_MS, Z_HUD,
} from './constants';
import { DEFAULT_PLAYERS } from './rules';

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('flip7_playerName') || '');
  const [seats, setSeats] = useState(DEFAULT_PLAYERS);

  // Networking
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [myIndex, setMyIndex] = useState(0);
  const [isSpectator, setIsSpectator] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(() => loadSession());
  const [chatUnread, setChatUnread] = useState(0);

  const stateRef = useRef(state);
  const peerIdRef = useRef(peerId);
  const mqttClientRef = useRef<mqtt.MqttClient | null>(null);
  const handleDataRef = useRef<(data: any) => void>(() => {});
  const hostInitializedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);
  useEffect(() => { localStorage.setItem('flip7_playerName', playerName); }, [playerName]);

  // Only the host runs the game: it owns the draw pile, the bots and the
  // timers. A client sends what its player did and renders what comes back.
  const isDriver = !isMultiplayer || isHost;

  // ── Actions a seated client may ask the host to apply ──
  // Everything else — round lifecycle, lobby admin, the log — is host-only and
  // dropped if it turns up on the wire.
  const CLIENT_ALLOWED_ACTIONS = new Set<Action['type']>([
    'HIT', 'STAY', 'AIM_ACTION', 'SEND_CHAT', 'RETURN_TO_LOBBY',
  ]);

  /** Host applies locally; a client asks the host to. */
  const handleDispatch = (action: Action) => {
    if (isMultiplayer && !isHost) {
      const client = mqttClientRef.current;
      const room = state.roomId || joinId;
      if (!client || !room) return;
      try {
        client.publish(roomTopic(room), JSON.stringify({
          type: 'CLIENT_ACTION', payload: action, originatorPeerId: peerIdRef.current,
        }));
      } catch (e) { console.error('client publish error:', e); }
      return;
    }
    dispatch(action);
  };

  // ── Host broadcasts every state change ──
  useEffect(() => {
    if (!isHost || !isMultiplayer || !mqttClientRef.current || !state.roomId) return;
    const client = mqttClientRef.current;
    if (!client.connected) {
      try { client.reconnect(); } catch { /* ignore */ }
    }
    try {
      client.publish(roomTopic(state.roomId), JSON.stringify({
        type: 'SYNC_STATE', payload: redactForWire(state),
      }));
    } catch (e) { console.error('host broadcast error:', e); }
  }, [state, isHost, isMultiplayer]);

  // ── Periodic rebroadcast ──
  // A publish can vanish if the broker has gone away in a way mqtt.js has not
  // noticed yet. Re-pushing the whole state is idempotent for clients and
  // means a dropped packet doesn't need a page refresh to recover from.
  useEffect(() => {
    if (!isHost || !isMultiplayer || !state.roomId) return;
    if (state.gamePhase === 'LOBBY') return;
    const interval = setInterval(() => {
      const client = mqttClientRef.current;
      const snapshot = stateRef.current;
      if (!client || !snapshot.roomId) return;
      if (!client.connected) {
        try { client.reconnect(); } catch { /* ignore */ }
      }
      try {
        client.publish(roomTopic(snapshot.roomId), JSON.stringify({
          type: 'SYNC_STATE', payload: redactForWire(snapshot),
        }));
      } catch (e) { console.error('host rebroadcast error:', e); }
    }, 4000);
    return () => clearInterval(interval);
  }, [isHost, isMultiplayer, state.roomId, state.gamePhase]);

  // ── Host: everything arriving from clients ──
  useEffect(() => {
    handleDataRef.current = (data: any) => {
      const s = stateRef.current;
      const room = s.roomId;
      if (!room) return;
      const client = mqttClientRef.current;
      const publish = (msg: any) => {
        if (!client) return;
        try { client.publish(roomTopic(room), JSON.stringify(msg)); } catch (e) { console.error('publish error:', e); }
      };
      const rebroadcast = (players: Player[], spectators: Spectator[]) => {
        publish({ type: 'SYNC_STATE', payload: redactForWire({ ...s, players, spectators }) });
      };

      if (data.type === 'PLAYER_JOINED') {
        const { name, peerId: joiner } = data.payload;
        if (!name || !joiner) return;
        const specs = s.spectators ?? [];

        // Same identity coming back, at any phase and under any name.
        const returning = s.players.findIndex(p => p.peerId === joiner && p.isHuman);
        if (returning !== -1) {
          const np = [...s.players];
          np[returning] = { ...np[returning], isOnline: true };
          dispatch({ type: 'UPDATE_PLAYERS', payload: np });
          publish({ type: 'JOIN_ACCEPTED', peerId: joiner, role: 'player', playerIndex: returning });
          rebroadcast(np, specs);
          return;
        }
        if (specs.some(sp => sp.peerId === joiner)) {
          publish({ type: 'JOIN_ACCEPTED', peerId: joiner, role: 'spectator' });
          rebroadcast(s.players, specs);
          return;
        }

        const nameTaken =
          s.players.some(p => p.isHuman && p.name === name)
          || specs.some(sp => sp.name === name);
        if (nameTaken) {
          publish({ type: 'JOIN_REJECTED', peerId: joiner, reason: 'NAME_TAKEN' });
          return;
        }

        if (s.gamePhase === 'LOBBY') {
          const slot = s.players.findIndex((p, i) => i !== 0 && p.name === EMPTY_SLOT_NAME);
          if (slot !== -1) {
            const np = [...s.players];
            np[slot] = { ...np[slot], name, isHuman: true, peerId: joiner, isOnline: true };
            dispatch({ type: 'UPDATE_PLAYERS', payload: np });
            publish({ type: 'JOIN_ACCEPTED', peerId: joiner, role: 'player', playerIndex: slot });
            rebroadcast(np, specs);
            return;
          }
          publish({ type: 'JOIN_REJECTED', peerId: joiner, reason: 'LOBBY_FULL' });
          return;
        }

        // Turning up mid-game: watch until the next match.
        const spec: Spectator = { name, peerId: joiner };
        dispatch({ type: 'ADD_SPECTATOR', payload: spec });
        publish({ type: 'JOIN_ACCEPTED', peerId: joiner, role: 'spectator' });
        rebroadcast(s.players, [...specs, spec]);
        return;
      }

      if (data.type === 'CLIENT_ACTION') {
        const { payload: action, originatorPeerId } = data;
        if (!originatorPeerId || !action || typeof action.type !== 'string') return;
        const sender = s.players.find(p => p.peerId === originatorPeerId && p.isHuman);
        if (!sender) return;
        if (!CLIENT_ALLOWED_ACTIONS.has(action.type)) return;
        // Nobody acts on anyone else's behalf.
        const declared = action?.payload?.playerIndex;
        if (typeof declared === 'number' && declared !== sender.id) return;
        dispatch(action);
        return;
      }

      if (data.type === 'PLAYER_OFFLINE') {
        const { peerId: gone } = data.payload;
        const specs = s.spectators ?? [];
        if (specs.some(sp => sp.peerId === gone)) {
          dispatch({ type: 'REMOVE_SPECTATOR', payload: { peerId: gone } });
          rebroadcast(s.players, specs.filter(sp => sp.peerId !== gone));
          return;
        }
        dispatch({ type: 'SET_PLAYER_OFFLINE', payload: { peerId: gone } });
        return;
      }

      if (data.type === 'PLAYER_LEAVE') {
        const { peerId: gone } = data.payload;
        const specs = s.spectators ?? [];
        if (specs.some(sp => sp.peerId === gone)) {
          dispatch({ type: 'REMOVE_SPECTATOR', payload: { peerId: gone } });
          rebroadcast(s.players, specs.filter(sp => sp.peerId !== gone));
          return;
        }
        // Leaving mid-game is treated as a drop, so the seat and its line stay
        // put and the player can come back to them.
        if (s.gamePhase !== 'LOBBY') return;
        const idx = s.players.findIndex(p => p.peerId === gone);
        if (idx <= 0) return;
        const np = [...s.players];
        np[idx] = makeEmptyPlayer(idx, EMPTY_SLOT_NAME, false);
        dispatch({ type: 'UPDATE_PLAYERS', payload: np });
        rebroadcast(np, specs);
      }
    };
  }, []);

  // ── Sessions ──
  useEffect(() => {
    if (!isMultiplayer || !state.roomId) return;
    if (state.gamePhase === 'LOBBY') return;
    if (state.gamePhase === 'GAME_OVER') { clearSession(); return; }
    if (isHost) {
      saveSession({ role: 'host', roomId: state.roomId, playerName, state });
    } else if (peerId) {
      saveSession({ role: 'client', roomId: state.roomId, playerName, myPeerId: peerId });
    }
  }, [state, isMultiplayer, isHost, peerId, playerName]);

  const hostRoom = (resume?: Extract<SavedSession, { role: 'host' }>) => {
    setIsMultiplayer(true);
    setIsHost(true);
    setMyIndex(0);
    setIsDisconnected(false);
    setJoinError(null);

    const roomId = resume?.roomId ?? Math.random().toString(36).substring(2, 6).toUpperCase();
    setPeerId(roomId);
    if (!resume) clearSession();
    hostInitializedRef.current = false;

    const client = mqtt.connect(MQTT_BROKER, { keepalive: 15, reschedulePings: true });
    mqttClientRef.current = client;

    client.on('connect', () => {
      setIsDisconnected(false);
      client.subscribe(roomTopic(roomId), err => {
        if (err) { console.error('host subscribe error:', err); return; }
        if (!hostInitializedRef.current) {
          hostInitializedRef.current = true;
          if (resume) {
            dispatch({ type: 'SET_GAME_STATE', payload: resume.state });
          } else {
            dispatch({ type: 'INIT_LOBBY', payload: { isHost: true, roomId, hostName: playerName || 'You (Host)', seats } });
            dispatch({
              type: 'UPDATE_PLAYERS',
              payload: Array.from({ length: seats }, (_, i) =>
                i === 0
                  ? makeEmptyPlayer(0, playerName || 'You (Host)', true, roomId)
                  : makeEmptyPlayer(i, EMPTY_SLOT_NAME, false),
              ),
            });
          }
        } else {
          try {
            client.publish(roomTopic(roomId), JSON.stringify({
              type: 'SYNC_STATE', payload: redactForWire(stateRef.current),
            }));
          } catch (e) { console.error('host resync error:', e); }
        }
      });
    });

    client.on('message', (_topic, message) => {
      try {
        const parsed = JSON.parse(message.toString());
        if (parsed.type === 'SYNC_STATE') return;
        if (parsed.type === 'JOIN_ACCEPTED' || parsed.type === 'JOIN_REJECTED') return;
        handleDataRef.current(parsed);
      } catch (e) { console.error('host parse error:', e); }
    });

    client.on('close', () => setIsDisconnected(true));
  };

  const joinRoom = (resume?: Extract<SavedSession, { role: 'client' }>) => {
    const roomId = (resume?.roomId ?? joinId).toUpperCase();
    if (!roomId) return;
    if (resume && !joinId) setJoinId(roomId);
    setIsMultiplayer(true);
    setIsHost(false);
    setIsSpectator(false);
    setIsDisconnected(false);
    setJoinError(null);

    const myPeerId = resume?.myPeerId ?? Math.random().toString(36).substring(2, 9);
    setPeerId(myPeerId);
    const displayName = (resume?.playerName ?? playerName) || `Player ${myPeerId.slice(0, 4)}`;

    const client = mqtt.connect(MQTT_BROKER, {
      will: {
        topic: roomTopic(roomId),
        payload: JSON.stringify({ type: 'PLAYER_OFFLINE', payload: { peerId: myPeerId } }),
        qos: 0,
        retain: false,
      },
    });
    mqttClientRef.current = client;

    // Until the host answers, nothing on the wire is applied: an unconfirmed
    // peer would otherwise render as seat 0, which is the host's chair.
    let confirmedRole: 'player' | 'spectator' | null = null;

    client.on('connect', () => {
      setIsDisconnected(false);
      client.subscribe(roomTopic(roomId), err => {
        if (err) { console.error('client subscribe error:', err); return; }
        client.publish(roomTopic(roomId), JSON.stringify({
          type: 'PLAYER_JOINED', payload: { name: displayName, peerId: myPeerId },
        }));
      });
    });

    client.on('message', (_topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'JOIN_REJECTED' && data.peerId === myPeerId) {
          setJoinError(
            data.reason === 'NAME_TAKEN' ? 'Someone in that room is already using that name.'
              : data.reason === 'LOBBY_FULL' ? 'That room is full.'
                : 'Could not join that room.',
          );
          clearSession();
          mqttClientRef.current = null;
          setIsMultiplayer(false);
          setIsHost(false);
          try { client.end(true); } catch { /* ignore */ }
          return;
        }

        if (data.type === 'JOIN_ACCEPTED' && data.peerId === myPeerId) {
          confirmedRole = data.role;
          if (data.role === 'spectator') setIsSpectator(true);
          else if (typeof data.playerIndex === 'number') setMyIndex(data.playerIndex);
          return;
        }

        if (!confirmedRole) return;

        if (data.type === 'SYNC_STATE') {
          const next = data.payload as GameState;
          if (confirmedRole === 'player') {
            const me = next.players.find(p => p.peerId === myPeerId);
            if (me) setMyIndex(me.id);
          }
          dispatch({ type: 'SET_GAME_STATE', payload: next });
        }
      } catch (e) { console.error('client parse error:', e); }
    });

    client.on('close', () => setIsDisconnected(true));
  };

  const leaveRoom = () => {
    const finish = () => { clearSession(); window.location.reload(); };
    if (isMultiplayer && !isHost && mqttClientRef.current && peerId) {
      const room = state.roomId || joinId;
      try {
        mqttClientRef.current.publish(roomTopic(room), JSON.stringify({
          type: 'PLAYER_LEAVE', payload: { peerId },
        }));
      } catch (e) { console.error('leave publish error:', e); }
      setTimeout(finish, 200);
      return;
    }
    finish();
  };


  // ── What just happened ──
  // Watches the sequence number rather than the object: a client is sent the
  // whole state every few seconds, and each of those is a fresh object that
  // would otherwise read as another moment. Lives here rather than in the
  // table so that a round ending right after one does not cut it short.
  const [moment, setMoment] = useState<TableMoment | null>(null);
  const seenMomentRef = useRef<number | null>(null);

  useEffect(() => {
    // Back in the lobby there is nothing to watch, and the next match starts
    // its count again, so the anchor is dropped here rather than carried over.
    if (state.gamePhase === 'LOBBY') {
      seenMomentRef.current = null;
      setMoment(null);
      return;
    }
    const seq = state.lastMoment?.seq ?? 0;
    // The first state this client sees in play is history, not news: joining
    // a room mid-match, or resuming one, arrives with moments already in it.
    if (seenMomentRef.current === null) {
      seenMomentRef.current = seq;
      return;
    }
    if (seq === seenMomentRef.current) return;
    seenMomentRef.current = seq;

    const latest = state.lastMoment;
    if (!latest) return;
    MOMENT_CUES[latest.kind]();
    if (!isShownMoment(latest)) return;

    setMoment(latest);
    const timer = setTimeout(() => setMoment(null), MOMENT_SHOW_MS);
    return () => clearTimeout(timer);
  }, [state.lastMoment?.seq, state.gamePhase]);

  const me = state.players[myIndex];
  const myTurn =
    !isSpectator
    && state.gamePhase === 'PLAYING'
    && state.currentTurn === myIndex
    && !state.pendingAction
    && !state.flipThree
    && me?.status === 'active';

  const awaitingMyAim = !isSpectator && !!state.pendingAction && state.pendingAction.drawnBy === myIndex;
  const active = state.players.filter(p => p.status === 'active');
  // A spare Second Chance is the one action card that cannot go anywhere:
  // only a seat not already holding one can take it.
  const legalTargets = (state.pendingAction?.action === 'secondChance'
    ? active.filter(p => !p.hasSecondChance)
    : active
  ).map(p => p.id);

  // ── Bots: hit or stay ──
  useEffect(() => {
    if (!isDriver) return;
    if (state.gamePhase !== 'PLAYING') return;
    if (state.pendingAction || state.flipThree) return;
    const player = state.players[state.currentTurn];
    if (!player || player.isHuman || player.status !== 'active') return;

    const timer = setTimeout(() => {
      if (shouldHit(state, player)) {
        sounds.flip();
        dispatch({ type: 'HIT', payload: { playerIndex: player.id } });
      } else {
        dispatch({ type: 'STAY', payload: { playerIndex: player.id } });
      }
    }, AI_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDriver, state.gamePhase, state.currentTurn, state.players, state.pendingAction, state.flipThree]);

  // ── Bots: aim a drawn action card ──
  useEffect(() => {
    if (!isDriver) return;
    const pending = state.pendingAction;
    if (state.gamePhase !== 'PLAYING' || !pending) return;
    const drawer = state.players[pending.drawnBy];
    if (!drawer || drawer.isHuman) return;

    const timer = setTimeout(() => {
      dispatch({
        type: 'AIM_ACTION',
        payload: { playerIndex: drawer.id, target: chooseTarget(state, drawer.id, pending.action) },
      });
    }, AI_AIM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDriver, state.gamePhase, state.pendingAction, state.players]);

  // ── Flip Three draws itself out, one card at a time ──
  // Stepped from here rather than inside the reducer so it reads as three
  // separate flips instead of one jump.
  useEffect(() => {
    if (!isDriver) return;
    if (state.gamePhase !== 'PLAYING' || !state.flipThree) return;
    const timer = setTimeout(() => {
      sounds.flip();
      dispatch({ type: 'RESOLVE_FLIP_THREE' });
    }, FLIP_THREE_STEP_MS);
    return () => clearTimeout(timer);
  }, [isDriver, state.gamePhase, state.flipThree]);

  // ── Round end ──
  useEffect(() => {
    if (!isDriver) return;
    if (state.gamePhase !== 'PLAYING') return;
    if (state.players.some(p => p.status === 'active')) return;
    if (state.pendingAction || state.flipThree) return;
    const timer = setTimeout(() => dispatch({ type: 'END_ROUND' }), ROUND_END_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isDriver, state.gamePhase, state.players, state.pendingAction, state.flipThree]);

  // ── Chat ──
  const lastChatRef = useRef(0);
  useEffect(() => {
    const log = state.chatLog ?? [];
    if (log.length <= lastChatRef.current) { lastChatRef.current = log.length; return; }
    const latest = log[log.length - 1];
    lastChatRef.current = log.length;
    if (latest && latest.playerIndex !== myIndex) {
      sounds.chat();
      setChatUnread(n => n + 1);
    }
  }, [state.chatLog, myIndex]);

  const sendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !me) return;
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerIndex: myIndex,
      name: me.name,
      text: trimmed.slice(0, CHAT_MAX_LEN),
      ts: Date.now(),
    };
    handleDispatch({ type: 'SEND_CHAT', payload: msg });
  };

  const startSinglePlayer = () => {
    setIsMultiplayer(false);
    setIsHost(true);
    setMyIndex(0);
    dispatch({ type: 'START_GAME', payload: { playerName: playerName || 'You', numPlayers: seats } });
    dispatch({ type: 'START_ROUND' });
  };

  const ctx: GameContextValue = {
    state, dispatch, myIndex,
    isMyTurn: myTurn,
    canHit: myTurn,
    canStay: myTurn,
    executeHit: () => {
      if (!myTurn) return;
      sounds.flip();
      handleDispatch({ type: 'HIT', payload: { playerIndex: myIndex } });
    },
    executeStay: () => {
      if (!myTurn) return;
      handleDispatch({ type: 'STAY', payload: { playerIndex: myIndex } });
    },
    awaitingMyAim,
    legalTargets,
    executeAim: (target: number) => {
      if (!awaitingMyAim) return;
      handleDispatch({ type: 'AIM_ACTION', payload: { playerIndex: myIndex, target } });
    },
    freshCardId: state.lastCardId,
    moment,
    startRound: () => { if (isDriver) dispatch({ type: 'START_ROUND' }); },
    returnToLobby: () => handleDispatch({ type: 'RETURN_TO_LOBBY', payload: { playerIndex: myIndex } }),
    logEndRef,
  };

  if (state.gamePhase === 'LOBBY') {
    return (
      <Lobby
        state={state}
        isMultiplayer={isMultiplayer}
        isHost={isHost}
        myIndex={myIndex}
        peerId={peerId}
        playerName={playerName}
        setPlayerName={setPlayerName}
        seats={seats}
        setSeats={(n) => {
          setSeats(n);
          if (isMultiplayer && isHost) dispatch({ type: 'SET_SEATS', payload: { seats: n } });
        }}
        joinId={joinId}
        setJoinId={setJoinId}
        joinError={joinError}
        clearJoinError={() => setJoinError(null)}
        savedSession={savedSession}
        setSavedSession={setSavedSession}
        onHostRoom={hostRoom}
        onJoinRoom={joinRoom}
        onStartSinglePlayer={startSinglePlayer}
        onStartRound={() => dispatch({ type: 'START_ROUND' })}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  const roundOver = state.gamePhase === 'ROUND_OVER' || state.gamePhase === 'GAME_OVER';
  const chatEnabled = isMultiplayer && !!state.roomId;
  const offline = state.players.filter(p => p.isHuman && p.id !== myIndex && p.isOnline === false);
  const paused = isMultiplayer && (isDisconnected || offline.length > 0);

  return (
    <GameProvider value={ctx}>
      <div className="min-h-screen min-h-dvh royal-bg" style={{ color: 'var(--fg)' }}>
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-t) + 0.75rem)' }}>
          <header className="flex items-center justify-between gap-2 mb-3">
            <h1 className="font-display text-xl sm:text-2xl" style={{ color: 'var(--accent)' }}>Flip 7</h1>
            <div className="flex items-center gap-2">
              {isMultiplayer && state.roomId && (
                <button
                  onClick={() => navigator.clipboard?.writeText(state.roomId!).catch(() => {})}
                  title="Click to copy the room code"
                  className="pill-chip px-3 py-1.5 font-mono text-xs transition-colors hover:text-[color:var(--accent)]"
                  style={{ color: 'var(--fg-soft)' }}
                >
                  {state.roomId}
                </button>
              )}
              <GameLog entries={state.gameLog} logEndRef={logEndRef} />
            </div>
          </header>

          {isSpectator && (
            <div
              className="mb-3 rounded-xl px-3 py-2 text-center text-xs uppercase tracking-[0.18em]"
              style={{ background: 'rgba(111,215,196,0.06)', border: '1px solid var(--accent-soft)', color: 'var(--accent)' }}
            >
              Spectating
            </div>
          )}

          {moment && (
            <MomentBanner moment={moment} players={state.players} myIndex={myIndex} />
          )}

          {roundOver ? <RoundSummary /> : <FeltContent />}
        </div>

        {!roundOver && !isSpectator && (
          <div
            className="f7-action-bar fixed left-0 right-0 bottom-0 flex items-center justify-center gap-3 px-4"
            style={{ zIndex: Z_HUD, paddingBottom: 'calc(var(--safe-b) + 1rem)' }}
          >
            <button
              onClick={ctx.executeStay}
              disabled={!ctx.canStay}
              className="rounded-2xl px-6 h-[52px] font-display transition-all active:scale-[0.96]"
              style={{
                background: ctx.canStay ? 'rgba(127,215,169,0.18)' : 'var(--bg-1)',
                color: ctx.canStay ? 'var(--good)' : 'var(--dimmer)',
                border: `1px solid ${ctx.canStay ? 'rgba(127,215,169,0.55)' : 'var(--line-soft)'}`,
                cursor: ctx.canStay ? 'pointer' : 'not-allowed',
              }}
            >
              Stay
            </button>
            <button
              onClick={ctx.executeHit}
              disabled={!ctx.canHit}
              className={`rounded-2xl px-8 h-[52px] font-display transition-all active:scale-[0.96] ${ctx.canHit ? 'btn-accent' : ''}`}
              style={!ctx.canHit ? {
                background: 'var(--bg-1)', color: 'var(--dimmer)',
                border: '1px solid var(--line-soft)', cursor: 'not-allowed',
              } : undefined}
            >
              Hit
            </button>
          </div>
        )}

        {chatEnabled && (
          <div
            className="fixed right-0 flex justify-end p-2 sm:p-3 pointer-events-none"
            style={{ zIndex: Z_HUD, bottom: 'calc(var(--safe-b) + 5rem)' }}
          >
            <div className="pointer-events-auto">
              <ChatRoom
                messages={state.chatLog ?? []}
                myIndex={myIndex}
                unread={chatUnread}
                onOpen={() => setChatUnread(0)}
                onClose={() => setChatUnread(0)}
                onSend={sendChat}
              />
            </div>
          </div>
        )}

        {paused && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)' }}>
            <div className="glass-panel p-6 sm:p-9 rounded-2xl max-w-md w-full text-center">
              <h2 className="text-xl sm:text-2xl font-display mb-3" style={{ color: 'var(--red)' }}>Connection lost</h2>
              <p className="text-sm mb-2" style={{ color: 'var(--fg-soft)' }}>
                {isDisconnected
                  ? <>Refresh and you will be offered a Resume back into room <span className="font-mono" style={{ color: 'var(--fg)' }}>{state.roomId}</span>.</>
                  : <>Waiting for {offline.map(p => p.name).join(', ')} to come back.</>}
              </p>
            </div>
          </div>
        )}
      </div>
    </GameProvider>
  );
}

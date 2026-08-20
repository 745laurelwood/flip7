import React, { useState } from 'react';
import {
  LobbyShell, LobbyPanel, LobbyNotice, ResumeSessionCard, SeatRow,
  lobbyInputClass, lobbyInputStyle,
} from '@laurelwood/card-class';
import { Rulebook } from '../components/Rulebook';
import { GameState } from '../types';
import { SavedSession, clearSession } from '../utils/session';
import { MAX_PLAYERS, MIN_PLAYERS } from '../rules';
import { EMPTY_SLOT_NAME } from '../constants';

interface LobbyProps {
  state: GameState;
  isMultiplayer: boolean;
  isHost: boolean;
  myIndex: number;
  peerId: string;
  playerName: string;
  setPlayerName: (n: string) => void;
  seats: number;
  setSeats: (n: number) => void;
  joinId: string;
  setJoinId: (s: string) => void;
  joinError: string | null;
  clearJoinError: () => void;
  savedSession: SavedSession | null;
  setSavedSession: (s: SavedSession | null) => void;
  onHostRoom: (resume?: Extract<SavedSession, { role: 'host' }>) => void;
  onJoinRoom: (resume?: Extract<SavedSession, { role: 'client' }>) => void;
  onStartSinglePlayer: () => void;
  onStartRound: () => void;
  onLeaveRoom: () => void;
}

const SeatCount: React.FC<{ value: number; onChange: (n: number) => void; disabled?: boolean }> = ({
  value, onChange, disabled,
}) => (
  <div>
    <div className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'var(--dim)' }}>
      Players
    </div>
    <div className="flex flex-wrap gap-1.5 justify-center">
      {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(n => {
        const active = n === value;
        return (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="w-10 h-10 rounded-xl font-display transition-all active:scale-95"
            style={{
              background: active ? 'var(--accent)' : 'var(--bg-1)',
              color: active ? '#06121f' : 'var(--fg-soft)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
              opacity: disabled && !active ? 0.4 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  </div>
);

export const Lobby: React.FC<LobbyProps> = ({
  state, isMultiplayer, isHost, myIndex, peerId,
  playerName, setPlayerName, seats, setSeats,
  joinId, setJoinId, joinError, clearJoinError,
  savedSession, setSavedSession,
  onHostRoom, onJoinRoom, onStartSinglePlayer, onStartRound, onLeaveRoom,
}) => {
  const [showRulebook, setShowRulebook] = useState(false);
  if (showRulebook) return <Rulebook onClose={() => setShowRulebook(false)} />;

  // Landing screen: no room yet.
  if (!isMultiplayer) {
    return (
      <LobbyShell>
        <LobbyPanel title="Flip 7" subtitle="Push Your Luck">
          {joinError && <LobbyNotice message={joinError} onDismiss={clearJoinError} />}
          {savedSession && (
            <ResumeSessionCard
              role={savedSession.role}
              roomId={savedSession.roomId}
              playerName={savedSession.playerName}
              onResume={() => {
                if (savedSession.role === 'host') onHostRoom(savedSession);
                else onJoinRoom(savedSession);
                setSavedSession(null);
              }}
              onDiscard={() => { clearSession(); setSavedSession(null); }}
            />
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={15}
              className={lobbyInputClass}
              style={lobbyInputStyle}
            />

            <SeatCount value={seats} onChange={setSeats} />

            <button
              onClick={() => onHostRoom()}
              className="btn-accent w-full py-3.5 rounded-xl text-base sm:text-lg font-semibold"
            >
              Create Room
            </button>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room ID"
                value={joinId}
                onChange={e => setJoinId(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl px-4 py-3 text-center focus:outline-none font-semibold transition-all"
                style={lobbyInputStyle}
              />
              <button
                onClick={() => onJoinRoom()}
                className="px-5 py-3 rounded-xl text-sm sm:text-base font-semibold transition-all active:scale-95"
                style={{ background: 'var(--bg-1)', color: 'var(--fg)', border: '1px solid var(--accent-soft)' }}
              >
                Join
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 py-2">
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
              <span className="uppercase text-[10px] tracking-[0.18em]" style={{ color: 'var(--dim)' }}>Practice</span>
              <div className="h-px flex-1" style={{ background: 'var(--line)' }} />
            </div>

            <button
              onClick={onStartSinglePlayer}
              className="w-full py-3 rounded-xl text-base font-semibold transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: 'linear-gradient(180deg, #b8e0b0 0%, #8fc992 100%)',
                color: '#0f2a1a',
                border: '1px solid rgba(127,215,169,0.5)',
              }}
            >
              Play vs Bots
            </button>

            <button
              onClick={() => setShowRulebook(true)}
              className="w-full py-3 rounded-xl text-base transition-all active:scale-[0.98]"
              style={{ background: 'var(--bg-1)', color: 'var(--fg-soft)', border: '1px solid var(--line)' }}
            >
              Rulebook
            </button>
          </div>
        </LobbyPanel>
      </LobbyShell>
    );
  }

  // In a room, waiting for the host to deal.
  const humans = state.players.filter(p => p.isHuman).length;
  const empties = state.players.filter(p => p.name === EMPTY_SLOT_NAME).length;

  return (
    <LobbyShell>
      <LobbyPanel wide heading="Lobby">
        {isHost && (
          <div className="mb-5 p-4 rounded-xl text-center" style={{ background: 'var(--bg-1)', border: '1px solid var(--line)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--dim)' }}>Share this Room ID:</p>
            <p
              className="text-xl sm:text-2xl font-mono tracking-widest select-all cursor-pointer hover:brightness-110"
              style={{ color: 'var(--accent)' }}
              onClick={() => navigator.clipboard?.writeText(peerId).catch(() => {})}
            >
              {peerId}
            </p>
          </div>
        )}

        {isHost && (
          <div className="mb-4">
            <SeatCount value={state.players.length} onChange={setSeats} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {state.players.map((p, i) => {
            const isEmpty = p.name === EMPTY_SLOT_NAME;
            return (
              <SeatRow
                key={i}
                seatNumber={i + 1}
                name={isEmpty ? 'Waiting…' : p.name}
                isEmpty={isEmpty}
                isMe={i === myIndex}
                isBot={false}
              />
            );
          })}
        </div>

        <p className="text-center text-xs mb-3" style={{ color: 'var(--dim)' }}>
          {humans} {humans === 1 ? 'player' : 'players'} in
          {empties > 0 && ` · ${empties} empty ${empties === 1 ? 'seat becomes a bot' : 'seats become bots'}`}
        </p>

        {isHost ? (
          <button
            onClick={onStartRound}
            className="btn-accent w-full py-3.5 rounded-xl text-base sm:text-lg font-semibold"
          >
            Deal
          </button>
        ) : (
          <div className="text-center animate-pulse" style={{ color: 'var(--fg-soft)' }}>
            Waiting for the host to deal
          </div>
        )}

        <button
          onClick={onLeaveRoom}
          className="mt-3 w-full py-2 text-sm transition-colors"
          style={{ color: 'var(--dim)' }}
        >
          Leave
        </button>
      </LobbyPanel>
    </LobbyShell>
  );
};

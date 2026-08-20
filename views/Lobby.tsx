import React, { useState } from 'react';
import { LobbyShell, LobbyPanel, lobbyInputClass, lobbyInputStyle } from '@laurelwood/card-class';
import { Rulebook } from '../components/Rulebook';
import { MAX_PLAYERS, MIN_PLAYERS } from '../rules';

export const Lobby: React.FC<{
  playerName: string;
  setPlayerName: (n: string) => void;
  numPlayers: number;
  setNumPlayers: (n: number) => void;
  onStart: () => void;
}> = ({ playerName, setPlayerName, numPlayers, setNumPlayers, onStart }) => {
  const [showRulebook, setShowRulebook] = useState(false);
  if (showRulebook) return <Rulebook onClose={() => setShowRulebook(false)} />;

  const counts = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, i) => MIN_PLAYERS + i,
  );

  return (
    <LobbyShell>
      <LobbyPanel title="Flip 7" subtitle="Push Your Luck">
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

          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] mb-1.5" style={{ color: 'var(--dim)' }}>
              Players
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {counts.map(n => {
                const active = n === numPlayers;
                return (
                  <button
                    key={n}
                    onClick={() => setNumPlayers(n)}
                    className="w-10 h-10 rounded-xl font-display transition-all active:scale-95"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-1)',
                      color: active ? '#06121f' : 'var(--fg-soft)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={onStart}
            className="btn-accent w-full py-3.5 rounded-xl text-base sm:text-lg font-semibold"
          >
            Play
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
};

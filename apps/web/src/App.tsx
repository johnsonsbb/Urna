import {
  VOCATIONS,
  formatNumber,
  type PartyConfig,
  type Vocation,
} from '@covil/core';
import { useCallback, useMemo, useState } from 'react';

import { useArena } from './game/useArena';
import { ArenaScreen } from './ui/ArenaScreen';
import { BottomNav, type Tab } from './ui/BottomNav';
import { PartyScreen } from './ui/PartyScreen';
import { Placeholder } from './ui/Placeholder';

/** Nomes fixos por vocação, só para o protótipo ter cara de gente. */
const NAMES: Record<Vocation, string> = {
  knight: 'Bruma',
  paladin: 'Corvo',
  sorcerer: 'Vesp',
  druid: 'Tália',
};

const DEFAULT_ROSTER: Vocation[] = ['knight', 'druid', 'sorcerer'];
const MAX_SLOTS = 3;

export function App() {
  const [tab, setTab] = useState<Tab>('arena');
  const [roster, setRoster] = useState<Vocation[]>(DEFAULT_ROSTER);
  const [arenaId, setArenaId] = useState('covil_raso');
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(0x5eed);

  const party = useMemo<PartyConfig[]>(
    () =>
      roster.map((vocation) => ({
        name: NAMES[vocation],
        vocation,
        level: 22,
      })),
    [roster],
  );

  const { canvasRef, snapshot, updateDoctrine, restart } = useArena({
    arenaId,
    party,
    seed,
    speed,
    paused,
  });

  const toggleVocation = useCallback((vocation: Vocation) => {
    setRoster((current) => {
      if (current.includes(vocation)) {
        // Nunca deixa o grupo vazio.
        if (current.length === 1) return current;
        return current.filter((id) => id !== vocation);
      }
      if (current.length >= MAX_SLOTS) return current;
      return [...current, vocation];
    });
  }, []);

  const handleRestart = useCallback(() => {
    restart();
    setSeed((current) => (current + 0x9e37) >>> 0);
  }, [restart]);

  const isArena = tab === 'arena';

  return (
    <div className="app">
      <header className="header">
        <span className="header__brand">Covil</span>
        <div className="header__stats">
          <span className="header__stat">
            gold <b className="tabular">{formatNumber(snapshot?.totals.gold ?? 0)}</b>
          </span>
          <span className="header__stat">
            exp <b className="tabular">{formatNumber(snapshot?.totals.exp ?? 0)}</b>
          </span>
        </div>
      </header>

      <main className={'app__main' + (isArena ? '' : ' app__main--single')}>
        {isArena && (
          <ArenaScreen
            snapshot={snapshot}
            canvasRef={canvasRef}
            paused={paused}
            onTogglePause={() => setPaused((value) => !value)}
            speed={speed}
            onSpeedChange={setSpeed}
            arenaId={arenaId}
            onArenaChange={setArenaId}
            onRestart={handleRestart}
          />
        )}

        {tab === 'grupo' && (
          <div className="col">
            <section className="card">
              <div className="card__head">
                <span className="card__title">Composição — {roster.length}/{MAX_SLOTS} slots</span>
              </div>
              <div className="card__body">
                <p className="field__hint" style={{ marginTop: 0, marginBottom: 12 }}>
                  São quatro vocações para três slots. Não existe escolha obviamente certa — e a
                  melhor muda conforme a arena.
                </p>
                <div className="segmented" role="group" aria-label="Vocações do grupo">
                  {Object.values(VOCATIONS).map((vocation) => (
                    <button
                      key={vocation.id}
                      type="button"
                      className="segmented__option"
                      aria-pressed={roster.includes(vocation.id)}
                      onClick={() => toggleVocation(vocation.id)}
                    >
                      {vocation.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <PartyScreen snapshot={snapshot} onDoctrineChange={updateDoctrine} />
          </div>
        )}

        {tab === 'mochila' && (
          <Placeholder title="Mochila">
            Equipamento, inventário, loot pouch e suprimentos. Ainda não construída — o protótipo
            existe para validar o combate e o enquadramento na tela, não a economia.
          </Placeholder>
        )}

        {tab === 'loja' && (
          <Placeholder title="Loja">
            Compra de poções e equipamento, venda do loot. É aqui que o custo de manter o grupo
            vivo vira decisão, mas ela só faz sentido depois que a economia existir.
          </Placeholder>
        )}

        {tab === 'ranking' && (
          <Placeholder title="Ranking">
            Classificação global. Depende do backend, que ainda não foi escrito.
          </Placeholder>
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

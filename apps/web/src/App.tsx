import {
  VOCATIONS,
  formatNumber,
  type Doctrine,
  type PartyConfig,
  type Vocation,
} from '@covil/core';
import { useCallback, useMemo, useState } from 'react';

import { useArena } from './game/useArena';
import { useSession } from './state/useSession';
import { ArenaScreen } from './ui/ArenaScreen';
import { AuthScreen } from './ui/AuthScreen';
import { BottomNav, type Tab } from './ui/BottomNav';
import { PartyScreen } from './ui/PartyScreen';
import { Placeholder } from './ui/Placeholder';
import { RankingScreen } from './ui/RankingScreen';
import { ReportCard } from './ui/ReportCard';
import { ShopScreen } from './ui/ShopScreen';

/** Nomes do grupo de demonstração, para quem ainda não criou conta. */
const DEMO_NAMES: Record<Vocation, string> = {
  knight: 'Bruma',
  paladin: 'Corvo',
  sorcerer: 'Vesp',
  druid: 'Tália',
};

const DEMO_ROSTER: Vocation[] = ['knight', 'druid', 'sorcerer'];
const DEMO_LEVEL = 22;
const MAX_SLOTS = 3;

export function App() {
  const [tab, setTab] = useState<Tab>('arena');
  const [showAuth, setShowAuth] = useState(false);
  const [demoRoster, setDemoRoster] = useState<Vocation[]>(DEMO_ROSTER);
  const [demoArena, setDemoArena] = useState('covil_raso');
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(0x5eed);

  const { session, login, register, logout, command, dismissReport, clearError } = useSession();
  const { player } = session;
  const authenticated = session.status === 'autenticado' && player !== null;

  /**
   * O grupo da simulação vem do servidor quando há conta.
   *
   * A arena local é previsão, não verdade: mostra o que o grupo real está
   * fazendo agora, com os níveis, a doutrina e o estoque que o servidor
   * guardou. Quem decide o que aconteceu continua sendo o servidor.
   */
  const party = useMemo<PartyConfig[]>(() => {
    if (authenticated) {
      return player.party.map((member) => ({
        name: member.name,
        vocation: member.vocation,
        level: member.level,
        doctrine: member.doctrine,
        potions: member.potions,
        manaPotions: member.manaPotions,
      }));
    }
    return demoRoster.map((vocation) => ({
      name: DEMO_NAMES[vocation],
      vocation,
      level: DEMO_LEVEL,
    }));
  }, [authenticated, player, demoRoster]);

  const arenaId = authenticated ? player.arenaId : demoArena;

  // Empurrar libera uma onda além do que já foi vencido; o ciclo seguro, não.
  const waveCap = authenticated
    ? Math.max(1, player.clearedWaves + (player.policy === 'empurrar' ? 1 : 0))
    : undefined;

  const { canvasRef, snapshot, updateDoctrine, restart } = useArena({
    arenaId,
    party,
    seed,
    speed,
    paused,
    waveCap,
  });

  const toggleDemoVocation = useCallback((vocation: Vocation) => {
    setDemoRoster((current) => {
      if (current.includes(vocation)) {
        return current.length === 1 ? current : current.filter((id) => id !== vocation);
      }
      return current.length >= MAX_SLOTS ? current : [...current, vocation];
    });
  }, []);

  /** Com conta, a doutrina vai para o servidor; sem conta, só para a arena local. */
  const handleDoctrine = useCallback(
    (memberIndex: number, patch: Partial<Doctrine>) => {
      updateDoctrine(memberIndex, patch);
      if (authenticated) void command({ type: 'doutrina', memberIndex, patch });
    },
    [authenticated, command, updateDoctrine],
  );

  const handleArena = useCallback(
    (nextArenaId: string) => {
      if (authenticated) void command({ type: 'arena', arenaId: nextArenaId });
      else setDemoArena(nextArenaId);
    },
    [authenticated, command],
  );

  const handleRestart = useCallback(() => {
    restart();
    setSeed((current) => (current + 0x9e37) >>> 0);
  }, [restart]);

  if (showAuth) {
    return (
      <div className="app">
        <Header
          player={player}
          name={session.name}
          onAuth={() => setShowAuth(true)}
          onLogout={logout}
        />
        <main className="app__main app__main--single">
          <AuthScreen
            busy={session.busy}
            error={session.error}
            onLogin={async (email, password) => {
              const ok = await login(email, password);
              if (ok) setShowAuth(false);
              return ok;
            }}
            onRegister={async (input) => {
              const ok = await register(input);
              if (ok) setShowAuth(false);
              return ok;
            }}
            onCancel={() => {
              clearError();
              setShowAuth(false);
            }}
          />
        </main>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    );
  }

  const isArena = tab === 'arena';

  return (
    <div className="app">
      <Header
        player={player}
        name={session.name}
        onAuth={() => setShowAuth(true)}
        onLogout={logout}
      />

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
            onArenaChange={handleArena}
            onRestart={handleRestart}
            player={player}
            onPolicyChange={(policy) => void command({ type: 'politica', policy })}
            busy={session.busy}
          />
        )}

        {tab === 'grupo' && (
          <div className="col">
            {!authenticated && (
              <section className="card">
                <div className="card__head">
                  <span className="card__title">
                    Composição — {demoRoster.length}/{MAX_SLOTS} slots
                  </span>
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
                        aria-pressed={demoRoster.includes(vocation.id)}
                        onClick={() => toggleDemoVocation(vocation.id)}
                      >
                        {vocation.name}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <PartyScreen snapshot={snapshot} onDoctrineChange={handleDoctrine} />
          </div>
        )}

        {tab === 'mochila' && (
          <Placeholder title="Mochila">
            Equipamento e inventário ainda não existem. O progresso hoje vem de nível e de
            suprimento — equipar entra depois, junto com o loot.
          </Placeholder>
        )}

        {tab === 'loja' && (
          <ShopScreen player={player} busy={session.busy} onCommand={command} />
        )}

        {tab === 'ranking' && <RankingScreen currentName={session.name} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {session.report && (
        <ReportCard report={session.report} onDismiss={dismissReport} />
      )}
    </div>
  );
}

function Header({
  player,
  name,
  onAuth,
  onLogout,
}: {
  player: ReturnType<typeof useSession>['session']['player'];
  name: string | null;
  onAuth: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="header">
      <span className="header__brand">Covil</span>
      <div className="header__stats">
        {player ? (
          <>
            <span className="header__stat">
              gold <b className="tabular">{formatNumber(player.gold)}</b>
            </span>
            <span className="header__stat">
              stamina <b className="tabular">{Math.floor(player.stamina / 60)}h</b>
            </span>
            <button
              type="button"
              className="header__link"
              onClick={onLogout}
              title={`Sair da conta de ${name}`}
            >
              {name} · sair
            </button>
          </>
        ) : (
          <button type="button" className="header__link" onClick={onAuth}>
            Entrar / criar conta
          </button>
        )}
      </div>
    </header>
  );
}

import { ARENAS, formatDuration, formatNumber, type Combatant } from '@covil/core';
import { useMemo, type RefObject } from 'react';

import { getSprite } from '../game/sprites';
import type { ArenaSnapshot } from '../game/useArena';
import { IconPause, IconPlay, IconRestart } from './Icons';
import { WaveTrack } from './WaveTrack';

interface ArenaScreenProps {
  snapshot: ArenaSnapshot | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  paused: boolean;
  onTogglePause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  arenaId: string;
  onArenaChange: (arenaId: string) => void;
  onRestart: () => void;
}

const SPEEDS = [1, 2, 4] as const;

const WAVE_STATE_LABEL: Record<string, string> = {
  preparando: 'preparando…',
  lutando: 'em combate',
  limpa: 'onda concluída',
  derrota: 'grupo recuando',
};

export function ArenaScreen({
  snapshot,
  canvasRef,
  paused,
  onTogglePause,
  speed,
  onSpeedChange,
  arenaId,
  onArenaChange,
  onRestart,
}: ArenaScreenProps) {
  return (
    <>
      {/* Duas colunas: em telas grandes viram lado a lado; no celular, empilham. */}
      <div className="col">
      <section className="arena">
        <div className="arena__bar">
          <span className="arena__name">{snapshot?.arenaName ?? '—'}</span>
          <span className="arena__state">
            {snapshot ? WAVE_STATE_LABEL[snapshot.waveState] ?? snapshot.waveState : ''}
          </span>
        </div>

        {/*
          O canvas é absoluto dentro do palco de propósito: com fluxo normal, a
          largura do backing store vira largura intrínseca, infla o container e
          realimenta a medição — o layout cresce sozinho a cada quadro.
        */}
        <div className="arena__stage">
          <canvas
            ref={canvasRef}
            className="arena__canvas"
            role="img"
            aria-label="Arena de combate. O grupo luta automaticamente."
          />
        </div>

        {snapshot && (
          <WaveTrack
            current={snapshot.waveIndex}
            total={snapshot.totalWaves}
            isBoss={snapshot.isBoss}
          />
        )}
      </section>

      <div className="controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onTogglePause}
          aria-label={paused ? 'Retomar a simulação' : 'Pausar a simulação'}
        >
          {paused ? <IconPlay size={18} /> : <IconPause size={18} />}
          {paused ? 'Retomar' : 'Pausar'}
        </button>

        <div
          className="segmented"
          role="group"
          aria-label="Velocidade da simulação"
          style={{ flex: 1 }}
        >
          {SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              className="segmented__option"
              aria-pressed={speed === option}
              onClick={() => onSpeedChange(option)}
            >
              {option}×
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={onRestart}
          aria-label="Reiniciar a arena"
        >
          <IconRestart size={18} />
        </button>
      </div>

      <div className="segmented" role="group" aria-label="Escolher arena">
        {Object.values(ARENAS).map((arena) => (
          <button
            key={arena.id}
            type="button"
            className="segmented__option"
            aria-pressed={arenaId === arena.id}
            onClick={() => onArenaChange(arena.id)}
          >
            {arena.name}
          </button>
        ))}
      </div>
      </div>

      <div className="col">
      {snapshot && (
        <>
          <section className="card">
            <div className="card__head">
              <span className="card__title">Grupo</span>
              <span className="arena__state">
                {snapshot.monstersAlive} inimigo{snapshot.monstersAlive === 1 ? '' : 's'}
              </span>
            </div>
            <div className="card__body">
              <div className="party">
                {snapshot.party.map((member) => (
                  <MemberBars key={member.id} member={member} />
                ))}
              </div>
            </div>
          </section>

          <div className="metrics">
            <Metric label="Abates" value={formatNumber(snapshot.totals.kills)} />
            <Metric label="Exp" value={formatNumber(snapshot.totals.exp)} />
            <Metric label="Gold" value={formatNumber(snapshot.totals.gold)} />
            <Metric label="Ondas" value={formatNumber(snapshot.totals.wavesCleared)} />
            <Metric label="Poções" value={formatNumber(snapshot.totals.potionsUsed)} />
            <Metric label="Sessão" value={formatDuration(snapshot.timeMs)} />
          </div>

          <section className="card">
            <div className="card__head">
              <span className="card__title">Registro</span>
            </div>
            <div className="card__body">
              <div className="log" aria-live="polite">
                {[...snapshot.log].reverse().map((entry, index) => (
                  <span key={`${entry.tMs}-${index}`} className={`log__line log__line--${entry.kind}`}>
                    {entry.text}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      </div>
    </>
  );
}

function MemberBars({ member }: { member: Combatant }) {
  const hpPct = Math.max(0, (member.hp / member.maxHp) * 100);
  const manaPct = member.maxMana > 0 ? Math.max(0, (member.mana / member.maxMana) * 100) : 0;
  const avatar = useMemo(() => getSprite(member.sprite, 3)?.toDataURL() ?? '', [member.sprite]);

  return (
    <div className={'member' + (member.alive ? '' : ' member--down')}>
      {avatar ? (
        <img className="member__avatar" src={avatar} alt="" width={40} height={40} />
      ) : (
        <div className="member__avatar" aria-hidden="true" />
      )}
      <div>
        <div className="member__top">
          <span className="member__name">{member.name}</span>
          <span className="member__level tabular">lvl {member.level}</span>
        </div>

        <div className="bar">
          <div
            className={`bar__fill bar__fill--${hpClass(hpPct)}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        {member.maxMana > 0 && (
          <div className="bar">
            <div className="bar__fill bar__fill--mana" style={{ width: `${manaPct}%` }} />
          </div>
        )}

        <div className="member__numbers tabular">
          <span>
            {Math.round(member.hp)}/{member.maxHp}
          </span>
          {member.maxMana > 0 && (
            <span>
              {Math.round(member.mana)}/{member.maxMana} mana
            </span>
          )}
          <span>{member.potions} poções</span>
        </div>
      </div>
    </div>
  );
}

function hpClass(pct: number): string {
  if (pct < 35) return 'hp-low';
  if (pct < 65) return 'hp-mid';
  return 'hp';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
    </div>
  );
}

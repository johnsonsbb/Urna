import { getVocation, type Combatant, type Doctrine, type TargetPriority } from '@covil/core';
import { useMemo } from 'react';

import { getSpriteDataUrl } from '../game/atlas';
import type { ArenaSnapshot } from '../game/useArena';

interface PartyScreenProps {
  snapshot: ArenaSnapshot | null;
  onDoctrineChange: (memberIndex: number, patch: Partial<Doctrine>) => void;
}

const PRIORITIES: { value: TargetPriority; label: string; hint: string }[] = [
  { value: 'mais-proximo', label: 'Mais perto', hint: 'Bate no que estiver na cara. Previsível, segura a linha.' },
  { value: 'mais-fraco', label: 'Mais fraco', hint: 'Limpa a onda rápido e reduz o número de inimigos batendo.' },
  { value: 'mais-forte', label: 'Mais forte', hint: 'Derruba a ameaça grande antes, mas o resto continua machucando.' },
];

export function PartyScreen({ snapshot, onDoctrineChange }: PartyScreenProps) {
  if (!snapshot) return null;

  return (
    <>
      <p className="notice">
        Você nunca move ninguém e nunca dá uma ordem em combate. O que você define aqui é a{' '}
        <b>doutrina</b> — e ela vale imediatamente, com a arena rodando. Mude a prioridade de alvo
        do feiticeiro e observe a diferença na próxima onda.
      </p>

      {snapshot.party.map((member, index) => (
        <MemberCard
          key={member.id}
          member={member}
          onChange={(patch) => onDoctrineChange(index, patch)}
        />
      ))}
    </>
  );
}

function MemberCard({
  member,
  onChange,
}: {
  member: Combatant;
  onChange: (patch: Partial<Doctrine>) => void;
}) {
  const vocation = member.vocation ? getVocation(member.vocation) : null;
  const avatar = useMemo(() => getSpriteDataUrl(member.sprite, 2), [member.sprite]);

  return (
    <section className="card">
      <div className="card__head">
        {avatar && <img className="member__avatar" src={avatar} alt="" width={40} height={40} />}
        <div>
          <div className="member__name">{member.name}</div>
          <div className="member__role">
            {vocation?.name} · {vocation?.role} · lvl {member.level}
          </div>
        </div>
      </div>

      <div className="card__body">
        {vocation && <p className="field__hint" style={{ marginTop: 0 }}>{vocation.description}</p>}

        <div className="doctrine">
          <div className="field">
            <label id={`prio-${member.id}`}>Prioridade de alvo</label>
            <div className="segmented" role="group" aria-labelledby={`prio-${member.id}`}>
              {PRIORITIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="segmented__option"
                  aria-pressed={member.doctrine.targetPriority === option.value}
                  onClick={() => onChange({ targetPriority: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="field__hint">
              {PRIORITIES.find((o) => o.value === member.doctrine.targetPriority)?.hint}
            </p>
          </div>

          <div className="field">
            <label htmlFor={`dist-${member.id}`}>
              Distância de engajamento — <b className="tabular">{member.doctrine.engageDistance}</b>{' '}
              tiles
            </label>
            <input
              id={`dist-${member.id}`}
              className="slider"
              type="range"
              min={1}
              max={6}
              step={1}
              value={member.doctrine.engageDistance}
              onChange={(event) => onChange({ engageDistance: Number(event.target.value) })}
            />
            <p className="field__hint">
              Quanto ele tenta manter de distância do alvo. Alcance de ataque:{' '}
              {member.attackRange} tile{member.attackRange === 1 ? '' : 's'} — pedir mais que isso
              faz ele ficar sem bater.
            </p>
          </div>

          <div className="field">
            <label htmlFor={`pot-${member.id}`}>
              Beber poção de vida abaixo de{' '}
              <b className="tabular">{member.doctrine.potionBelowPct}%</b>
            </label>
            <input
              id={`pot-${member.id}`}
              className="slider"
              type="range"
              min={0}
              max={90}
              step={5}
              value={member.doctrine.potionBelowPct}
              onChange={(event) => onChange({ potionBelowPct: Number(event.target.value) })}
            />
            <p className="field__hint">
              Cedo demais torra o estoque; tarde demais mata. É esse ajuste que decide se a caçada
              dá lucro.
            </p>
          </div>

          {member.doctrine.healAllyBelowPct > 0 && (
            <div className="field">
              <label htmlFor={`heal-${member.id}`}>
                Curar aliado abaixo de{' '}
                <b className="tabular">{member.doctrine.healAllyBelowPct}%</b>
              </label>
              <input
                id={`heal-${member.id}`}
                className="slider"
                type="range"
                min={20}
                max={95}
                step={5}
                value={member.doctrine.healAllyBelowPct}
                onChange={(event) => onChange({ healAllyBelowPct: Number(event.target.value) })}
              />
              <p className="field__hint">
                Curar cedo gasta mana à toa; curar tarde perde o cavaleiro. Com dois ou mais
                feridos ele troca sozinho para a cura em área.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

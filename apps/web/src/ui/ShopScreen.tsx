import { formatNumber, type PlayerView } from '@covil/core';
import { useState } from 'react';

import type { Command } from '../api/client';
import { Placeholder } from './Placeholder';

interface ShopScreenProps {
  player: PlayerView | null;
  busy: boolean;
  onCommand: (command: Command) => Promise<boolean>;
}

/** Preços espelham o servidor, que é quem valida a compra de verdade. */
const PRICES = { vida: 45, mana: 55 } as const;
const AMOUNTS = [10, 50, 200] as const;

export function ShopScreen({ player, busy, onCommand }: ShopScreenProps) {
  const [pending, setPending] = useState<string | null>(null);

  if (!player) {
    return (
      <Placeholder title="Loja">
        Repor poções é o principal dreno de gold do jogo — e o que decide se vale empurrar hoje.
        Entre com uma conta para comprar.
      </Placeholder>
    );
  }

  const buy = async (item: 'vida' | 'mana', quantity: number) => {
    const key = `${item}-${quantity}`;
    setPending(key);
    await onCommand({ type: 'comprar', item, quantity });
    setPending(null);
  };

  const totalPotions = player.party.reduce((sum, member) => sum + member.potions, 0);
  const totalMana = player.party.reduce((sum, member) => sum + member.manaPotions, 0);

  return (
    <div className="col">
      <p className="notice">
        As poções são divididas igualmente entre os três. Quem fica sem estoque morre na primeira
        onda difícil — e uma noite inteira de derrotas torra mais gold do que o suprimento teria
        custado.
      </p>

      {(['vida', 'mana'] as const).map((item) => (
        <section className="card" key={item}>
          <div className="card__head">
            <span className="card__title">
              {item === 'vida' ? 'Poção de vida' : 'Poção de mana'}
            </span>
            <span className="arena__state tabular">
              {formatNumber(item === 'vida' ? totalPotions : totalMana)} em estoque
            </span>
          </div>
          <div className="card__body">
            <p className="field__hint" style={{ marginTop: 0 }}>
              {PRICES[item]} gold por unidade.
            </p>
            <div className="controls">
              {AMOUNTS.map((quantity) => {
                const cost = PRICES[item] * quantity;
                const affordable = player.gold >= cost;
                return (
                  <button
                    key={quantity}
                    type="button"
                    className="btn"
                    disabled={busy || !affordable}
                    onClick={() => buy(item, quantity)}
                  >
                    {pending === `${item}-${quantity}` ? '…' : `${quantity}`}
                    <span className="shop__price tabular">{formatNumber(cost)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="card">
        <div className="card__head">
          <span className="card__title">Estoque por personagem</span>
        </div>
        <div className="card__body">
          <div className="party">
            {player.party.map((member) => (
              <div className="member" key={member.id} style={{ gridTemplateColumns: '1fr' }}>
                <div>
                  <div className="member__top">
                    <span className="member__name">{member.name}</span>
                    <span className="member__level tabular">lvl {member.level}</span>
                  </div>
                  <div className="member__numbers tabular">
                    <span>{member.potions} vida</span>
                    <span>{member.manaPotions} mana</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

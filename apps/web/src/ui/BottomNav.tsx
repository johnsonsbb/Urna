import type { ReactElement } from 'react';

import { IconArena, IconBag, IconParty, IconStore, IconTrophy } from './Icons';

export type Tab = 'arena' | 'grupo' | 'mochila' | 'loja' | 'ranking';

const TABS: { id: Tab; label: string; Icon: (props: { size?: number }) => ReactElement }[] = [
  { id: 'arena', label: 'Arena', Icon: IconArena },
  { id: 'grupo', label: 'Grupo', Icon: IconParty },
  { id: 'mochila', label: 'Mochila', Icon: IconBag },
  { id: 'loja', label: 'Loja', Icon: IconStore },
  { id: 'ranking', label: 'Ranking', Icon: IconTrophy },
];

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

/** Cinco abas — o limite recomendado para navegação inferior. */
export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="nav" aria-label="Navegação principal">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="nav__item"
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={21} />
          <span>{label}</span>
          <span className="nav__dot" />
        </button>
      ))}
    </nav>
  );
}

import type { ReactNode } from 'react';

/**
 * Barra inferior de navegação. O documento não desenha um menu, mas a 9.3 fala
 * em respeitar a safe area "na barra inferior", e sem ela não há como chegar
 * nos recorrentes. Só os destinos que já existem aparecem.
 */

export type Tab = 'semana' | 'recorrentes' | 'painel' | 'ajustes';

function Icon({ tab }: { tab: Tab }) {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {tab === 'semana' ? (
        <>
          <path d="M2 6.5h12" />
          <path d="M2.5 3.5h11v10h-11z" />
          <path d="M5.5 2v2M10.5 2v2" />
        </>
      ) : tab === 'recorrentes' ? (
        /* Relógio. A seta circular já é a categoria Assinaturas, e o mesmo
           glifo em dois lugares passa a significar duas coisas. */
        <>
          <path d="M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8" />
          <path d="M8 4.8V8l2.4 1.5" />
        </>
      ) : tab === 'painel' ? (
        <>
          <path d="M2 13.6h12" />
          <path d="M4.2 13.6V8M8 13.6V3.4M11.8 13.6V6" />
        </>
      ) : (
        <>
          <path d="M2.4 5.2h11.2M2.4 10.8h11.2" />
          <path d="M10.4 5.2a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0" />
          <path d="M6.6 10.8a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0" />
        </>
      )}
    </svg>
  );
}

function TabButton({
  tab,
  current,
  onSelect,
  children,
}: {
  tab: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  children: ReactNode;
}) {
  const selected = tab === current;

  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      aria-current={selected ? 'page' : undefined}
      className={`flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-btn active:bg-hairline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        selected ? 'text-ink' : 'text-steel'
      }`}
    >
      <Icon tab={tab} />
      <span className="type-display text-xs font-semibold">{children}</span>
    </button>
  );
}

export function BottomBar({ current, onSelect }: { current: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav className="sticky bottom-0 border-t border-hairline bg-concrete pb-[env(safe-area-inset-bottom)]">
      {/* Em 320px as quatro abas somam 276px de texto: com px-4 e vão entre
          elas não caberia, então a barra usa respiro menor que o resto. */}
      <div className="mx-auto flex max-w-[480px] px-2 py-1">
        <TabButton tab="semana" current={current} onSelect={onSelect}>
          SEMANA
        </TabButton>
        <TabButton tab="recorrentes" current={current} onSelect={onSelect}>
          RECORRENTES
        </TabButton>
        <TabButton tab="painel" current={current} onSelect={onSelect}>
          PAINEL
        </TabButton>
        <TabButton tab="ajustes" current={current} onSelect={onSelect}>
          AJUSTES
        </TabButton>
      </div>
    </nav>
  );
}

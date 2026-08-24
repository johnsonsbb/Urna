import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Recurring } from './core/types';
import { DEFAULT_SETTINGS, getSettings } from './db/db';
import { BottomBar, type Tab } from './ui/BottomBar';
import { Home } from './ui/Home';
import { Panel } from './ui/Panel';
import { RecurringForm } from './ui/RecurringForm';
import { RecurringList } from './ui/RecurringList';
import { Settings } from './ui/Settings';

/**
 * Navegação mínima: duas abas e o formulário como tela cheia por cima delas.
 * Sem roteador, porque não há URL para guardar — o app abre sempre na semana.
 */
type Route = { name: Tab } | { name: 'form'; recurring?: Recurring };

export function App() {
  const settings = useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
  const [route, setRoute] = useState<Route>({ name: 'semana' });
  const tab: Tab = route.name === 'form' ? 'recorrentes' : route.name;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <main className="flex-1">
        {route.name === 'semana' && <Home />}

        {route.name === 'recorrentes' && (
          <div className="mx-auto w-full max-w-[480px] px-4 pb-8">
            <RecurringList
              locale={settings.locale}
              onNew={() => setRoute({ name: 'form' })}
              onEdit={(recurring) => setRoute({ name: 'form', recurring })}
            />
          </div>
        )}

        {route.name === 'painel' && (
          <div className="mx-auto w-full max-w-[480px] px-4">
            <Panel locale={settings.locale} weekStartsOn={settings.weekStartsOn} />
          </div>
        )}

        {route.name === 'ajustes' && (
          <div className="mx-auto w-full max-w-[480px] px-4">
            <Settings settings={settings} />
          </div>
        )}

        {route.name === 'form' && (
          <div className="mx-auto w-full max-w-[480px] px-4">
            <RecurringForm
              existing={route.recurring}
              locale={settings.locale}
              onDone={() => setRoute({ name: 'recorrentes' })}
            />
          </div>
        )}
      </main>

      {route.name !== 'form' && <BottomBar current={tab} onSelect={(next) => setRoute({ name: next })} />}
    </div>
  );
}

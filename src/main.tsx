import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

/**
 * Fase 1 é só o núcleo: tokens, schema e o módulo de recorrência.
 * A interface começa na fase 2 — este ponto de entrada existe para o Vite ter
 * o que montar e para o CSS ser compilado.
 */
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <main className="mx-auto max-w-[480px] px-4 py-8">
        <h1 className="type-display text-title font-semibold">CashFlow</h1>
        <p className="text-steel mt-2 text-sm">Núcleo instalado. A interface começa na fase 2.</p>
      </main>
    </StrictMode>,
  );
}

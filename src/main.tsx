import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

/**
 * O WebKit apaga dados por origem quando o aparelho aperta, e a permissão de
 * modo persistente não sobrevive de forma confiável entre sessões. Por isso a
 * chamada é repetida em toda abertura, e o resultado aparece nos Ajustes.
 */
async function requestPersistence(): Promise<void> {
  if (!navigator.storage?.persist) return;
  try {
    await navigator.storage.persist();
  } catch {
    // Navegador que recusa não quebra a abertura do app.
  }
}

void requestPersistence();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

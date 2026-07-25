import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { loadAtlas } from './game/atlas';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado');

// O atlas é carregado antes de montar: são poucos KB, e assim nenhum retrato
// da interface nasce vazio esperando a imagem chegar.
await loadAtlas();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

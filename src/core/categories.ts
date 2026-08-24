import type { Flow } from './types';

/**
 * Lista fixa, embutida no código na v1 (seção 5.5). Não é editável pelo usuário.
 * `icon` é a chave do desenho; o SVG em si mora na camada de interface.
 */
export interface Category {
  id: string;
  label: string;
  flow: Flow;
  icon: string;
}

export const OUT_CATEGORIES: readonly Category[] = [
  { id: 'moradia', label: 'Moradia', flow: 'out', icon: 'roof' },
  { id: 'contas', label: 'Contas', flow: 'out', icon: 'bolt' },
  { id: 'transporte', label: 'Transporte', flow: 'out', icon: 'wheel' },
  { id: 'mercado', label: 'Mercado', flow: 'out', icon: 'basket' },
  { id: 'assinaturas', label: 'Assinaturas', flow: 'out', icon: 'loop' },
  { id: 'saude', label: 'Saúde', flow: 'out', icon: 'cross' },
  { id: 'lazer', label: 'Lazer', flow: 'out', icon: 'arc' },
  { id: 'trabalho', label: 'Trabalho', flow: 'out', icon: 'wrench' },
  { id: 'outros', label: 'Outros', flow: 'out', icon: 'dots' },
] as const;

export const IN_CATEGORIES: readonly Category[] = [
  { id: 'salario', label: 'Salário', flow: 'in', icon: 'stack' },
  { id: 'extra', label: 'Extra', flow: 'in', icon: 'plus' },
  { id: 'entrada-outros', label: 'Outros', flow: 'in', icon: 'dots' },
] as const;

export const CATEGORIES: readonly Category[] = [...OUT_CATEGORIES, ...IN_CATEGORIES];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id);
}

export function categoriesFor(flow: Flow): readonly Category[] {
  return flow === 'out' ? OUT_CATEGORIES : IN_CATEGORIES;
}

/** Rótulo para exibição; cai em "Outros" se o id não existir mais. */
export function categoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? 'Outros';
}

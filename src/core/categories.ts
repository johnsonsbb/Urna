import type { Flow } from './types';

/**
 * Lista fixa, embutida no código na v1 (seção 5.5). Não é editável pelo usuário.
 * `icon` é a chave do desenho; o SVG em si mora na camada de interface.
 */
export interface Category {
  id: string;
  label: string;
  flow: Flow;
  /** Chave do desenho. `null` quando não há ícone óbvio: aí vale a inicial. */
  icon: string | null;
}

export const OUT_CATEGORIES: readonly Category[] = [
  { id: 'moradia', label: 'Moradia', flow: 'out', icon: 'house' },
  { id: 'contas', label: 'Contas', flow: 'out', icon: 'receipt' },
  { id: 'transporte', label: 'Transporte', flow: 'out', icon: 'car' },
  { id: 'mercado', label: 'Mercado', flow: 'out', icon: 'basket' },
  { id: 'assinaturas', label: 'Assinaturas', flow: 'out', icon: 'refresh' },
  { id: 'saude', label: 'Saúde', flow: 'out', icon: 'medkit' },
  { id: 'lazer', label: 'Lazer', flow: 'out', icon: 'ticket' },
  { id: 'trabalho', label: 'Trabalho', flow: 'out', icon: 'briefcase' },
  { id: 'outros', label: 'Outros', flow: 'out', icon: null },
] as const;

export const IN_CATEGORIES: readonly Category[] = [
  { id: 'salario', label: 'Salário', flow: 'in', icon: 'banknote' },
  { id: 'extra', label: 'Extra', flow: 'in', icon: null },
  { id: 'entrada-outros', label: 'Outros', flow: 'in', icon: null },
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

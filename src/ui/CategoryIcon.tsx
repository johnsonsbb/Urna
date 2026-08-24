import { getCategory } from '../core/categories';

/**
 * Desenhos geométricos de 16px, traço em currentColor. Ficam em steel na lista,
 * como rótulo — não competem com o valor.
 */
const PATHS: Record<string, string> = {
  roof: 'M2 8 8 3l6 5M4 8v5h8V8',
  bolt: 'M9 2 4 9h3.5L7 14l5-7H8.5z',
  wheel: 'M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3m0 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3',
  basket: 'M3 6h10l-1.3 7H4.3zM6 6l1-3M10 6 9 3',
  loop: 'M12.8 8a4.8 4.8 0 1 1-1.6-3.6M8.2 1.6l3.2 2.8-2.8 2.4',
  cross: 'M8 4v8M4 8h8',
  arc: 'M3 12.5a5 5 0 0 1 10 0',
  wrench: 'M10.5 2.5a3 3 0 0 0 2.6 5l-8 5.6-2.2-2.2z',
  dots: 'M4 8h.01M8 8h.01M12 8h.01',
  stack: 'M3 5h10M3 8h10M3 11h10',
  plus: 'M8 3v10M3 8h10',
};

export function CategoryIcon({ categoryId }: { categoryId: string }) {
  const icon = getCategory(categoryId)?.icon ?? 'dots';
  const path = PATHS[icon] ?? PATHS['dots'];

  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

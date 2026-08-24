import { getCategory } from '../core/categories';

/**
 * Ícones de 16px, traço em currentColor, desenhados para serem reconhecíveis
 * como a coisa que a categoria é. Categoria sem ícone óbvio cai na inicial
 * dentro de um círculo, que é honesto e não parece botão quebrado.
 */
const PATHS: Record<string, string[]> = {
  house: ['M2.5 7.6 8 3l5.5 4.6', 'M4.2 7.8V13h7.6V7.8', 'M6.9 13v-3.1h2.2V13'],
  receipt: ['M4 2.6h8v11l-2-1.3-2 1.3-2-1.3-2 1.3z', 'M6.2 5.9h3.6', 'M6.2 8.4h3.6'],
  car: [
    'M1.8 10.4V8.3l1.6-.4 1.7-2.6h5.3l1.4 2.6 2.4.5v2z',
    'M4.4 10.4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
    'M9.3 10.4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0',
  ],
  basket: ['M3 6h10l-1.3 7H4.3z', 'M6 6l1-3', 'M10 6 9 3'],
  refresh: ['M13 8A5 5 0 1 1 8 3', 'M5.9 1.1 8.2 3 5.9 4.9'],
  medkit: ['M2.9 5.4h10.2v7.4H2.9z', 'M8 7.1v4', 'M6 9.1h4', 'M6.2 5.4V3.6h3.6v1.8'],
  ticket: ['M2 6.6V4.4h12v2.2a1.4 1.4 0 0 0 0 2.8v2.2H2V9.4a1.4 1.4 0 0 0 0-2.8z', 'M9.1 4.4v7.2'],
  briefcase: ['M2.6 5.4h10.8v8H2.6z', 'M6 5.4V3.7h4v1.7', 'M2.6 8.9h10.8'],
  banknote: ['M1.6 4.6h12.8v6.8H1.6z', 'M8 9.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2'],
};

export function CategoryIcon({ categoryId }: { categoryId: string }) {
  const category = getCategory(categoryId);
  const paths = category?.icon ? PATHS[category.icon] : undefined;

  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths ? (
        paths.map((d) => <path key={d} d={d} />)
      ) : (
        <>
          <circle cx="8" cy="8" r="6.6" strokeWidth="1.2" />
          <text
            x="8"
            y="11.2"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="500"
            fill="currentColor"
            stroke="none"
          >
            {(category?.label ?? '?').slice(0, 1).toUpperCase()}
          </text>
        </>
      )}
    </svg>
  );
}

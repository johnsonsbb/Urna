interface PlaceholderProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Aba ainda não construída.
 *
 * Aparece de propósito em vez de ser escondida: a navegação inteira precisa
 * estar na tela para o enquadramento mobile ser avaliado de verdade.
 */
export function Placeholder({ title, children }: PlaceholderProps) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

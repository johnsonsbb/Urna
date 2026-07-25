/** Ícones em SVG — nunca emoji, que muda de forma entre plataformas. */

interface IconProps {
  size?: number;
  className?: string;
}

function Icon({ size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconArena(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 19 6v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z" />
      <path d="M12 8v6" />
      <path d="M9.5 10.5h5" />
    </Icon>
  );
}

export function IconParty(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M17 5.3a3 3 0 0 1 0 5.4" />
      <path d="M17.5 14.3c2.1.6 3.5 2.2 3.5 4.7" />
    </Icon>
  );
}

export function IconBag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Icon>
  );
}

export function IconStore(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9h16l-1.2-4H5.2z" />
      <path d="M5 9v10h14V9" />
      <path d="M10 19v-5h4v5" />
    </Icon>
  );
}

export function IconTrophy(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v4.5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3" />
      <path d="M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M10 14h4v5h-4z" />
      <path d="M8 19h8" />
    </Icon>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5.5 18.5 12 8 18.5z" />
    </Icon>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 5v14M14.5 5v14" />
    </Icon>
  );
}

export function IconSkull(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a7 7 0 0 0-7 7v2.5L6.5 15v3h11v-3L19 12.5V10a7 7 0 0 0-7-7z" />
      <circle cx="9.5" cy="11" r="1.2" />
      <circle cx="14.5" cy="11" r="1.2" />
    </Icon>
  );
}

export function IconRestart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4.5h-4.5" />
    </Icon>
  );
}

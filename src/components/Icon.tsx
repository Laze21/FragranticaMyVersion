/**
 * Our own icon set: 24px grid, 1.6px stroke, square caps where it suits objects, round where
 * it suits gestures. Drawn for this product (atomizer, shelf, blotter strip) instead of pulling
 * a generic icon pack. Decorative by default; pass `label` to make an icon meaningful.
 */
const PATHS: Record<string, string> = {
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm4.8 11.3L20 20',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5 10 17.5 19 7',
  'chevron-down': 'M6 9.5 12 15.5 18 9.5',
  'chevron-right': 'M9.5 6 15.5 12 9.5 18',
  'chevron-left': 'M14.5 6 8.5 12 14.5 18',
  'arrow-right': 'M4 12h15M14 7l5 5-5 5',
  'arrow-up-right': 'M7 17 17 7M9 7h8v8',
  // atomizer: bottle with a pump head and a nozzle
  atomizer: 'M8 10h8v10.2a.8.8 0 0 1-.8.8H8.8a.8.8 0 0 1-.8-.8V10Zm2-3h4v3h-4zM11 4h3v3h-3zM14 5.5h3M18.5 4.5l1.5-1M18.8 5.5H21M18.5 6.5l1.5 1',
  bottle: 'M9 9.5h6a2 2 0 0 1 2 2V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8.5a2 2 0 0 1 2-2Zm1-3h4v3h-4zM9.5 3h5v3.5h-5z',
  shelf: 'M3 19h18M5 19v-6.5h3V19M10 19v-9h3.5v9M15.5 19v-5h3v5M3 21v-2M21 21v-2',
  strip: 'M9 3h6v14l-3 4-3-4V3Z',
  diary: 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 14a2 2 0 0 1 2-2h12M9 8h6',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  compare: 'M4 9.5h5v10.5H4zM5.5 6.5h2v3h-2zM15 11.5h5V20h-5zM16.5 8.5h2v3h-2zM12 4v17',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8a7.5 7.5 0 0 1 15 0',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v6m0-9.2v.1',
  question: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.6-11.2A2.7 2.7 0 0 1 12 8a2.6 2.6 0 0 1 2.7 2.5c0 1.8-2.7 2.2-2.7 3.8m0 3v.1',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14H5Zm0 0 8-8',
  rain: 'M7 15a4 4 0 0 1-.3-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 15H7ZM8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  rotate: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5',
  play: 'M8 5.5v13l10.5-6.5L8 5.5Z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  comment: 'M4 5h16v11H9l-5 4V5Z',
  share: 'M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v8h14v-8',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  source: 'M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5M10 16h5',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z',
  sort: 'M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  wifi_off: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4-2.3M19 12.5a10 10 0 0 0-3-2M2 8.5a15 15 0 0 1 5.5-3.2M22 8.5A15 15 0 0 0 11 4.6M12 20h.01',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, label, className, strokeWidth = 1.6 }: { name: IconName; size?: number; label?: string; className?: string; strokeWidth?: number }) {
  const filled = name === 'play';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

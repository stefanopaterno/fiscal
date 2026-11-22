'use client';

import { useId } from 'react';

/**
 * Marchio di Fiscal: una F stilizzata fatta di tre lame affusolate che salgono verso destra (crescita),
 * con la lama in alto staccata dall'asta. Disegno originale; stesse forme di public/icons/icon.svg.
 * `chiaro`: riquadro bianco con lame blu, per i pannelli blu.
 */
export const LAME_LOGO = [
  'M26 28.5 C42 21.5 59 18 76 18.5 L74 28 C58 27.5 44 30 29 35.5 Z',
  'M31 40.5 L44 37.5 L41 80.5 L34 81.5 Z',
  'M47 51 C54.5 48.5 61 47.5 68 47.5 L66 56 C59.5 56 53.5 57 47 59 Z',
];

export function Logo({ dimensione = 36, chiaro = false }: { dimensione?: number; chiaro?: boolean }) {
  const id = `sfumatura-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B88D8" />
          <stop offset="1" stopColor="#0B4F8F" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={chiaro ? '#FFFFFF' : `url(#${id})`} />
      <g fill={chiaro ? `url(#${id})` : '#FFFFFF'}>
        {LAME_LOGO.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

import React from 'react';

export interface IconeProps {
  readonly tamanho?: number;
}

const PADRAO = 18;

/**
 * SVG inline em vez de fonte de ícones: o app roda embarcado e não pode depender
 * de asset externo. `currentColor` deixa o ícone herdar a cor do botão.
 */
const base = (tamanho: number) => ({
  width: tamanho,
  height: tamanho,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false
});

export const IconeExtrato: React.FC<IconeProps> = ({ tamanho = PADRAO }) => (
  <svg {...base(tamanho)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8" />
    <path d="M8 17h5" />
  </svg>
);

export const IconeInformacao: React.FC<IconeProps> = ({ tamanho = PADRAO }) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

/**
 * Círculo cortado (proibido) — precisa ser inconfundível ao lado do ícone de
 * informação, que também é um círculo. Um "!" em círculo ficaria idêntico.
 */
export const IconeInativo: React.FC<IconeProps> = ({ tamanho = PADRAO }) => (
  <svg {...base(tamanho)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </svg>
);

import { useState, useCallback, useMemo } from 'react';

export interface EstadoModalPj {
  readonly aberto: boolean;
  readonly email: string;
  readonly nome: string;
  readonly cnpj: string;
}

export interface ControleModalPj {
  readonly estado: EstadoModalPj;
  readonly abrir: (email: string, nome: string, cnpj: string) => void;
  readonly fechar: () => void;
}

const FECHADO: EstadoModalPj = { aberto: false, email: '', nome: '', cnpj: '' };

/** Modal de mensagens por PJ (aba Status → botão antes do fornecedor). */
export function useModalPj(): ControleModalPj {
  const [estado, setEstado] = useState<EstadoModalPj>(FECHADO);

  const abrir = useCallback((email: string, nome: string, cnpj: string): void => {
    setEstado({ aberto: true, email, nome, cnpj });
  }, []);

  const fechar = useCallback((): void => {
    setEstado((atual) => ({ ...atual, aberto: false }));
  }, []);

  return useMemo(() => ({ estado, abrir, fechar }), [estado, abrir, fechar]);
}

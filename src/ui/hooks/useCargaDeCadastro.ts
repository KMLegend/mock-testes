import { useCallback, useMemo, useState } from 'react';
import { RelatorioDeImportacao } from '../../application/ports/CargaDeCadastro';
import { useDependencias } from '../providers/DependenciasContext';

export type EstadoCarga = 'ocioso' | 'analisando' | 'previa' | 'aplicando' | 'aplicado';

export interface ControleDaCarga {
  readonly estado: EstadoCarga;
  readonly nomeArquivo: string;
  readonly relatorio: RelatorioDeImportacao | null;
  readonly erroGeral: string;
  readonly podeAplicar: boolean;
  readonly selecionar: (arquivo: File | null) => void;
  readonly aplicar: () => void;
  readonly baixarModelo: () => void;
  readonly exportarBaseAtual: () => void;
  readonly limpar: () => void;
}

function mensagem(falha: unknown): string {
  if (falha instanceof Error) return `Não foi possível ler a planilha: ${falha.message}`;
  return 'Não foi possível ler a planilha. Confira o arquivo (.xlsx) e as abas.';
}

interface EstadoInterno {
  readonly estado: EstadoCarga;
  readonly arquivo: File | null;
  readonly relatorio: RelatorioDeImportacao | null;
  readonly erroGeral: string;
}

const INICIAL: EstadoInterno = { estado: 'ocioso', arquivo: null, relatorio: null, erroGeral: '' };

export function useCargaDeCadastro(onAplicado?: () => void): ControleDaCarga {
  const { cargaDeCadastro } = useDependencias();
  const [interno, setInterno] = useState<EstadoInterno>(INICIAL);

  const selecionar = useCallback(async (arquivo: File | null): Promise<void> => {
    if (!arquivo) return setInterno(INICIAL);
    setInterno({ estado: 'analisando', arquivo, relatorio: null, erroGeral: '' });
    try {
      const relatorio = await cargaDeCadastro.previsualizar(arquivo);
      setInterno({ estado: 'previa', arquivo, relatorio, erroGeral: '' });
    } catch (falha) {
      setInterno({ estado: 'ocioso', arquivo: null, relatorio: null, erroGeral: mensagem(falha) });
    }
  }, [cargaDeCadastro]);

  const aplicar = useCallback(async (): Promise<void> => {
    const arquivo = interno.arquivo;
    if (!arquivo) return;
    setInterno((atual) => ({ ...atual, estado: 'aplicando' }));
    const relatorio = await cargaDeCadastro.aplicar(arquivo);
    setInterno({ estado: 'aplicado', arquivo, relatorio, erroGeral: '' });
    onAplicado?.();
  }, [interno.arquivo, cargaDeCadastro, onAplicado]);

  const podeAplicar =
    interno.estado === 'previa' && interno.relatorio !== null && interno.relatorio.erros.length === 0;

  return useMemo(() => ({
    estado: interno.estado,
    nomeArquivo: interno.arquivo?.name ?? '',
    relatorio: interno.relatorio,
    erroGeral: interno.erroGeral,
    podeAplicar,
    selecionar: (arquivo) => void selecionar(arquivo),
    aplicar: () => void aplicar(),
    baixarModelo: () => cargaDeCadastro.baixarModelo(),
    exportarBaseAtual: () => cargaDeCadastro.exportarBaseAtual(),
    limpar: () => setInterno(INICIAL)
  }), [interno, podeAplicar, selecionar, aplicar, cargaDeCadastro]);
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LinhaDeRecesso } from '../../application/read-models/LinhaDeRecesso';
import { DadosDoFormulario } from '../components/ModalRlt/FormularioDeOcorrencia';
import { useDependencias } from '../providers/DependenciasContext';

export type ModalDeRecesso = 'extrato' | 'contrato' | null;

export interface ControleDoRecesso {
  readonly linhas: readonly LinhaDeRecesso[];
  readonly atualizando: boolean;
  readonly selecionada: LinhaDeRecesso | null;
  readonly modalAberto: ModalDeRecesso;
  readonly atualizar: () => void;
  readonly atualizarFornecedor: (linha: LinhaDeRecesso) => void;
  readonly abrirExtrato: (linha: LinhaDeRecesso) => void;
  readonly abrirInformacao: (linha: LinhaDeRecesso) => void;
  readonly fechar: () => void;
  readonly lancar: (dados: DadosDoFormulario) => Promise<void>;
}

interface Carga {
  readonly linhas: readonly LinhaDeRecesso[];
  readonly atualizando: boolean;
  readonly recarregar: () => Promise<void>;
}

/** Listar já materializa o acúmulo mensal — "Atualizar" é recarregar. */
function useLinhasDeRecesso(): Carga {
  const { listarContratosParaRecesso } = useDependencias();
  const [linhas, setLinhas] = useState<readonly LinhaDeRecesso[]>([]);
  const [atualizando, setAtualizando] = useState<boolean>(false);

  const recarregar = useCallback(async (): Promise<void> => {
    setAtualizando(true);
    try {
      setLinhas(await listarContratosParaRecesso.executar());
    } finally {
      setAtualizando(false);
    }
  }, [listarContratosParaRecesso]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  return useMemo(() => ({ linhas, atualizando, recarregar }), [linhas, atualizando, recarregar]);
}

function useLancarOcorrencia(
  contratoId: string | null,
  recarregar: () => Promise<void>
): (dados: DadosDoFormulario) => Promise<void> {
  const { lancarOcorrenciaDeRecesso } = useDependencias();
  return useCallback(
    async (dados: DadosDoFormulario): Promise<void> => {
      if (!contratoId) return;
      await lancarOcorrenciaDeRecesso.executar({ contratoId, ...dados });
      await recarregar();
    },
    [contratoId, lancarOcorrenciaDeRecesso, recarregar]
  );
}

export function useRecesso(): ControleDoRecesso {
  const { linhas, atualizando, recarregar } = useLinhasDeRecesso();
  const [chave, setChave] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState<ModalDeRecesso>(null);
  const lancar = useLancarOcorrencia(chave, recarregar);

  // A seleção guarda a CHAVE, não a linha: assim o modal reflete o extrato
  // recém-recarregado em vez de um objeto congelado no clique.
  const selecionada = useMemo(
    () => linhas.find((linha) => linha.chave() === chave) ?? null,
    [linhas, chave]
  );

  const abrir = useCallback((linha: LinhaDeRecesso, modal: ModalDeRecesso): void => {
    setChave(linha.chave());
    setModalAberto(modal);
  }, []);

  const abrirExtrato = useCallback(
    (linha: LinhaDeRecesso): void => abrir(linha, 'extrato'), [abrir]
  );
  const abrirInformacao = useCallback(
    (linha: LinhaDeRecesso): void => abrir(linha, 'contrato'), [abrir]
  );
  const fechar = useCallback((): void => { setChave(null); setModalAberto(null); }, []);
  const atualizar = useCallback((): void => { void recarregar(); }, [recarregar]);
  const atualizarFornecedor = useCallback((_linha: LinhaDeRecesso): void => { void recarregar(); }, [recarregar]);

  return useMemo(
    () => ({
      linhas, atualizando, selecionada, modalAberto,
      atualizar, atualizarFornecedor, abrirExtrato, abrirInformacao, fechar, lancar
    }),
    [linhas, atualizando, selecionada, modalAberto,
      atualizar, atualizarFornecedor, abrirExtrato, abrirInformacao, fechar, lancar]
  );
}

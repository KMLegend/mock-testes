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
  readonly abrirExtrato: (linha: LinhaDeRecesso) => void;
  readonly abrirInformacao: (linha: LinhaDeRecesso) => void;
  readonly fechar: () => void;
  readonly lancar: (dados: DadosDoFormulario) => Promise<void>;
  readonly encerrar: (dataDaRescisao: string) => Promise<void>;
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

interface Acoes {
  readonly lancar: (dados: DadosDoFormulario) => Promise<void>;
  readonly encerrar: (dataDaRescisao: string) => Promise<void>;
}

function useAcoesDeRecesso(contratoId: string | null, recarregar: () => Promise<void>): Acoes {
  const { lancarOcorrenciaDeRecesso, encerrarContrato } = useDependencias();

  const lancar = useCallback(
    async (dados: DadosDoFormulario): Promise<void> => {
      if (!contratoId) return;
      await lancarOcorrenciaDeRecesso.executar({ contratoId, ...dados });
      await recarregar();
    },
    [contratoId, lancarOcorrenciaDeRecesso, recarregar]
  );

  const encerrar = useCallback(
    async (dataDaRescisao: string): Promise<void> => {
      if (!contratoId) return;
      await encerrarContrato.executar({ contratoId, dataDaRescisao });
      await recarregar();
    },
    [contratoId, encerrarContrato, recarregar]
  );

  return useMemo(() => ({ lancar, encerrar }), [lancar, encerrar]);
}

export function useRecesso(): ControleDoRecesso {
  const { linhas, atualizando, recarregar } = useLinhasDeRecesso();
  const [chave, setChave] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState<ModalDeRecesso>(null);
  const { lancar, encerrar } = useAcoesDeRecesso(chave, recarregar);

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

  return useMemo(
    () => ({
      linhas, atualizando, selecionada, modalAberto,
      atualizar, abrirExtrato, abrirInformacao, fechar, lancar, encerrar
    }),
    [linhas, atualizando, selecionada, modalAberto,
      atualizar, abrirExtrato, abrirInformacao, fechar, lancar, encerrar]
  );
}

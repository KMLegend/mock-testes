import { useCallback, useEffect, useMemo, useState } from 'react';
import { ItemBasePj } from '../../application/read-models/ItemBasePj';
import { useDependencias } from '../providers/DependenciasContext';

export type FiltroStatusPj = 'Todos' | 'Ativo' | 'Inativo';

export interface ControleBaseDePjs {
  readonly itens: readonly ItemBasePj[];
  readonly itensFiltrados: readonly ItemBasePj[];
  readonly carregando: boolean;
  readonly searchQuery: string;
  readonly statusFilter: FiltroStatusPj;
  readonly totalAtivos: number;
  readonly totalInativos: number;
  readonly setSearchQuery: (query: string) => void;
  readonly setStatusFilter: (status: FiltroStatusPj) => void;
  readonly recarregar: () => void;
}

interface CargaDaBase {
  readonly itens: readonly ItemBasePj[];
  readonly carregando: boolean;
  readonly recarregar: () => Promise<void>;
}

function useItensDaBase(versaoCarga?: number | string): CargaDaBase {
  const { fornecedorRepo, contratoRepo } = useDependencias();
  const [itens, setItens] = useState<readonly ItemBasePj[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);

  const recarregar = useCallback(async (): Promise<void> => {
    setCarregando(true);
    try {
      const [fornecedores, contratos] = await Promise.all([
        fornecedorRepo.todos(),
        contratoRepo.todos()
      ]);
      setItens(fornecedores.map((fornecedor) =>
        new ItemBasePj(fornecedor, contratos.filter((c) => c.ehDoFornecedor(fornecedor.codEmpresa)))
      ));
    } finally {
      setCarregando(false);
    }
  }, [fornecedorRepo, contratoRepo]);

  useEffect(() => { void recarregar(); }, [recarregar, versaoCarga]);

  return { itens, carregando, recarregar };
}

function atendeStatus(item: ItemBasePj, statusFilter: FiltroStatusPj): boolean {
  if (statusFilter === 'Todos') return true;
  return statusFilter === 'Ativo' ? item.ativo : !item.ativo;
}

export function useBaseDePjs(versaoCarga?: number | string): ControleBaseDePjs {
  const { itens, carregando, recarregar } = useItensDaBase(versaoCarga);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FiltroStatusPj>('Todos');

  const totalAtivos = useMemo(() => itens.filter((item) => item.ativo).length, [itens]);
  const totalInativos = useMemo(() => itens.filter((item) => !item.ativo).length, [itens]);

  const itensFiltrados = useMemo(
    () => itens.filter((item) => atendeStatus(item, statusFilter) && item.correspondeA(searchQuery)),
    [itens, searchQuery, statusFilter]
  );

  return useMemo(
    () => ({
      itens,
      itensFiltrados,
      carregando,
      searchQuery,
      statusFilter,
      totalAtivos,
      totalInativos,
      setSearchQuery,
      setStatusFilter,
      recarregar: () => void recarregar()
    }),
    [
      itens,
      itensFiltrados,
      carregando,
      searchQuery,
      statusFilter,
      totalAtivos,
      totalInativos,
      recarregar
    ]
  );
}

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

export function useBaseDePjs(versaoCarga?: number | string): ControleBaseDePjs {
  const { fornecedorRepo, contratoRepo } = useDependencias();
  const [itens, setItens] = useState<readonly ItemBasePj[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FiltroStatusPj>('Todos');

  const recarregar = useCallback(async (): Promise<void> => {
    setCarregando(true);
    try {
      const [fornecedores, contratos] = await Promise.all([
        fornecedorRepo.todos(),
        contratoRepo.todos()
      ]);

      const lista = fornecedores.map((fornecedor) => {
        const contratosDoPj = contratos.filter((c) => c.ehDoFornecedor(fornecedor.codEmpresa));
        return new ItemBasePj(fornecedor, contratosDoPj);
      });

      setItens(lista);
    } finally {
      setCarregando(false);
    }
  }, [fornecedorRepo, contratoRepo]);

  useEffect(() => {
    void recarregar();
  }, [recarregar, versaoCarga]);

  const totalAtivos = useMemo(
    () => itens.filter((item) => item.ativo).length,
    [itens]
  );

  const totalInativos = useMemo(
    () => itens.filter((item) => !item.ativo).length,
    [itens]
  );

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const atendeStatus =
        statusFilter === 'Todos' ||
        (statusFilter === 'Ativo' && item.ativo) ||
        (statusFilter === 'Inativo' && !item.ativo);

      const atendeBusca = item.correspondeA(searchQuery);

      return atendeStatus && atendeBusca;
    });
  }, [itens, searchQuery, statusFilter]);

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

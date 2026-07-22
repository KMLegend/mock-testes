import { createContext, useContext } from 'react';
import { ObterStatusDaCompetencia } from '../../application/use-cases/ObterStatusDaCompetencia';
import { ListarMensagens } from '../../application/use-cases/ListarMensagens';
import { ListarMensagensDoFornecedor } from '../../application/use-cases/ListarMensagensDoFornecedor';
import { ExportarPlanilha } from '../../application/use-cases/ExportarPlanilha';
import { ChamadoRepository } from '../../application/ports/ChamadoRepository';
import { FornecedorRepository } from '../../application/ports/FornecedorRepository';
import { ListarContratosParaRecesso } from '../../application/use-cases/ListarContratosParaRecesso';
import { LancarOcorrenciaDeRecesso } from '../../application/use-cases/LancarOcorrenciaDeRecesso';
import { EncerrarContrato } from '../../application/use-cases/EncerrarContrato';
import { ExportarRecesso } from '../../application/use-cases/ExportarRecesso';

export interface Dependencias {
  readonly obterStatus: ObterStatusDaCompetencia;
  readonly listarMensagens: ListarMensagens;
  readonly listarMensagensDoFornecedor: ListarMensagensDoFornecedor;
  readonly exportarPlanilha: ExportarPlanilha;
  readonly chamadoRepo: ChamadoRepository;
  readonly fornecedorRepo: FornecedorRepository;
  readonly listarContratosParaRecesso: ListarContratosParaRecesso;
  readonly lancarOcorrenciaDeRecesso: LancarOcorrenciaDeRecesso;
  readonly encerrarContrato: EncerrarContrato;
  readonly exportarRecesso: ExportarRecesso;
}

export const DependenciasContext = createContext<Dependencias | null>(null);

export function useDependencias(): Dependencias {
  const context = useContext(DependenciasContext);
  if (!context) {
    throw new Error('useDependencias deve ser usado dentro de CompositionRoot');
  }
  return context;
}

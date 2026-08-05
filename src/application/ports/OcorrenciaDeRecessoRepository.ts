import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';

export interface OcorrenciaDeRecessoRepository {
  todas(): Promise<OcorrenciaDeRecesso[]>;
  doContrato(codContrato: string): Promise<OcorrenciaDeRecesso[]>;
  salvar(ocorrencia: OcorrenciaDeRecesso): Promise<void>;
  /** Persiste os créditos automáticos gerados. Deve ser idempotente na implementação. */
  salvarVarias(ocorrencias: readonly OcorrenciaDeRecesso[]): Promise<void>;
  /**
   * Finalização MANUAL e antecipada do contrato (rescisão + zeramento do saldo,
   * liberada a partir de 30 dias antes do fim da vigência). Idempotente.
   */
  finalizarContratoAntecipadamente(contratoId: string): Promise<void>;
}

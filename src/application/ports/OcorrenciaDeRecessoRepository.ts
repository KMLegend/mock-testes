import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';

export interface OcorrenciaDeRecessoRepository {
  todas(): Promise<OcorrenciaDeRecesso[]>;
  doContrato(codContrato: string): Promise<OcorrenciaDeRecesso[]>;
  salvar(ocorrencia: OcorrenciaDeRecesso): Promise<void>;
  /** Persiste os créditos automáticos gerados. Deve ser idempotente na implementação. */
  salvarVarias(ocorrencias: readonly OcorrenciaDeRecesso[]): Promise<void>;
}

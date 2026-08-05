import { OcorrenciaDeRecessoRepository } from '../ports/OcorrenciaDeRecessoRepository';

export interface DependenciasFinalizarContrato {
  readonly ocorrenciaRepo: OcorrenciaDeRecessoRepository;
}

/**
 * Finalização manual e antecipada do contrato (botão liberado a partir de 30 dias
 * antes do fim da vigência — docs/modulo-recesso): lança a rescisão contratual e o
 * zeramento do saldo sem esperar o dataFim natural chegar. O cálculo em si (regra dos
 * 15 dias, idempotência) é responsabilidade de cada adapter do repositório.
 */
export class FinalizarContratoAntecipadamente {
  constructor(private readonly deps: DependenciasFinalizarContrato) {}

  async executar(contratoId: string): Promise<void> {
    await this.deps.ocorrenciaRepo.finalizarContratoAntecipadamente(contratoId);
  }
}

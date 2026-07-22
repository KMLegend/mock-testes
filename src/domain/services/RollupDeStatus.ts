import { StatusNf } from '../value-objects/StatusNf';

export class RollupDeStatus {
  static calcularStatusFornecedor(statuses: readonly StatusNf[]): StatusNf {
    if (statuses.some((st) => st.ehTratamentoManual())) {
      return StatusNf.tratamentoManual();
    }
    if (statuses.some((st) => st.ehPendente())) {
      return StatusNf.pendente();
    }
    if (statuses.some((st) => st.ehEnviado())) {
      return StatusNf.enviado();
    }
    if (statuses.length > 0 && statuses.every((st) => st.ehRecebido())) {
      return StatusNf.recebido();
    }
    return StatusNf.enviado();
  }
}

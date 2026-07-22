import { LinhaDeRecesso } from '../read-models/LinhaDeRecesso';

export interface ExportadorDeRecesso {
  /** Exporta EXATAMENTE as linhas filtradas em tela. */
  exportar(linhas: readonly LinhaDeRecesso[]): Promise<void>;
}

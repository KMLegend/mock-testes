import {
  CargaDeCadastro,
  RelatorioDeImportacao,
  ErroDeImportacao
} from '../../../application/ports/CargaDeCadastro';
import { BaseDeCadastroStore, BaseDeCadastro } from './BaseDeCadastroStore';
import { OcorrenciaDeRecessoRepositoryEmMemoria } from '../OcorrenciaDeRecessoRepositoryEmMemoria';
import { lerAbas } from './lerPlanilha';
import { validar } from './validarPlanilha';
import { gerarModelo, exportarBase } from './gerarPlanilha';

/**
 * Carga por planilha na Fase 1: parse client-side (lib xlsx) → validação com os
 * mesmos Value Objects do domínio → escrita no store persistido (docs/frontend/21).
 */
export class CargaDeCadastroMock implements CargaDeCadastro {
  constructor(
    private readonly store: BaseDeCadastroStore,
    private readonly ocorrenciaRepo?: OcorrenciaDeRecessoRepositoryEmMemoria
  ) {}

  async previsualizar(arquivo: File): Promise<RelatorioDeImportacao> {
    const { base, erros } = validar(lerAbas(await arquivo.arrayBuffer()));
    return this.montarRelatorio(base, erros);
  }

  async aplicar(arquivo: File): Promise<RelatorioDeImportacao> {
    const { base, erros } = validar(lerAbas(await arquivo.arrayBuffer()));
    if (erros.length > 0) {
      return this.montarRelatorio(base, erros);
    }
    const relatorio = this.store.substituir(base);
    this.ocorrenciaRepo?.limparAutomaticos();
    return relatorio;
  }

  baixarModelo(): void {
    gerarModelo();
  }

  exportarBaseAtual(): void {
    exportarBase(this.store);
  }

  /** Pré-visualização: simula o efeito da substituição total (A-32) sem gravar nada. */
  private montarRelatorio(
    base: BaseDeCadastro,
    erros: readonly ErroDeImportacao[]
  ): RelatorioDeImportacao {
    const codigosNovosFornecedores = new Set(base.fornecedores.map((f) => f.codEmpresa));
    const fornecedoresRemovidos = this.store
      .fornecedores()
      .filter((f) => !codigosNovosFornecedores.has(f.codEmpresa)).length;

    const chavesNovosContratos = new Set(base.contratos.map((c) => c.identificador()));
    const contratosRemovidos = this.store
      .contratos()
      .filter((c) => !chavesNovosContratos.has(c.identificador())).length;

    return {
      fornecedores: {
        importados: base.fornecedores.length,
        removidosDaBaseAnterior: fornecedoresRemovidos
      },
      contratos: {
        importados: base.contratos.length,
        removidosDaBaseAnterior: contratosRemovidos
      },
      ignorados: 0,
      erros
    };
  }
}

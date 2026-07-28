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
    const relatorio = this.store.fundir(base);
    this.ocorrenciaRepo?.limparAutomaticos();
    return relatorio;
  }

  baixarModelo(): void {
    gerarModelo();
  }

  exportarBaseAtual(): void {
    exportarBase(this.store);
  }

  private montarRelatorio(
    base: BaseDeCadastro,
    erros: readonly ErroDeImportacao[]
  ): RelatorioDeImportacao {
    // 1. Simulação Fornecedores
    const fornecedoresAtuais = new Set(this.store.fornecedores().map((f) => f.codEmpresa));
    let fornecedoresInseridos = 0;
    let fornecedoresAtualizados = 0;

    base.fornecedores.forEach((f) => {
      if (fornecedoresAtuais.has(f.codEmpresa)) fornecedoresAtualizados++;
      else fornecedoresInseridos++;
    });

    // 2. Simulação Contratos
    const contratosAtuaisMap = new Map(this.store.contratos().map((c) => [c.identificador(), c]));
    const chavesNovosContratos = new Set(base.contratos.map((c) => c.identificador()));
    let contratosInseridos = 0;
    let contratosAtualizados = 0;
    let contratosReativados = 0;
    let contratosDesativados = 0;

    base.contratos.forEach((c) => {
      const existente = contratosAtuaisMap.get(c.identificador());
      if (!existente) contratosInseridos++;
      else if (existente.ehDeletado) contratosReativados++;
      else contratosAtualizados++;
    });

    this.store.contratos().forEach((c) => {
      if (!c.ehDeletado && !chavesNovosContratos.has(c.identificador())) {
        contratosDesativados++;
      }
    });

    return {
      fornecedores: { inseridos: fornecedoresInseridos, atualizados: fornecedoresAtualizados },
      contratos: {
        inseridos: contratosInseridos,
        atualizados: contratosAtualizados,
        reativados: contratosReativados,
        desativados: contratosDesativados
      },
      ignorados: 0,
      erros
    };
  }
}

import {
  CargaDeCadastro,
  RelatorioDeImportacao,
  ErroDeImportacao
} from '../../../application/ports/CargaDeCadastro';
import { BaseDeCadastroStore, BaseDeCadastro } from './BaseDeCadastroStore';
import { lerAbas } from './lerPlanilha';
import { validar } from './validarPlanilha';
import { gerarModelo, exportarBase } from './gerarPlanilha';

/**
 * Carga por planilha na Fase 1: parse client-side (lib xlsx) → validação com os
 * mesmos Value Objects do domínio → escrita no store persistido (docs/frontend/21).
 */
export class CargaDeCadastroMock implements CargaDeCadastro {
  constructor(private readonly store: BaseDeCadastroStore) {}

  async previsualizar(arquivo: File): Promise<RelatorioDeImportacao> {
    const { base, erros } = validar(lerAbas(await arquivo.arrayBuffer()));
    return this.montarRelatorio(base, erros);
  }

  async aplicar(arquivo: File): Promise<RelatorioDeImportacao> {
    const { base, erros } = validar(lerAbas(await arquivo.arrayBuffer()));
    const relatorio = this.montarRelatorio(base, erros); // contagem ANTES de substituir
    if (erros.length === 0) this.store.substituir(base);
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
    const atuais = this.chavesAtuais();
    const novas = this.chavesDe(base);
    return {
      inseridos: novas.filter((chave) => !atuais.has(chave)).length,
      atualizados: novas.filter((chave) => atuais.has(chave)).length,
      ignorados: 0,
      erros
    };
  }

  private chavesAtuais(): Set<string> {
    return new Set(this.chavesDe({
      fornecedores: this.store.fornecedores(),
      contratos: this.store.contratos()
    }));
  }

  private chavesDe(base: BaseDeCadastro): string[] {
    return [
      ...base.fornecedores.map((item) => `F:${item.codEmpresa}`),
      ...base.contratos.map((item) => `C:${item.identificador()}`)
    ];
  }
}

export interface ErroDeImportacao {
  readonly aba: string;
  readonly linha: number;
  readonly campo: string;
  readonly motivo: string;
}

export interface ResumoAba {
  readonly importados: number;
  readonly removidosDaBaseAnterior: number;
}

export interface RelatorioDeImportacao {
  readonly fornecedores: ResumoAba;
  readonly contratos: ResumoAba;
  readonly ignorados: number;
  readonly erros: readonly ErroDeImportacao[];
}

/**
 * Carga da base de PJs por planilha. Fonte paliativa até o HCM (docs/frontend/21).
 * `previsualizar` valida sem gravar; `aplicar` grava só se o relatório estiver limpo.
 */
export interface CargaDeCadastro {
  previsualizar(arquivo: File): Promise<RelatorioDeImportacao>;
  aplicar(arquivo: File): Promise<RelatorioDeImportacao>;
  baixarModelo(): void;
  exportarBaseAtual(): void;
}

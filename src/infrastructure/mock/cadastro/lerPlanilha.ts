import * as XLSX from 'xlsx';

export interface LinhaBruta {
  readonly linha: number; // número da linha na planilha (1-based)
  readonly valores: Record<string, string>;
}

export interface AbasBrutas {
  readonly fornecedores: readonly LinhaBruta[];
  readonly contratos: readonly LinhaBruta[];
}

export const ABA_FORNECEDORES = 'Fornecedores';
export const ABA_CONTRATOS = 'Contratos';

function lerAba(planilha: XLSX.WorkBook, nome: string): LinhaBruta[] {
  const aba = planilha.Sheets[nome];
  if (!aba) return [];
  const linhas = XLSX.utils.sheet_to_json<string[]>(aba, { header: 1, defval: '', raw: false });
  const cabecalho = (linhas[0] ?? []).map((celula) => String(celula).trim().toLowerCase());
  return linhas.slice(1).flatMap((celulas, indice) => montarLinha(cabecalho, celulas, indice + 2));
}

function montarLinha(cabecalho: string[], celulas: string[], numero: number): LinhaBruta[] {
  const preenchida = celulas.some((celula) => String(celula ?? '').trim() !== '');
  if (!preenchida) return [];
  const valores: Record<string, string> = {};
  cabecalho.forEach((chave, coluna) => {
    valores[chave] = String(celulas[coluna] ?? '').trim();
  });
  return [{ linha: numero, valores }];
}

/** Lê o .xlsx nas duas abas esperadas. Cabeçalhos normalizados para minúsculas. */
export function lerAbas(buffer: ArrayBuffer): AbasBrutas {
  const planilha = XLSX.read(buffer, { type: 'array' });
  return {
    fornecedores: lerAba(planilha, ABA_FORNECEDORES),
    contratos: lerAba(planilha, ABA_CONTRATOS)
  };
}

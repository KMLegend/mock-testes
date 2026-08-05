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
  // raw:true + cellDates:true (no XLSX.read) — células de data chegam como objeto Date,
  // não como texto formatado pelo SheetJS (que usa ordem mês/dia americana por padrão
  // e diverge do que o Excel exibe em pt-BR, quebrando o parser de data BR).
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, { header: 1, defval: '', raw: true });
  const cabecalho = (linhas[0] ?? []).map((celula) => String(celula).trim().toLowerCase());
  return linhas.slice(1).flatMap((celulas, indice) => montarLinha(cabecalho, celulas, indice + 2));
}

/**
 * Formata em AAAA-MM-DD. O SheetJS (cellDates:true) devolve datas normalizadas em UTC —
 * usar getters locais aqui deslocaria o dia conforme o fuso do navegador/processo.
 */
function dataParaIso(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function celulaParaTexto(celula: unknown): string {
  if (celula instanceof Date) return dataParaIso(celula);
  return String(celula ?? '').trim();
}

function montarLinha(cabecalho: string[], celulas: unknown[], numero: number): LinhaBruta[] {
  const preenchida = celulas.some((celula) => celulaParaTexto(celula) !== '');
  if (!preenchida) return [];
  const valores: Record<string, string> = {};
  cabecalho.forEach((chave, coluna) => {
    valores[chave] = celulaParaTexto(celulas[coluna]);
  });
  return [{ linha: numero, valores }];
}

/** Lê o .xlsx nas duas abas esperadas. Cabeçalhos normalizados para minúsculas. */
export function lerAbas(buffer: ArrayBuffer): AbasBrutas {
  const planilha = XLSX.read(buffer, { type: 'array', cellDates: true });
  return {
    fornecedores: lerAba(planilha, ABA_FORNECEDORES),
    contratos: lerAba(planilha, ABA_CONTRATOS)
  };
}

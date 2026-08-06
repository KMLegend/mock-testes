const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function ehEmailValido(valor: string): boolean {
  return FORMATO_EMAIL.test(valor.trim());
}

/**
 * Extrai os dígitos do CNPJ. Espelha `_normalizar_cnpj` em `app/api/v2/prestadores.py`: quando o
 * usuário digita o CNPJ direto na célula do Excel sem formatá-la como texto, o zero à esquerda
 * some (número não tem zero à esquerda) — só é seguro reconstruir quando falta exatamente 1
 * dígito (13 em vez de 14); um valor mais curto que isso é erro de digitação de verdade, não
 * zero perdido, e não deve ser mascarado.
 */
export function digitosCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  return digitos.length === 13 ? digitos.padStart(14, '0') : digitos;
}

interface PadraoDeData {
  readonly regex: RegExp;
  readonly paraIso: (grupos: RegExpExecArray) => string;
}

const PADROES_DATA: readonly PadraoDeData[] = [
  { regex: /^(\d{4})-(\d{2})-(\d{2})$/, paraIso: (m) => `${m[1]}-${m[2]}-${m[3]}` },        // ISO
  { regex: /^(\d{4})\/(\d{2})\/(\d{2})$/, paraIso: (m) => `${m[1]}-${m[2]}-${m[3]}` },      // ISO c/ barra
  { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, paraIso: (m) => `${m[3]}-${m[2]}-${m[1]}` },      // BR c/ barra
  { regex: /^(\d{2})-(\d{2})-(\d{4})$/, paraIso: (m) => `${m[3]}-${m[2]}-${m[1]}` },        // BR c/ traço
  { regex: /^(\d{2})\.(\d{2})\.(\d{4})$/, paraIso: (m) => `${m[3]}-${m[2]}-${m[1]}` },      // BR c/ ponto
];

/**
 * Aceita ISO e os formatos BR mais comuns (barra, traço, ponto) — espelha
 * `app/api/v2/prestadores.py::_normalizar_data` (A-37). Devolve sempre `AAAA-MM-DD`.
 * - Vazio → `null` (campo opcional, ex.: data_fim "sem prazo definido").
 * - Formato não reconhecido → `undefined` (quem chama decide como reportar o erro).
 */
export function normalizarData(valor: string): string | null | undefined {
  const texto = valor.trim();
  if (texto === '') return null;

  for (const padrao of PADROES_DATA) {
    const grupos = padrao.regex.exec(texto);
    if (!grupos) continue;
    const iso = padrao.paraIso(grupos);
    if (!Number.isNaN(Date.parse(iso))) return iso;
  }

  return undefined;
}

/** 'sim/true/1/ativo' → true; 'nao/não/false/0/inativo' → false; resto → null (inválido). */
export function textoParaBooleano(valor: string): boolean | null {
  const texto = valor.trim().toLowerCase();
  if (['sim', 'true', '1', 'ativo', 's'].includes(texto)) return true;
  if (['nao', 'não', 'false', '0', 'inativo', 'n'].includes(texto)) return false;
  return null;
}

/** Número aceitando vírgula decimal. String vazia → undefined; inválido → null. */
export function numeroOuNulo(valor: string): number | null | undefined {
  const texto = valor.trim().replace(',', '.');
  if (texto === '') return undefined;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}

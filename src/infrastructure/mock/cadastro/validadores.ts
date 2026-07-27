const FORMATO_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export function ehEmailValido(valor: string): boolean {
  return FORMATO_EMAIL.test(valor.trim());
}

export function digitosCnpj(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function ehDataIso(valor: string): boolean {
  if (!FORMATO_DATA.test(valor.trim())) return false;
  const tempo = Date.parse(valor.trim());
  return !Number.isNaN(tempo);
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

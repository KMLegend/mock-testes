import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_CONTRATOS } from './lerPlanilha';
import { numeroOuNulo } from './validadores';

const TOLERANCIA = 0.01;

function erro(linha: LinhaBruta, motivo: string): ErroDeImportacao {
  return { aba: ABA_CONTRATOS, linha: linha.linha, campo: 'proporcao_de_recesso', motivo };
}

function agrupar(linhas: readonly LinhaBruta[]): Map<string, LinhaBruta[]> {
  const grupos = new Map<string, LinhaBruta[]>();
  for (const linha of linhas) {
    const chave = linha.valores['cod_empresa'] ?? '';
    const atual = grupos.get(chave) ?? [];
    atual.push(linha);
    grupos.set(chave, atual);
  }
  return grupos;
}

function proporcao(linha: LinhaBruta): number | null | undefined {
  return numeroOuNulo(linha.valores['proporcao_de_recesso'] ?? '');
}

function errosDoGrupo(grupo: LinhaBruta[]): ErroDeImportacao[] {
  if (grupo.length <= 1) return []; // contrato único → 100% implícito (§2.4)
  const valores = grupo.map(proporcao);
  if (valores.some((valor) => valor === null)) return []; // inválido já é erro por linha
  const ausentes = grupo.filter((linha) => proporcao(linha) === undefined);
  if (ausentes.length > 0) {
    return ausentes.map((linha) => erro(linha, 'defina a proporção: PJ com mais de um contrato'));
  }
  const soma = valores.reduce((total: number, valor) => total + (valor as number), 0);
  if (Math.abs(soma - 100) <= TOLERANCIA) return [];
  const pct = soma.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return grupo.map((linha) => erro(linha, `as proporções deste PJ somam ${pct}%, devem somar 100%`));
}

/** Σ das proporções por PJ deve dar 100% (R-17); contrato único é implícito 100%. */
export function validarProporcoes(linhas: readonly LinhaBruta[]): ErroDeImportacao[] {
  return [...agrupar(linhas).values()].flatMap(errosDoGrupo);
}

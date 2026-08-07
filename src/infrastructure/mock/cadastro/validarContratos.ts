import { Contrato } from '../../../domain/entities/Contrato';
import { DataHora } from '../../../domain/value-objects/DataHora';
import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_CONTRATOS } from './lerPlanilha';
import { digitosCnpj, normalizarData, numeroOuNulo } from './validadores';

export interface ResultadoContratos {
  readonly validos: readonly Contrato[];
  readonly erros: readonly ErroDeImportacao[];
}

type Valores = Record<string, string>;

/** Sentinela de "sem prazo definido" (data_fim vazio) — `Contrato.dataFim` não é opcional no
 * domínio; uma data bem distante no futuro se comporta como indeterminado em `estaVigente()`. */
const SEM_PRAZO_DEFINIDO = '9999-12-31';

function texto(valores: Valores, chave: string): string {
  return valores[chave] ?? '';
}

function checagens(valores: Valores, cnpjParaCodEmpresa: ReadonlyMap<string, string>) {
  const cnpj = digitosCnpj(texto(valores, 'cnpj'));
  const dataInicio = normalizarData(texto(valores, 'data_inicio'));
  const dataFim = normalizarData(texto(valores, 'data_fim'));
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  return [
    { campo: 'cnpj', invalido: cnpj.length !== 14, motivo: 'deve ter 14 dígitos' },
    { campo: 'cnpj', invalido: cnpj.length === 14 && !cnpjParaCodEmpresa.has(cnpj), motivo: 'fornecedor não encontrado na aba Fornecedores' },
    { campo: 'data_inicio', invalido: dataInicio === undefined, motivo: 'formato de data não reconhecido' },
    { campo: 'data_inicio', invalido: dataInicio === null, motivo: 'obrigatório' },
    { campo: 'data_fim', invalido: dataFim === undefined, motivo: 'formato de data não reconhecido' },
    { campo: 'empresa_vinculada_codigo', invalido: texto(valores, 'empresa_vinculada_codigo') === '', motivo: 'obrigatório' },
    { campo: 'empresa_vinculada_nome', invalido: texto(valores, 'empresa_vinculada_nome') === '', motivo: 'obrigatório' },
    { campo: 'valor_mensal', invalido: valor === null, motivo: 'número inválido' }
  ];
}

function construir(valores: Valores, codEmpresa: string, codContrato: string): Contrato {
  const valor = numeroOuNulo(texto(valores, 'valor_mensal'));
  const dataInicio = normalizarData(texto(valores, 'data_inicio')) as string;
  const dataFim = normalizarData(texto(valores, 'data_fim')) ?? SEM_PRAZO_DEFINIDO;
  return new Contrato({
    codEmpresa,
    codContrato,
    nomeContrato: texto(valores, 'nome_contrato'),
    dataInicio: DataHora.de(dataInicio),
    dataFim: DataHora.de(dataFim),
    valorMensal: typeof valor === 'number' ? valor : 0,
    empresaResponsavel: texto(valores, 'empresa_vinculada_codigo'),
    nomeEmpresaResponsavel: texto(valores, 'empresa_vinculada_nome')
  });
}

/** codEmpresa → códigos de contrato já usados na base atual. */
function codsDaBaseAtual(contratosAtuais: readonly Contrato[]): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>();
  contratosAtuais.forEach((contrato) => {
    const usados = mapa.get(contrato.codEmpresa) ?? new Set<string>();
    usados.add(contrato.codContrato);
    mapa.set(contrato.codEmpresa, usados);
  });
  return mapa;
}

/**
 * Próximo código livre da empresa: maior número já usado (na planilha OU na base atual) + 1.
 * Nunca reaproveita um código que já existiu — `OcorrenciaDeRecesso` referencia o contrato por
 * `codEmpresa`/`codContrato`, então reutilizar faria o contrato novo herdar o saldo do antigo.
 * Códigos não-numéricos (ex.: 'CONTRATO-012-A') são preservados, mas não entram no cálculo.
 */
function proximoCodContrato(
  codEmpresa: string,
  usadosPorEmpresa: Map<string, Set<string>>,
  codsExistentes: Map<string, Set<string>>
): string {
  const usados = usadosPorEmpresa.get(codEmpresa) ?? new Set<string>();
  usadosPorEmpresa.set(codEmpresa, usados);

  let maior = 0;
  [...usados, ...(codsExistentes.get(codEmpresa) ?? [])].forEach((cod) => {
    if (/^\d+$/.test(cod)) maior = Math.max(maior, Number(cod));
  });

  const novo = String(maior + 1);
  usados.add(novo);
  return novo;
}

/**
 * Referencia o fornecedor por `cnpj` (A-37), não mais por `cod_empresa` — resolve para o
 * codEmpresa que `validarFornecedores` já decidiu (existente ou recém-gerado).
 *
 * `cod_contrato` é OPCIONAL: quando preenchido, é preservado exatamente como veio — ele é a
 * identidade ESTÁVEL do contrato entre importações (a carga é substituição total, A-32, e o
 * histórico de recesso referencia por codEmpresa/codContrato). Quando vazio, gera o próximo
 * número livre daquela empresa. Espelha `app/api/v2/prestadores.py::_validar_contratos`.
 */
export function validarContratos(
  linhas: readonly LinhaBruta[],
  cnpjParaCodEmpresa: ReadonlyMap<string, string>,
  contratosAtuais: readonly Contrato[] = []
): ResultadoContratos {
  const codsExistentes = codsDaBaseAtual(contratosAtuais);
  const usadosPorEmpresa = new Map<string, Set<string>>();
  const erros: ErroDeImportacao[] = [];
  const aprovadas: { valores: Valores; codEmpresa: string; codContrato: string }[] = [];

  linhas.forEach((linha) => {
    const invalidas = checagens(linha.valores, cnpjParaCodEmpresa).filter((item) => item.invalido);
    if (invalidas.length > 0) {
      erros.push(...invalidas.map((item) => ({
        aba: ABA_CONTRATOS, linha: linha.linha, campo: item.campo, motivo: item.motivo
      })));
      return;
    }

    const cnpj = digitosCnpj(texto(linha.valores, 'cnpj'));
    const codEmpresa = cnpjParaCodEmpresa.get(cnpj) as string;
    const codContrato = texto(linha.valores, 'cod_contrato').trim();

    if (codContrato !== '') {
      const usados = usadosPorEmpresa.get(codEmpresa) ?? new Set<string>();
      if (usados.has(codContrato)) {
        erros.push({
          aba: ABA_CONTRATOS, linha: linha.linha, campo: 'cod_contrato',
          motivo: 'cod_contrato duplicado para o mesmo CNPJ nesta planilha'
        });
        return;
      }
      usados.add(codContrato);
      usadosPorEmpresa.set(codEmpresa, usados);
    }

    aprovadas.push({ valores: linha.valores, codEmpresa, codContrato });
  });

  // Só gera os códigos vazios DEPOIS de conhecer todos os preenchidos — senão um código gerado
  // poderia colidir com um digitado numa linha mais abaixo da planilha.
  const validos = aprovadas.map((item) => construir(
    item.valores,
    item.codEmpresa,
    item.codContrato || proximoCodContrato(item.codEmpresa, usadosPorEmpresa, codsExistentes)
  ));

  return { validos, erros };
}

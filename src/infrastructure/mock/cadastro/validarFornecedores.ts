import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Cnpj } from '../../../domain/value-objects/Cnpj';
import { Email } from '../../../domain/value-objects/Email';
import { ErroDeImportacao } from '../../../application/ports/CargaDeCadastro';
import { LinhaBruta, ABA_FORNECEDORES } from './lerPlanilha';
import { digitosCnpj, ehEmailValido, textoParaBooleano } from './validadores';

export interface ResultadoFornecedores {
  readonly validos: readonly Fornecedor[];
  readonly erros: readonly ErroDeImportacao[];
  /** CNPJ (14 dígitos) → codEmpresa resolvido — usado por validarContratos para o vínculo (A-37). */
  readonly cnpjParaCodEmpresa: ReadonlyMap<string, string>;
}

type Valores = Record<string, string>;

function texto(valores: Valores, chave: string): string {
  return valores[chave] ?? '';
}

function checagens(valores: Valores, cnpjDuplicadoNaPlanilha: boolean) {
  return [
    { campo: 'razao_social', invalido: texto(valores, 'razao_social') === '', motivo: 'obrigatório' },
    { campo: 'email', invalido: !ehEmailValido(texto(valores, 'email')), motivo: 'e-mail inválido' },
    { campo: 'cnpj', invalido: digitosCnpj(texto(valores, 'cnpj')).length !== 14, motivo: 'deve ter 14 dígitos' },
    { campo: 'cnpj', invalido: cnpjDuplicadoNaPlanilha, motivo: 'CNPJ duplicado nesta planilha' },
    { campo: 'ativo', invalido: textoParaBooleano(texto(valores, 'ativo')) === null, motivo: 'use Sim ou Não' }
  ];
}

function construir(valores: Valores, codEmpresa: string, cnpj: string): Fornecedor {
  const razaoSocial = texto(valores, 'razao_social');
  const responsavel = texto(valores, 'responsavel_legal');
  return new Fornecedor({
    codEmpresa,
    empresa: razaoSocial,
    apelido: texto(valores, 'nome_fantasia') || razaoSocial,
    email: Email.de(texto(valores, 'email')),
    tipoInscricao: texto(valores, 'tipo_inscricao'),
    cnpj: Cnpj.de(cnpj),
    ativo: textoParaBooleano(texto(valores, 'ativo')) === true,
    ...(responsavel === '' ? {} : { responsavelLegal: responsavel })
  });
}

/** Maior codEmpresa numérico já usado na base atual — próximas empresas novas continuam a sequência. */
function maiorCodEmpresaNumerico(fornecedoresAtuais: readonly Fornecedor[]): number {
  return fornecedoresAtuais.reduce((maior, fornecedor) => {
    const numero = Number(fornecedor.codEmpresa);
    return Number.isInteger(numero) && numero > maior ? numero : maior;
  }, 0);
}

/**
 * `cod_empresa` não é mais coluna da planilha (A-37) — é resolvido pelo CNPJ: reaproveita o
 * codEmpresa já existente na base atual se o CNPJ já é conhecido, ou gera o próximo sequencial
 * para CNPJ novo. Espelha `app/api/v2/prestadores.py::_validar_fornecedores`.
 */
export function validarFornecedores(
  linhas: readonly LinhaBruta[],
  fornecedoresAtuais: readonly Fornecedor[] = []
): ResultadoFornecedores {
  const cnpjExistente = new Map(fornecedoresAtuais.map((f) => [f.cnpj.obterDigitos(), f.codEmpresa]));
  let proximoCodEmpresa = maiorCodEmpresaNumerico(fornecedoresAtuais);

  const validos: Fornecedor[] = [];
  const erros: ErroDeImportacao[] = [];
  const cnpjParaCodEmpresa = new Map<string, string>();

  linhas.forEach((linha) => {
    const cnpj = digitosCnpj(texto(linha.valores, 'cnpj'));
    const jaNestaPlanilha = cnpj.length === 14 && cnpjParaCodEmpresa.has(cnpj);
    const invalidas = checagens(linha.valores, jaNestaPlanilha).filter((item) => item.invalido);

    if (invalidas.length > 0) {
      erros.push(...invalidas.map((item) => ({
        aba: ABA_FORNECEDORES, linha: linha.linha, campo: item.campo, motivo: item.motivo
      })));
      return;
    }

    const codEmpresa = cnpjExistente.get(cnpj) ?? String(++proximoCodEmpresa);
    cnpjParaCodEmpresa.set(cnpj, codEmpresa);
    validos.push(construir(linha.valores, codEmpresa, cnpj));
  });

  return { validos, erros, cnpjParaCodEmpresa };
}

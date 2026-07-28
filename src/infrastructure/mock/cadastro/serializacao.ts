import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Contrato } from '../../../domain/entities/Contrato';
import { Cnpj } from '../../../domain/value-objects/Cnpj';
import { Email } from '../../../domain/value-objects/Email';
import { DataHora } from '../../../domain/value-objects/DataHora';

export interface FornecedorSerializado {
  codEmpresa: string;
  empresa: string;
  apelido: string;
  email: string;
  tipoInscricao: string;
  cnpj: string;
  ativo: boolean;
  responsavelLegal?: string;
}

export interface ContratoSerializado {
  codEmpresa: string;
  codContrato: string;
  nomeContrato: string;
  dataInicio: string;
  dataFim: string;
  valorMensal: number;
  empresaResponsavel: string;
  nomeEmpresaResponsavel: string;
  isDeletedAt?: string | null;
}

export function serializarFornecedor(fornecedor: Fornecedor): FornecedorSerializado {
  return {
    codEmpresa: fornecedor.codEmpresa,
    empresa: fornecedor.empresa,
    apelido: fornecedor.apelido,
    email: fornecedor.email.paraExibicao(),
    tipoInscricao: fornecedor.tipoInscricao,
    cnpj: fornecedor.cnpj.obterDigitos(),
    ativo: fornecedor.ativo,
    responsavelLegal: fornecedor.responsavelLegal
  };
}

export function reconstruirFornecedor(dado: FornecedorSerializado): Fornecedor {
  return new Fornecedor({
    codEmpresa: dado.codEmpresa,
    empresa: dado.empresa,
    apelido: dado.apelido,
    email: Email.de(dado.email),
    tipoInscricao: dado.tipoInscricao,
    cnpj: Cnpj.de(dado.cnpj),
    ativo: dado.ativo,
    ...(dado.responsavelLegal === undefined ? {} : { responsavelLegal: dado.responsavelLegal })
  });
}

export function serializarContrato(contrato: Contrato): ContratoSerializado {
  return {
    codEmpresa: contrato.codEmpresa,
    codContrato: contrato.codContrato,
    nomeContrato: contrato.nomeContrato,
    dataInicio: contrato.dataInicio.raw(),
    dataFim: contrato.dataFim.raw(),
    valorMensal: contrato.valorMensal,
    empresaResponsavel: contrato.empresaResponsavel,
    nomeEmpresaResponsavel: contrato.nomeEmpresaResponsavel,
    isDeletedAt: contrato.isDeletedAt
  };
}

export function reconstruirContrato(dado: ContratoSerializado): Contrato {
  return new Contrato({
    codEmpresa: dado.codEmpresa,
    codContrato: dado.codContrato,
    nomeContrato: dado.nomeContrato,
    dataInicio: DataHora.de(dado.dataInicio),
    dataFim: DataHora.de(dado.dataFim),
    valorMensal: dado.valorMensal,
    empresaResponsavel: dado.empresaResponsavel,
    nomeEmpresaResponsavel: dado.nomeEmpresaResponsavel,
    ...(dado.isDeletedAt === undefined || dado.isDeletedAt === null ? {} : { isDeletedAt: dado.isDeletedAt })
  });
}

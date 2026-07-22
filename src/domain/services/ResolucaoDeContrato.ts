import { Contrato } from '../entities/Contrato';
import { Fornecedor } from '../entities/Fornecedor';
import { Chamado } from '../entities/Chamado';
import { Cnpj } from '../value-objects/Cnpj';

export type ResultadoResolucaoContrato =
  | { readonly status: 'resolved'; readonly contrato: Contrato }
  | { readonly status: 'manual_treatment'; readonly reason: string };

export interface DadosResolucaoContrato {
  readonly fornecedor: Fornecedor | null;
  readonly contratos: readonly Contrato[];
  readonly chamado: Chamado;
  readonly cnpjTomadores: Map<string, string>;
  readonly cnpjExtraido?: Cnpj | null;
}

export class ResolucaoDeContrato {
  static resolver(dados: DadosResolucaoContrato): ResultadoResolucaoContrato {
    if (!dados.fornecedor) {
      return { status: 'manual_treatment', reason: 'Fornecedor não cadastrado no HCM' };
    }

    if (dados.contratos.length === 0) {
      return { status: 'manual_treatment', reason: 'Nenhum contrato ativo encontrado no HCM' };
    }

    if (dados.contratos.length === 1 && dados.contratos[0]) {
      return { status: 'resolved', contrato: dados.contratos[0] };
    }

    return ResolucaoDeContrato.resolverMultiplosContratos(dados);
  }

  private static resolverMultiplosContratos(
    dados: DadosResolucaoContrato
  ): ResultadoResolucaoContrato {
    const cnpjObj = dados.cnpjExtraido !== undefined ? dados.cnpjExtraido : dados.chamado.cnpjAnexo;
    const cnpjAnexo = cnpjObj?.obterDigitos();

    if (!cnpjAnexo) {
      return {
        status: 'manual_treatment',
        reason: 'Múltiplos contratos ativos e nenhum CNPJ extraído do anexo'
      };
    }

    const contratoMatch = dados.contratos.find((c) => {
      const cnpjTomador = dados.cnpjTomadores.get(c.empresaResponsavel);
      return cnpjTomador === cnpjAnexo;
    });

    if (contratoMatch) {
      return { status: 'resolved', contrato: contratoMatch };
    }

    const cods = dados.contratos.map((c) => c.codContrato).join(', ');
    return {
      status: 'manual_treatment',
      reason: `CNPJ extraído (${cnpjAnexo}) não corresponde a nenhum dos contratos do fornecedor (${cods})`
    };
  }
}

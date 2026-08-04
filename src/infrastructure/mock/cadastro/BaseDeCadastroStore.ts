import { Fornecedor } from '../../../domain/entities/Fornecedor';
import { Contrato } from '../../../domain/entities/Contrato';
import { mockFornecedoresData, mockContratosData } from '../dados/mockData';
import {
  FornecedorSerializado,
  ContratoSerializado,
  serializarFornecedor,
  serializarContrato,
  reconstruirFornecedor,
  reconstruirContrato
} from './serializacao';

import { RelatorioDeImportacao, ResumoAba } from '../../../application/ports/CargaDeCadastro';

const CHAVE_ARMAZENAMENTO = 'nf-pjs:cadastro:base:v2';
const CHAVE_ANTIGA_V1 = 'nf-pjs:cadastro:base:v1';

export interface BaseDeCadastro {
  readonly fornecedores: readonly Fornecedor[];
  readonly contratos: readonly Contrato[];
}

interface BaseSerializada {
  fornecedores: FornecedorSerializado[];
  contratos: ContratoSerializado[];
}

/**
 * Fonte da verdade do cadastro na Fase 1 (mock). Semeia dos mocks, persiste a carga do
 * usuário em localStorage (R-12) e é lida ao vivo pelos repositórios — assim a planilha
 * subida reflete nas grades de NF e Recesso sem recriar as dependências.
 */
export class BaseDeCadastroStore {
  private fornecedoresAtuais: readonly Fornecedor[];
  private contratosAtuais: readonly Contrato[];

  constructor() {
    const carregada = this.carregar();
    this.fornecedoresAtuais = carregada.fornecedores;
    this.contratosAtuais = carregada.contratos;
  }

  fornecedores(): Fornecedor[] {
    return [...this.fornecedoresAtuais];
  }

  contratos(): Contrato[] {
    return [...this.contratosAtuais];
  }

  /**
   * Substituição total (A-32): a planilha vira a base inteira. Fornecedores e contratos
   * ausentes na planilha nova deixam de existir — não há upsert acumulativo nem soft delete.
   * Seguro para o Recesso porque `OcorrenciaDeRecesso` referencia o contrato pela chave de
   * negócio (`codEmpresa`/`codContrato`), nunca pelo identificador surrogate.
   */
  substituir(novaBase: BaseDeCadastro): RelatorioDeImportacao {
    const resumoFornecedores = this.resumoDaSubstituicao(
      this.fornecedoresAtuais.map((f) => f.codEmpresa),
      novaBase.fornecedores.map((f) => f.codEmpresa)
    );
    const resumoContratos = this.resumoDaSubstituicao(
      this.contratosAtuais.map((c) => c.identificador()),
      novaBase.contratos.map((c) => c.identificador())
    );

    this.fornecedoresAtuais = [...novaBase.fornecedores];
    this.contratosAtuais = [...novaBase.contratos];
    this.persistir();

    return {
      fornecedores: resumoFornecedores,
      contratos: resumoContratos,
      ignorados: 0,
      erros: []
    };
  }

  private resumoDaSubstituicao(chavesAntigas: readonly string[], chavesNovas: readonly string[]): ResumoAba {
    const antigas = new Set(chavesAntigas);
    const novas = new Set(chavesNovas);
    const removidosDaBaseAnterior = [...antigas].filter((chave) => !novas.has(chave)).length;
    return { importados: chavesNovas.length, removidosDaBaseAnterior };
  }

  /** Volta aos dados de exemplo (útil na demo). */
  restaurarPadrao(): void {
    this.fornecedoresAtuais = [...mockFornecedoresData];
    this.contratosAtuais = [...mockContratosData];
    this.persistir();
  }

  private carregar(): BaseDeCadastro {
    const salva = this.lerDoArmazenamento();
    if (salva) return salva;
    return { fornecedores: [...mockFornecedoresData], contratos: [...mockContratosData] };
  }

  private lerDoArmazenamento(): BaseDeCadastro | null {
    if (typeof localStorage === 'undefined') return null;
    localStorage.removeItem(CHAVE_ANTIGA_V1);
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return null;
    try {
      const dados = JSON.parse(bruto) as BaseSerializada;
      return {
        fornecedores: dados.fornecedores.map(reconstruirFornecedor),
        contratos: dados.contratos.map(reconstruirContrato)
      };
    } catch {
      return null;
    }
  }

  private persistir(): void {
    if (typeof localStorage === 'undefined') return;
    const dados: BaseSerializada = {
      fornecedores: this.fornecedoresAtuais.map(serializarFornecedor),
      contratos: this.contratosAtuais.map(serializarContrato)
    };
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
  }
}

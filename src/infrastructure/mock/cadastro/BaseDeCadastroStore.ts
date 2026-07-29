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

  substituir(base: BaseDeCadastro): void {
    this.fundir(base);
  }

  /**
   * Executa o merge de cadastro conforme regras normativas:
   * 1. Fornecedores: Acumulativo (upsert de novos/existentes; NUNCA deleta ausentes).
   * 2. Contratos: Ciclo de vida + Soft Delete (upsert de novos/existentes; reativação dos deletados; soft delete dos ausentes).
   */
  fundir(novaBase: BaseDeCadastro): RelatorioDeImportacao {
    const resumoFornecedores = this.fundirFornecedores(novaBase.fornecedores);
    const resumoContratos = this.fundirContratos(novaBase.contratos);
    this.persistir();

    return {
      fornecedores: resumoFornecedores,
      contratos: resumoContratos,
      ignorados: 0,
      erros: []
    };
  }

  /** Fornecedores são acumulativos: upsert por codEmpresa, nunca remove quem sumiu da planilha. */
  private fundirFornecedores(novos: readonly Fornecedor[]): ResumoAba {
    let inseridos = 0;
    let atualizados = 0;
    const mapa = new Map<string, Fornecedor>(this.fornecedoresAtuais.map((f) => [f.codEmpresa, f]));

    novos.forEach((fornecedor) => {
      if (mapa.has(fornecedor.codEmpresa)) atualizados++;
      else inseridos++;
      mapa.set(fornecedor.codEmpresa, fornecedor);
    });

    this.fornecedoresAtuais = Array.from(mapa.values());
    return { inseridos, atualizados };
  }

  /**
   * Contratos têm ciclo de vida com soft delete: upsert de novos/existentes, reativação dos
   * que estavam deletados e voltaram à planilha, soft delete dos que sumiram.
   */
  private fundirContratos(novos: readonly Contrato[]): ResumoAba {
    const mapa = new Map<string, Contrato>(this.contratosAtuais.map((c) => [c.identificador(), c]));
    const chavesNovas = new Set(novos.map((c) => c.identificador()));

    const { inseridos, atualizados, reativados } = this.upsertContratos(novos, mapa);
    const desativados = this.softDeleteAusentes(chavesNovas, mapa);

    this.contratosAtuais = Array.from(mapa.values());
    return { inseridos, atualizados, reativados, desativados };
  }

  private upsertContratos(
    novos: readonly Contrato[],
    mapa: Map<string, Contrato>
  ): { inseridos: number; atualizados: number; reativados: number } {
    let inseridos = 0;
    let atualizados = 0;
    let reativados = 0;

    novos.forEach((contrato) => {
      const chave = contrato.identificador();
      const existente = mapa.get(chave);
      if (!existente) inseridos++;
      else if (existente.ehDeletado) reativados++; // novo objeto sem isDeletedAt = reativado
      else atualizados++;
      mapa.set(chave, contrato);
    });

    return { inseridos, atualizados, reativados };
  }

  /** Soft delete dos contratos ativos que não constam mais na planilha. */
  private softDeleteAusentes(chavesNovas: ReadonlySet<string>, mapa: Map<string, Contrato>): number {
    let desativados = 0;
    const agora = new Date().toISOString();

    this.contratosAtuais.forEach((contrato) => {
      const chave = contrato.identificador();
      if (contrato.ehDeletado || chavesNovas.has(chave)) return;
      desativados++;
      mapa.set(chave, this.comSoftDelete(contrato, agora));
    });

    return desativados;
  }

  private comSoftDelete(contrato: Contrato, agora: string): Contrato {
    return new Contrato({
      codEmpresa: contrato.codEmpresa,
      codContrato: contrato.codContrato,
      nomeContrato: contrato.nomeContrato,
      dataInicio: contrato.dataInicio,
      dataFim: contrato.dataFim,
      valorMensal: contrato.valorMensal,
      empresaResponsavel: contrato.empresaResponsavel,
      nomeEmpresaResponsavel: contrato.nomeEmpresaResponsavel,
      isDeletedAt: agora
    });
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

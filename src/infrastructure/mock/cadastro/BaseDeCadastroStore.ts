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

import { RelatorioDeImportacao } from '../../../application/ports/CargaDeCadastro';

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
    // 1. Processar Fornecedores (Acumulativo)
    let fornecedoresInseridos = 0;
    let fornecedoresAtualizados = 0;
    const mapaFornecedores = new Map<string, Fornecedor>(
      this.fornecedoresAtuais.map((f) => [f.codEmpresa, f])
    );

    novaBase.fornecedores.forEach((fornecedor) => {
      if (mapaFornecedores.has(fornecedor.codEmpresa)) {
        fornecedoresAtualizados++;
      } else {
        fornecedoresInseridos++;
      }
      mapaFornecedores.set(fornecedor.codEmpresa, fornecedor);
    });

    // 2. Processar Contratos (Soft Delete & Reativação)
    let contratosInseridos = 0;
    let contratosAtualizados = 0;
    let contratosReativados = 0;
    let contratosDesativados = 0;

    const mapaContratos = new Map<string, Contrato>(
      this.contratosAtuais.map((c) => [c.identificador(), c])
    );
    const chavesNovosContratos = new Set<string>(
      novaBase.contratos.map((c) => c.identificador())
    );

    novaBase.contratos.forEach((contrato) => {
      const chave = contrato.identificador();
      const existente = mapaContratos.get(chave);

      if (!existente) {
        contratosInseridos++;
        mapaContratos.set(chave, contrato);
      } else if (existente.ehDeletado) {
        contratosReativados++;
        mapaContratos.set(chave, contrato); // novo objeto sem isDeletedAt = reativado
      } else {
        contratosAtualizados++;
        mapaContratos.set(chave, contrato);
      }
    });

    // Soft delete para contratos ativos que NÃO constam na planilha nova
    const agora = new Date().toISOString();
    this.contratosAtuais.forEach((contrato) => {
      const chave = contrato.identificador();
      if (!contrato.ehDeletado && !chavesNovosContratos.has(chave)) {
        contratosDesativados++;
        const deletado = new Contrato({
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
        mapaContratos.set(chave, deletado);
      }
    });

    this.fornecedoresAtuais = Array.from(mapaFornecedores.values());
    this.contratosAtuais = Array.from(mapaContratos.values());
    this.persistir();

    return {
      fornecedores: { inseridos: fornecedoresInseridos, atualizados: fornecedoresAtualizados },
      contratos: {
        inseridos: contratosInseridos,
        atualizados: contratosAtualizados,
        reativados: contratosReativados,
        desativados: contratosDesativados
      },
      ignorados: 0,
      erros: []
    };
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

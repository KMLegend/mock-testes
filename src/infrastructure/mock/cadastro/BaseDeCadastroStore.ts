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

const CHAVE_ARMAZENAMENTO = 'nf-pjs:cadastro:base:v1';

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
    this.fornecedoresAtuais = [...base.fornecedores];
    this.contratosAtuais = [...base.contratos];
    this.persistir();
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

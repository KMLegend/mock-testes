import { ExtratoDeRecesso } from '../../domain/collections/ExtratoDeRecesso';
import { Contrato } from '../../domain/entities/Contrato';
import { EncerramentoDeContrato } from '../../domain/services/EncerramentoDeContrato';
import { AutorDoLancamento } from '../../domain/value-objects/AutorDoLancamento';
import { ContratoRepository } from '../ports/ContratoRepository';
import { OcorrenciaDeRecessoRepository } from '../ports/OcorrenciaDeRecessoRepository';
import { UsuarioAtual } from '../ports/UsuarioAtual';

export class EncerramentoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'EncerramentoInvalido';
  }
}

export interface DadosDoEncerramento {
  readonly contratoId: string;
  readonly dataDaRescisao: string; // yyyy-mm-dd
}

export interface DependenciasEncerrar {
  readonly ocorrenciaRepo: OcorrenciaDeRecessoRepository;
  readonly contratoRepo: ContratoRepository;
  readonly usuarioAtual: UsuarioAtual;
  readonly agora?: () => Date;
}

/**
 * Encerra o contrato: aplica a regra dos 15 dias no mês quebrado e zera o saldo.
 * Operação irreversível na Fase 1 — a UI confirma antes de chamar.
 */
export class EncerrarContrato {
  constructor(private readonly deps: DependenciasEncerrar) {}

  async executar(dados: DadosDoEncerramento): Promise<void> {
    const contrato = await this.localizarContrato(dados.contratoId);
    const extrato = new ExtratoDeRecesso(
      await this.deps.ocorrenciaRepo.doContrato(dados.contratoId)
    );

    if (extrato.dataDoEncerramento() !== null) {
      throw new EncerramentoInvalido('Este contrato já está encerrado.');
    }

    const dataDaRescisao = this.interpretarData(dados.dataDaRescisao, contrato);
    const usuario = await this.deps.usuarioAtual.identificar();
    const servico = new EncerramentoDeContrato(AutorDoLancamento.usuario(usuario.login));

    await this.deps.ocorrenciaRepo.salvarVarias(
      servico.gerarPara(contrato, extrato, dataDaRescisao)
    );
  }

  private async localizarContrato(contratoId: string): Promise<Contrato> {
    const contratos = await this.deps.contratoRepo.todos();
    const contrato = contratos.find((candidato) => candidato.identificador() === contratoId);
    if (!contrato) throw new EncerramentoInvalido('Contrato não encontrado.');
    return contrato;
  }

  private interpretarData(valor: string, contrato: Contrato): Date {
    const partes = String(valor ?? '').split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) {
      throw new EncerramentoInvalido('Informe a data da rescisão.');
    }
    const data = new Date(partes[0]!, partes[1]! - 1, partes[2]!);
    if (data.getTime() < contrato.dataInicio.paraDataLocal().getTime()) {
      throw new EncerramentoInvalido('A rescisão não pode ser anterior ao início do contrato.');
    }
    const hoje = (this.deps.agora ?? (() => new Date()))();
    if (data.getTime() > hoje.getTime()) {
      throw new EncerramentoInvalido('A rescisão não pode ter data futura.');
    }
    return data;
  }
}

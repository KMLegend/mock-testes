import { Contrato } from '../../domain/entities/Contrato';
import { OcorrenciaDeRecesso } from '../../domain/entities/OcorrenciaDeRecesso';
import { AutorDoLancamento } from '../../domain/value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../../domain/value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../../domain/value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../../domain/value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../../domain/value-objects/TipoOcorrencia';
import { ContratoRepository } from '../ports/ContratoRepository';
import { OcorrenciaDeRecessoRepository } from '../ports/OcorrenciaDeRecessoRepository';
import { UsuarioAtual } from '../ports/UsuarioAtual';

export class LancamentoInvalido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'LancamentoInvalido';
  }
}

export interface DadosDoLancamento {
  readonly contratoId: string;
  readonly dataDaOcorrencia: string; // yyyy-mm-dd (input date)
  readonly descricao: string;
  readonly tipo: string;
  readonly quantidade: string;
}

export interface DependenciasLancar {
  readonly ocorrenciaRepo: OcorrenciaDeRecessoRepository;
  readonly contratoRepo: ContratoRepository;
  readonly usuarioAtual: UsuarioAtual;
  readonly agora?: () => Date;
}

/** Lançamento manual de ocorrência. Valida as regras de docs/modulo-recesso/02 §4. */
export class LancarOcorrenciaDeRecesso {
  constructor(private readonly deps: DependenciasLancar) {}

  async executar(dados: DadosDoLancamento): Promise<void> {
    const descricao = String(dados.descricao ?? '').trim();
    if (descricao.length === 0) throw new LancamentoInvalido('Informe a descrição da ocorrência.');

    const contrato = await this.localizarContrato(dados.contratoId);
    const data = this.interpretarData(dados.dataDaOcorrencia);
    const quantidade = QuantidadeDeDias.de(dados.quantidade);
    const tipo = TipoOcorrencia.de(dados.tipo);

    this.garantirContratoVigente(contrato);

    const usuario = await this.deps.usuarioAtual.identificar();
    await this.deps.ocorrenciaRepo.salvar(
      new OcorrenciaDeRecesso({
        id: `man-${this.relogio()().getTime()}`,
        codContrato: contrato.identificador(),
        dataDoCalculo: data,
        // Mês CALENDÁRIO da data lançada — o usuário NÃO digita competência (02 §4.5).
        // NÃO usar contendo()/dia-base do contrato aqui: aquilo ancora no aniversário mensal
        // do contrato (correto pro crédito AUTOMÁTICO), mas pra lançamento manual empurrava a
        // competência pro mês ANTERIOR sempre que o dia lançado vinha antes do dia-base
        // (ex.: mês corrente 08/2026, dia-base 31 → contendo() devolvia 31/07/2026).
        competencia: CompetenciaDeRecesso.apartirDe(data),
        descricao,
        tipo,
        quantidade,
        autor: AutorDoLancamento.usuario(usuario.login),
        origem: OrigemDaOcorrencia.manual(),
        criadoEm: this.relogio()()
      })
    );
  }

  private async localizarContrato(contratoId: string): Promise<Contrato> {
    const contratos = await this.deps.contratoRepo.todos();
    const contrato = contratos.find((candidato) => candidato.identificador() === contratoId);
    if (!contrato) throw new LancamentoInvalido('Contrato não encontrado.');
    return contrato;
  }

  private garantirContratoVigente(contrato: Contrato): void {
    if (contrato.estaVigente(this.relogio()())) return;
    throw new LancamentoInvalido(
      'Contrato fora da vigência: não é possível lançar novas ocorrências.'
    );
  }

  /** R-10 (default): data futura bloqueada. */
  private interpretarData(valor: string): Date {
    const partes = String(valor ?? '').split('-').map(Number);
    if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) {
      throw new LancamentoInvalido('Informe uma data válida.');
    }
    const data = new Date(partes[0]!, partes[1]! - 1, partes[2]!);
    if (data.getTime() > this.relogio()().getTime()) {
      throw new LancamentoInvalido('Não é permitido lançar ocorrência com data futura.');
    }
    return data;
  }

  private relogio(): () => Date {
    return this.deps.agora ?? (() => new Date());
  }
}

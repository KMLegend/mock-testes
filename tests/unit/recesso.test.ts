import { describe, it, expect } from 'vitest';
import { DataHora } from '../../src/domain/value-objects/DataHora';
import { Contrato } from '../../src/domain/entities/Contrato';
import { ExtratoDeRecesso } from '../../src/domain/collections/ExtratoDeRecesso';
import { MotorDeCreditoMensal } from '../../src/domain/services/MotorDeCreditoMensal';
import { EncerramentoDeContrato } from '../../src/domain/services/EncerramentoDeContrato';
import { CompetenciaDeRecesso } from '../../src/domain/value-objects/CompetenciaDeRecesso';
import { ProporcaoDeRecesso } from '../../src/domain/value-objects/ProporcaoDeRecesso';
import { QuantidadeDeDias } from '../../src/domain/value-objects/QuantidadeDeDias';
import { SaldoDeDias } from '../../src/domain/value-objects/SaldoDeDias';
import { TipoOcorrencia } from '../../src/domain/value-objects/TipoOcorrencia';
import { AutorDoLancamento } from '../../src/domain/value-objects/AutorDoLancamento';

const HOJE = new Date(2026, 6, 17); // 17/07/2026
const agora = (): Date => HOJE;
const AUTOR = AutorDoLancamento.usuario('kevin.maykel@cityinc.com.br');

function contrato(inicio: string, fim: string, proporcao?: number): Contrato {
  return new Contrato({
    codEmpresa: '013',
    codContrato: 'C-013',
    nomeContrato: 'Contrato de teste',
    dataInicio: DataHora.de(inicio),
    dataFim: DataHora.de(fim),
    valorMensal: 1000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY',
    ...(proporcao === undefined ? {} : { proporcaoDeRecesso: ProporcaoDeRecesso.de(proporcao) })
  });
}

describe('QuantidadeDeDias', () => {
  it('aceita fração e rejeita zero/negativo na entrada de usuário', () => {
    expect(() => QuantidadeDeDias.de(0)).toThrow();
    expect(() => QuantidadeDeDias.de(-5)).toThrow();
    expect(QuantidadeDeDias.de(2.5).obterValor()).toBe(2.5);
    expect(QuantidadeDeDias.de('1,5').obterValor()).toBe(1.5);
    expect(QuantidadeDeDias.de(2.5).paraExibicao()).toBe('2,5');
  });

  it('nenhuma() é o único caminho para zero', () => {
    expect(QuantidadeDeDias.nenhuma().obterValor()).toBe(0);
    expect(QuantidadeDeDias.nenhuma().ehZero()).toBe(true);
  });
});

describe('ProporcaoDeRecesso', () => {
  it('reparte o direito sem duplicar nem perder', () => {
    expect(ProporcaoDeRecesso.de(40).aplicarA(2.5)).toBe(1);
    expect(ProporcaoDeRecesso.de(60).aplicarA(2.5)).toBe(1.5);
    expect(ProporcaoDeRecesso.integral().aplicarA(2.5)).toBe(2.5);
  });

  it('rejeita percentual fora de 0–100', () => {
    expect(() => ProporcaoDeRecesso.de(0)).toThrow();
    expect(() => ProporcaoDeRecesso.de(101)).toThrow();
  });
});

describe('CompetenciaDeRecesso', () => {
  it('não perde o dia base em meses curtos', () => {
    const janeiro = CompetenciaDeRecesso.apartirDe(new Date(2025, 0, 31));
    const fevereiro = janeiro.proxima();
    const marco = fevereiro.proxima();

    expect(fevereiro.data().getDate()).toBe(28); // fev/2025 não tem 31
    expect(marco.data().getDate()).toBe(31); // e o dia base volta
  });

  it('contendo() ancora no dia base do contrato', () => {
    const inicio = new Date(2023, 2, 15); // 15/03/2023
    expect(CompetenciaDeRecesso.contendo(new Date(2026, 6, 20), inicio).paraExibicao())
      .toBe('15/07/2026');
    expect(CompetenciaDeRecesso.contendo(new Date(2026, 6, 10), inicio).paraExibicao())
      .toBe('15/06/2026');
  });
});

describe('MotorDeCreditoMensal', () => {
  const motor = new MotorDeCreditoMensal(agora);

  it('credita 2,5 dias por mês completo — 15/03/2023 até hoje = 40 meses = 100 dias', () => {
    const gerados = motor.gerarPara(contrato('2023-03-15', '2026-12-31'), ExtratoDeRecesso.vazio());
    expect(gerados.length).toBe(40);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(100);
  });

  it('a primeira competência nasce um mês DEPOIS do início', () => {
    const gerados = motor.gerarPara(contrato('2023-03-15', '2026-12-31'), ExtratoDeRecesso.vazio());
    expect(gerados[0]!.competencia.paraExibicao()).toBe('15/04/2023');
  });

  it('contrato com 1 ANO exato rende 30 dias (12 competências)', () => {
    const umAno = new MotorDeCreditoMensal(() => new Date(2026, 6, 22));
    const gerados = umAno.gerarPara(contrato('2025-07-22', '2028-07-21'), ExtratoDeRecesso.vazio());

    expect(gerados.length).toBe(12);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(30);
  });

  it('contrato com 4 MESES rende 10 dias', () => {
    const quatroMeses = new MotorDeCreditoMensal(() => new Date(2026, 6, 22));
    const gerados = quatroMeses.gerarPara(
      contrato('2026-03-22', '2028-03-21'),
      ExtratoDeRecesso.vazio()
    );

    expect(gerados.length).toBe(4);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(10);
  });

  it('contrato com menos de um mês não gera crédito', () => {
    const gerados = motor.gerarPara(contrato('2026-07-01', '2027-12-31'), ExtratoDeRecesso.vazio());
    expect(gerados.length).toBe(0);
  });

  it('PJ em dois contratos: 40% + 60% somam o mesmo que um contrato integral', () => {
    const quarenta = motor.gerarPara(contrato('2023-03-15', '2026-12-31', 40), ExtratoDeRecesso.vazio());
    const sessenta = motor.gerarPara(contrato('2023-03-15', '2026-12-31', 60), ExtratoDeRecesso.vazio());

    const saldoA = new ExtratoDeRecesso(quarenta).saldoAtual().obterValor();
    const saldoB = new ExtratoDeRecesso(sessenta).saldoAtual().obterValor();

    expect(saldoA).toBe(40);
    expect(saldoB).toBe(60);
    expect(saldoA + saldoB).toBe(100);
  });

  it('é IDEMPOTENTE: reprocessar não gera crédito novo', () => {
    const contratoDeTeste = contrato('2023-03-15', '2026-12-31');
    const extrato = new ExtratoDeRecesso(
      motor.gerarPara(contratoDeTeste, ExtratoDeRecesso.vazio())
    );

    expect(motor.gerarPara(contratoDeTeste, extrato).length).toBe(0);
    expect(extrato.acrescentar(motor.gerarPara(contratoDeTeste, extrato)).saldoAtual().obterValor())
      .toBe(100);
  });

  it('para de creditar no encerramento do contrato', () => {
    const encerrado = new Date(2024, 0, 31);
    const gerados = motor.gerarPara(
      contrato('2023-03-15', '2026-12-31'),
      ExtratoDeRecesso.vazio(),
      encerrado
    );
    expect(gerados.length).toBe(10); // 15/04/2023 .. 15/01/2024
  });
});

describe('SaldoDeDias', () => {
  it('não acumula erro de ponto flutuante ao longo de dezenas de meses', () => {
    const motor = new MotorDeCreditoMensal(agora);
    const gerados = motor.gerarPara(contrato('2023-03-15', '2026-12-31', 33), ExtratoDeRecesso.vazio());
    const saldo = new ExtratoDeRecesso(gerados).saldoAtual();

    // 2,5 × 33% = 0,825 → arredondado a 0,83/mês; 40 meses = 33,2 exatos
    expect(saldo.obterValor()).toBe(33.2);
    expect(String(saldo.obterValor())).not.toContain('0000');
  });

  it('R-05: bloqueia débito que deixaria o saldo negativo', () => {
    const saldo = SaldoDeDias.de(2.5);
    expect(saldo.suporta(TipoOcorrencia.debito(), QuantidadeDeDias.de(2.5))).toBe(true);
    expect(saldo.suporta(TipoOcorrencia.debito(), QuantidadeDeDias.de(3))).toBe(false);
  });
});

describe('EncerramentoDeContrato', () => {
  const motor = new MotorDeCreditoMensal(agora);
  const servico = new EncerramentoDeContrato(AUTOR);
  const contratoDeTeste = contrato('2023-03-15', '2026-12-31');
  const extrato = new ExtratoDeRecesso(motor.gerarPara(contratoDeTeste, ExtratoDeRecesso.vazio()));

  it('o último cálculo é o MAX da coluna', () => {
    expect(extrato.dataDoUltimoCalculo()?.toLocaleDateString('pt-BR')).toBe('15/07/2026');
  });

  it('15 dias ou mais desde o último cálculo geram +2,5', () => {
    const [rescisao] = servico.gerarPara(contratoDeTeste, extrato, new Date(2026, 7, 5));
    expect(rescisao!.quantidade.obterValor()).toBe(2.5);
    expect(rescisao!.descricao).toContain('+2,5 crédito');
  });

  it('menos de 15 dias não geram direito', () => {
    const [rescisao] = servico.gerarPara(contratoDeTeste, extrato, new Date(2026, 6, 25));
    expect(rescisao!.quantidade.obterValor()).toBe(0);
    expect(rescisao!.descricao).toContain('+0 crédito');
  });

  it('o encerramento zera o saldo e marca o contrato', () => {
    const lancamentos = servico.gerarPara(contratoDeTeste, extrato, new Date(2026, 6, 25));
    const final = extrato.acrescentar(lancamentos);

    expect(final.saldoAtual().obterValor()).toBe(0);
    expect(final.dataDoEncerramento()?.toLocaleDateString('pt-BR')).toBe('25/07/2026');
  });

  it('a proporção também vale na rescisão', () => {
    const parcial = contrato('2023-03-15', '2026-12-31', 40);
    const extratoParcial = new ExtratoDeRecesso(motor.gerarPara(parcial, ExtratoDeRecesso.vazio()));
    const [rescisao] = servico.gerarPara(parcial, extratoParcial, new Date(2026, 7, 5));

    expect(rescisao!.quantidade.obterValor()).toBe(1);
  });
});

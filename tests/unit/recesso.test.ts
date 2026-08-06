import { describe, it, expect } from 'vitest';
import { DataHora } from '../../src/domain/value-objects/DataHora';
import { Contrato } from '../../src/domain/entities/Contrato';
import { Fornecedor } from '../../src/domain/entities/Fornecedor';
import { ExtratoDeRecesso } from '../../src/domain/collections/ExtratoDeRecesso';
import { MotorDeCreditoMensal } from '../../src/domain/services/MotorDeCreditoMensal';
import { CompetenciaDeRecesso } from '../../src/domain/value-objects/CompetenciaDeRecesso';
import { QuantidadeDeDias } from '../../src/domain/value-objects/QuantidadeDeDias';
import { SaldoDeDias } from '../../src/domain/value-objects/SaldoDeDias';
import { TipoOcorrencia } from '../../src/domain/value-objects/TipoOcorrencia';
import { LinhaDeRecesso } from '../../src/application/read-models/LinhaDeRecesso';
import { BaseDeCadastroStore } from '../../src/infrastructure/mock/cadastro/BaseDeCadastroStore';
import { OcorrenciaDeRecessoRepositoryEmMemoria } from '../../src/infrastructure/mock/OcorrenciaDeRecessoRepositoryEmMemoria';
import { LancarOcorrenciaDeRecesso } from '../../src/application/use-cases/LancarOcorrenciaDeRecesso';
import { ContratoRepository } from '../../src/application/ports/ContratoRepository';
import { UsuarioAtual } from '../../src/application/ports/UsuarioAtual';

const HOJE = new Date(2026, 6, 17); // 17/07/2026
const agora = (): Date => HOJE;

function contrato(inicio: string, fim: string): Contrato {
  return new Contrato({
    codEmpresa: '013',
    codContrato: 'C-013',
    nomeContrato: 'Contrato de teste',
    dataInicio: DataHora.de(inicio),
    dataFim: DataHora.de(fim),
    valorMensal: 1000,
    empresaResponsavel: '001',
    nomeEmpresaResponsavel: 'CITY'
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
});

describe('Contrato — status por vigência', () => {
  it('ativo quando hoje está dentro de [início, fim]', () => {
    const ativo = contrato('2024-01-01', '2027-12-31');
    expect(ativo.estaVigente(new Date(2026, 6, 27))).toBe(true);
    expect(ativo.statusParaExibicao(new Date(2026, 6, 27))).toBe('Ativo');
  });

  it('inativo quando a vigência já terminou', () => {
    const encerrado = contrato('2024-01-01', '2024-10-31');
    expect(encerrado.estaVigente(new Date(2026, 6, 27))).toBe(false);
    expect(encerrado.statusParaExibicao(new Date(2026, 6, 27))).toBe('Inativo');
  });

  it('inativo quando ainda não começou', () => {
    const futuro = contrato('2030-01-01', '2032-12-31');
    expect(futuro.estaVigente(new Date(2026, 6, 27))).toBe(false);
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

  it('credita 2,5 dias por mês a partir de 2025 — contrato iniciado em 15/03/2023 inicia créditos em 15/03/2025', () => {
    const gerados = motor.gerarPara(contrato('2023-03-15', '2026-12-31'), ExtratoDeRecesso.vazio());
    // 15/03/2025 até 17/07/2026 = 17 competências = 42.5 dias
    expect(gerados.length).toBe(17);
    expect(gerados[0]!.competencia.paraExibicao()).toBe('15/03/2025');
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(42.5);
  });

  it('contrato com 1 ANO exato rende 30 dias (12 competências)', () => {
    const umAno = new MotorDeCreditoMensal(() => new Date(2026, 6, 22));
    const gerados = umAno.gerarPara(contrato('2025-07-22', '2028-07-21'), ExtratoDeRecesso.vazio());

    expect(gerados.length).toBe(12);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(30);
  });

  it('contrato com menos de um mês não gera crédito', () => {
    const gerados = motor.gerarPara(contrato('2026-07-01', '2027-12-31'), ExtratoDeRecesso.vazio());
    expect(gerados.length).toBe(0);
  });

  it('para de creditar no fim da vigência e gera rescisão + débito de encerramento para zerar o saldo', () => {
    // 29/02/2024 → 31/10/2025: créditos a partir de 2025 (8 mensalidades = 20 dias) + 1 rescisão (+2,5) + 1 encerramento (débito 22,5) = 10 ocorrências, saldo final 0
    const gerados = motor.gerarPara(contrato('2024-02-29', '2025-10-31'), ExtratoDeRecesso.vazio());
    expect(gerados.length).toBe(10);
    expect(gerados[8]!.descricao).toContain('Rescisão contratual (+2,5 crédito)');
    expect(gerados[9]!.descricao).toContain('Encerramento de contrato (zera o saldo atual)');
    expect(gerados[9]!.tipo.ehDebito()).toBe(true);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(0);
  });

  it('calcula rescisão com +2,5 crédito e zera o saldo no encerramento da vigência', () => {
    // 01/01/2025 → 18/02/2025: 1 mensalidade (01/02: 2,5) + rescisão (18/02: 2,5) = saldo 5 -> zeramento (débito 5) = saldo final 0
    const motorPassado = new MotorDeCreditoMensal(() => new Date(2026, 6, 27));
    const gerados = motorPassado.gerarPara(contrato('2025-01-01', '2025-02-18'), ExtratoDeRecesso.vazio());
    const rescisao = gerados.find((g) => g.id.startsWith('auto-rescisao-'));
    const zeramento = gerados.find((g) => g.id.startsWith('auto-zeramento-'));

    expect(rescisao).toBeDefined();
    expect(rescisao!.descricao).toContain('Rescisão contratual (+2,5 crédito)');
    expect(rescisao!.quantidade.obterValor()).toBe(2.5);

    expect(zeramento).toBeDefined();
    expect(zeramento!.quantidade.obterValor()).toBe(5);
    expect(new ExtratoDeRecesso(gerados).saldoAtual().obterValor()).toBe(0);
  });

  it('é IDEMPOTENTE: reprocessar não gera crédito novo', () => {
    const contratoDeTeste = contrato('2023-03-15', '2026-12-31');
    const extrato = new ExtratoDeRecesso(
      motor.gerarPara(contratoDeTeste, ExtratoDeRecesso.vazio())
    );

    expect(motor.gerarPara(contratoDeTeste, extrato).length).toBe(0);
    expect(extrato.acrescentar(motor.gerarPara(contratoDeTeste, extrato)).saldoAtual().obterValor())
      .toBe(42.5);
  });
});

describe('MotorDeCreditoMensal — finalização antecipada (botão "Finalizar contrato")', () => {
  const motor = new MotorDeCreditoMensal(agora);

  it('gera rescisão + zeramento antes do fim da vigência, usando a dataFim REAL do contrato — não a data do clique', () => {
    // vigência só termina em 2027, mas a finalização é acionada hoje (17/07/2026): o cálculo
    // (data do lançamento, dias proporcionais) tem que dar o MESMO resultado que sairia
    // automaticamente em 31/12/2027, não o que sairia se calculado "hoje".
    const c = contrato('2023-03-15', '2027-12-31');
    const jaCreditado = new ExtratoDeRecesso(motor.gerarPara(c, ExtratoDeRecesso.vazio()));

    const gerados = motor.gerarEncerramentoAntecipado(c, jaCreditado);
    const rescisao = gerados.find((g) => g.id === `auto-rescisao-${c.identificador()}`);
    const zeramento = gerados.find((g) => g.id === `auto-zeramento-${c.identificador()}`);

    expect(rescisao).toBeDefined();
    expect(rescisao!.dataDoCalculo.getTime()).toBe(c.dataFim.paraDataLocal().getTime());
    expect(rescisao!.dataDoCalculo.getTime()).not.toBe(HOJE.getTime());
    expect(zeramento).toBeDefined();
    expect(zeramento!.tipo.ehDebito()).toBe(true);
    expect(jaCreditado.acrescentar(gerados).saldoAtual().obterValor()).toBe(0);
  });

  it('é idempotente: reprocessar não duplica a rescisão/zeramento já lançados', () => {
    const c = contrato('2023-03-15', '2027-12-31');
    const extrato = new ExtratoDeRecesso(motor.gerarPara(c, ExtratoDeRecesso.vazio()));
    const primeiraVez = new ExtratoDeRecesso(extrato.paraArray().concat(motor.gerarEncerramentoAntecipado(c, extrato)));

    expect(motor.gerarEncerramentoAntecipado(c, primeiraVez).length).toBe(0);
  });
});

const fornecedor = new Fornecedor({
  codEmpresa: '013',
  empresa: 'Empresa Teste',
  apelido: 'Teste',
  email: { paraExibicao: () => 'a@a.com' } as any,
  tipoInscricao: 'PJ',
  cnpj: { obterDigitos: () => '12345678000190' } as any,
  ativo: true
});

describe('OcorrenciaDeRecessoRepositoryEmMemoria.finalizarContratoAntecipadamente', () => {
  it('encurta a vigência do contrato para hoje — deixa de aparecer como Ativo', async () => {
    localStorage.clear();
    const store = new BaseDeCadastroStore();
    const c = contrato('2023-03-15', '2027-12-31'); // vigência bem no futuro
    store.substituir({ fornecedores: [], contratos: [c] });

    const repo = new OcorrenciaDeRecessoRepositoryEmMemoria(store);
    await repo.finalizarContratoAntecipadamente(c.identificador());

    const atualizado = store.contratos().find((x) => x.identificador() === c.identificador())!;
    expect(atualizado.estaVigente(new Date())).toBe(false);
    expect(atualizado.temPrazoDeterminado).toBe(true);
  });
});

describe('LancarOcorrenciaDeRecesso — competência do lançamento manual', () => {
  it('usa o mês CALENDÁRIO da data lançada, não o dia-base do contrato (regressão)', async () => {
    // Contrato com dia-base 31 (dataInicio dia 31): antes da correção, contendo() empurrava
    // qualquer lançamento antes do dia 31 pro mês anterior — ex.: lançar em 05/08/2026 virava
    // competência 31/07/2026, mesmo com "mês atual" sendo 08/2026.
    const c = contrato('2023-01-31', '2027-12-31');
    const contratoRepo: ContratoRepository = { todos: async () => [c] };
    const usuarioAtual: UsuarioAtual = { identificar: async () => ({ login: 'kevin', nome: 'Kevin' }) };
    const salvos: { competencia: string }[] = [];
    const ocorrenciaRepo = {
      salvar: async (oc: { competencia: { paraExibicao(): string } }) => {
        salvos.push({ competencia: oc.competencia.paraExibicao() });
      }
    } as any;

    const lancar = new LancarOcorrenciaDeRecesso({
      ocorrenciaRepo, contratoRepo, usuarioAtual, agora: () => new Date(2026, 7, 5)
    });

    await lancar.executar({
      contratoId: c.identificador(),
      dataDaOcorrencia: '2026-08-05',
      descricao: 'Recesso gozado',
      tipo: 'Debito',
      quantidade: '2,5'
    });

    expect(salvos).toHaveLength(1);
    expect(salvos[0]!.competencia).toBe('05/08/2026'); // mês de agosto, não julho
  });
});

describe('LinhaDeRecesso.podeFinalizarAntecipadamente', () => {
  it('libera o botão a partir de 30 dias antes do fim da vigência', () => {
    const c = contrato('2023-03-15', '2026-08-10'); // 24 dias após HOJE (17/07/2026)
    const linha = new LinhaDeRecesso({ contrato: c, fornecedor, extrato: ExtratoDeRecesso.vazio(), hoje: HOJE });
    expect(linha.podeFinalizarAntecipadamente()).toBe(true);
  });

  it('não libera quando faltam mais de 30 dias para o fim', () => {
    const c = contrato('2023-03-15', '2026-12-31');
    const linha = new LinhaDeRecesso({ contrato: c, fornecedor, extrato: ExtratoDeRecesso.vazio(), hoje: HOJE });
    expect(linha.podeFinalizarAntecipadamente()).toBe(false);
  });

  it('não libera quando já existe rescisão lançada (evita duplicar o encerramento)', () => {
    const c = contrato('2023-03-15', '2026-08-10');
    const motorLocal = new MotorDeCreditoMensal(agora);
    const jaEncerrado = new ExtratoDeRecesso(motorLocal.gerarEncerramentoAntecipado(c, ExtratoDeRecesso.vazio()));
    const linha = new LinhaDeRecesso({ contrato: c, fornecedor, extrato: jaEncerrado, hoje: HOJE });
    expect(linha.podeFinalizarAntecipadamente()).toBe(false);
  });

  it('não libera para contrato sem prazo definido (9999-12-31)', () => {
    const c = contrato('2023-03-15', '9999-12-31');
    const linha = new LinhaDeRecesso({ contrato: c, fornecedor, extrato: ExtratoDeRecesso.vazio(), hoje: HOJE });
    expect(linha.podeFinalizarAntecipadamente()).toBe(false);
  });
});

describe('SaldoDeDias', () => {
  it('não acumula erro de ponto flutuante somando frações', () => {
    let saldo = SaldoDeDias.zero();
    for (let volta = 0; volta < 40; volta += 1) {
      saldo = saldo.aplicar(TipoOcorrencia.credito(), QuantidadeDeDias.de(2.5));
    }
    expect(saldo.obterValor()).toBe(100);
    expect(String(saldo.obterValor())).not.toContain('0000');
  });

  it('suporta() indica se o débito deixaria o saldo negativo (informativo, saldo pode negativar)', () => {
    const saldo = SaldoDeDias.de(2.5);
    expect(saldo.suporta(TipoOcorrencia.debito(), QuantidadeDeDias.de(2.5))).toBe(true);
    expect(saldo.suporta(TipoOcorrencia.debito(), QuantidadeDeDias.de(3))).toBe(false);
  });
});

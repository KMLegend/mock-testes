import { describe, it, expect } from 'vitest';
import { Cnpj } from '../../src/domain/value-objects/Cnpj';
import { Email } from '../../src/domain/value-objects/Email';
import { Competencia } from '../../src/domain/value-objects/Competencia';
import { TipoLancamento } from '../../src/domain/value-objects/TipoLancamento';
import { RegraAlerta } from '../../src/domain/value-objects/RegraAlerta';
import { StatusNf } from '../../src/domain/value-objects/StatusNf';
import { DataHora } from '../../src/domain/value-objects/DataHora';

describe('Value Objects', () => {
  describe('Cnpj', () => {
    it('deve extrair dígitos e formatar exibição com máscara', () => {
      const cnpj = Cnpj.de('33.333.333/0001-33');
      expect(cnpj.obterDigitos()).toBe('33333333000133');
      expect(cnpj.paraExibicao()).toBe('33.333.333/0001-33');
    });

    it('deve comparar busca por dígitos e com máscara com resultado idêntico', () => {
      const cnpj = Cnpj.de('33.333.333/0001-33');
      expect(cnpj.contem('33333333000133')).toBe(true);
      expect(cnpj.contem('33.333.333/0001-33')).toBe(true);
      expect(cnpj.contem('333333')).toBe(true);
    });
  });

  describe('Email', () => {
    it('deve normalizar trim e lowercase no construtor', () => {
      const email = Email.de('  Kevin.Maykel@CityInc.com.br  ');
      expect(email.paraExibicao()).toBe('kevin.maykel@cityinc.com.br');
      expect(email.equals(Email.de('kevin.maykel@cityinc.com.br'))).toBe(true);
    });
  });

  describe('Competencia', () => {
    it('deve formatar para exibição MM/AAAA e armazenamento MM-AAAA', () => {
      const comp = Competencia.de('7', '2026');
      expect(comp.paraExibicao()).toBe('07/2026');
      expect(comp.paraArmazenamento()).toBe('07-2026');
    });

    it('deve realizar parse de diferentes formatos de texto livre', () => {
      expect(Competencia.deTextoLivre('07/2026').paraArmazenamento()).toBe('07-2026');
      expect(Competencia.deTextoLivre('07-2026').paraArmazenamento()).toBe('07-2026');
      expect(Competencia.deTextoLivre('2026-07').paraArmazenamento()).toBe('07-2026');
      expect(Competencia.deTextoLivre('Julho/2026').paraArmazenamento()).toBe('07-2026');
    });

    it('deve usar fallback da data de criação se texto livre for inválido', () => {
      const comp = Competencia.deTextoLivre('Inválido', '2026-07-20 09:15:00-03:00');
      expect(comp.paraArmazenamento()).toBe('07-2026');
    });
  });

  describe('TipoLancamento', () => {
    it('deve normalizar variações de Reembolso plano de saúde', () => {
      const tipo = TipoLancamento.de('reembolso plano de saude');
      expect(tipo.paraExibicao()).toBe('Reembolso plano de saúde');
    });
  });

  describe('RegraAlerta', () => {
    it('deve identificar corretamente cobrança vs preventivo', () => {
      expect(RegraAlerta.de('D+1').ehCobranca()).toBe(true);
      expect(RegraAlerta.de('D+3').ehCobranca()).toBe(true);
      expect(RegraAlerta.de('D-3').ehPreventivo()).toBe(true);
      expect(RegraAlerta.de('D').ehPreventivo()).toBe(true);
    });
  });

  describe('StatusNf', () => {
    it('deve criar os status corretos', () => {
      expect(StatusNf.pendente().paraExibicao()).toBe('Pendente');
      expect(StatusNf.enviado().paraExibicao()).toBe('Enviado');
      expect(StatusNf.recebido().paraExibicao()).toBe('Recebido');
      expect(StatusNf.tratamentoManual().paraExibicao()).toBe('Tratamento Manual');
    });
  });

  describe('DataHora', () => {
    it('deve formatar data curta e completa', () => {
      const dh = DataHora.de('2026-07-20 09:15:00-03:00');
      expect(dh.paraFormatadoCurto()).toBe('20/07/2026');
      expect(dh.paraFormatadoCompleto()).toBe('20/07/2026 09:15');
    });
  });
});

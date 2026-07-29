import { Contrato } from '../entities/Contrato';
import { OcorrenciaDeRecesso } from '../entities/OcorrenciaDeRecesso';
import { AutorDoLancamento } from '../value-objects/AutorDoLancamento';
import { CompetenciaDeRecesso } from '../value-objects/CompetenciaDeRecesso';
import { OrigemDaOcorrencia } from '../value-objects/OrigemDaOcorrencia';
import { QuantidadeDeDias } from '../value-objects/QuantidadeDeDias';
import { TipoOcorrencia } from '../value-objects/TipoOcorrencia';

/** Constrói as ocorrências AUTOMÁTICAS do motor. Só monta o objeto — decisão é do chamador. */
export class FabricaDeOcorrenciasAutomaticas {
  credito(contrato: Contrato, competencia: CompetenciaDeRecesso, valor: number): OcorrenciaDeRecesso {
    return new OcorrenciaDeRecesso({
      id: `auto-${contrato.identificador()}-${competencia.identificador()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: competencia.data(),
      competencia,
      descricao: 'Crédito mensal de recesso',
      tipo: TipoOcorrencia.credito(),
      quantidade: QuantidadeDeDias.de(valor),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: competencia.data()
    });
  }

  rescisao(contrato: Contrato, params: { dias: number; ganhaCredito: boolean; valorCredito: number }): OcorrenciaDeRecesso {
    const { dias, ganhaCredito, valorCredito } = params;
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    return new OcorrenciaDeRecesso({
      id: `auto-rescisao-${contrato.identificador()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: fimDaVigencia,
      competencia: CompetenciaDeRecesso.contendo(fimDaVigencia, contrato.dataInicio.paraDataLocal()),
      descricao: `Rescisão contratual (+${ganhaCredito ? '2,5' : '0'} crédito) — ${dias} dia(s)`,
      tipo: TipoOcorrencia.credito(),
      quantidade: ganhaCredito ? QuantidadeDeDias.de(valorCredito) : QuantidadeDeDias.nenhuma(),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: fimDaVigencia
    });
  }

  zeramento(contrato: Contrato, saldo: number): OcorrenciaDeRecesso {
    const fimDaVigencia = contrato.dataFim.paraDataLocal();
    return new OcorrenciaDeRecesso({
      id: `auto-zeramento-${contrato.identificador()}`,
      codContrato: contrato.identificador(),
      dataDoCalculo: fimDaVigencia,
      competencia: CompetenciaDeRecesso.contendo(fimDaVigencia, contrato.dataInicio.paraDataLocal()),
      descricao: 'Encerramento de contrato (zera o saldo atual)',
      tipo: TipoOcorrencia.debito(),
      quantidade: QuantidadeDeDias.de(saldo),
      autor: AutorDoLancamento.sistema(),
      origem: OrigemDaOcorrencia.automatico(),
      criadoEm: new Date(fimDaVigencia.getTime() + 1000)
    });
  }
}

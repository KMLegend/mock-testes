import * as XLSX from 'xlsx';
import { ExportadorDePlanilha } from '../../application/ports/ExportadorDePlanilha';
import { LinhasDeStatus, PropsLinhaDeStatus } from '../../domain/collections/LinhasDeStatus';
import { Alertas } from '../../domain/collections/Alertas';
import { Competencia } from '../../domain/value-objects/Competencia';
import { Alerta } from '../../domain/entities/Alerta';

export class ExportadorXlsx implements ExportadorDePlanilha {
  async exportar(linhasGrid: LinhasDeStatus, alertas: Alertas, competencia: Competencia): Promise<void> {
    const itensGrid = linhasGrid.paraArray();
    const itensAlertas = alertas.paraArray();

    const dataSheetRows = ExportadorXlsx.gerarLinhasDados(itensGrid);
    const contractSheetRows = ExportadorXlsx.gerarLinhasContratos(itensGrid);
    const alertsSheetRows = ExportadorXlsx.gerarLinhasAlertas(itensAlertas);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataSheetRows), 'Status Notas Fiscais');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(contractSheetRows), 'Contratos');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(alertsSheetRows), 'Mensagens Enviadas');

    const fileName = `status_notas_${competencia.obterMes()}_${competencia.obterAno()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  private static gerarLinhasDados(itens: readonly PropsLinhaDeStatus[]) {
    return itens.map((row) => ({
      'Razão Social': row.nome,
      'Nome Fantasia': row.apelido,
      'Responsável Legal': row.funcionario,
      'CNPJ': row.cnpj.paraExibicao(),
      'E-mail': row.email.paraExibicao(),
      'Status': row.status.paraExibicao(),
      'Nº Chamado': row.protocolo === '-' ? '' : Number(row.protocolo) || row.protocolo,
      'Abertura': row.dataAbertura.paraFormatadoCurto(),
      'Finalização': row.dataFinalizacao ? row.dataFinalizacao.paraFormatadoCurto() : '-',
      'Tipo de Lançamento': row.tipoLancamento.paraExibicao(),
      'Link': row.linkChamado || ''
    }));
  }

  private static gerarLinhasContratos(itens: readonly PropsLinhaDeStatus[]) {
    return itens
      .filter((row) => row.tipoLancamento.ehContratualOuAmbas())
      .map((row) => ({
        'Nome Fornecedor': row.nome,
        'CNPJ': row.cnpj.paraExibicao(),
        'Código do Contrato': row.contratoCodigo,
        'Nome do Contrato': row.contratoNome,
        'Empresa Responsável (Tomador)': row.empresaResponsavel,
        'Status': row.status.paraExibicao(),
        'Nº Chamado': row.protocolo
      }));
  }

  private static gerarLinhasAlertas(itens: readonly Alerta[]) {
    return itens.map((al) => ({
      'Responsável Legal': al.responsavelLegal,
      'E-mail': al.email.paraExibicao(),
      'CNPJ': al.cnpj.paraExibicao(),
      'Regra': al.regra.paraExibicao(),
      'Data/Hora de Envio': al.dataHoraEnvio.paraFormatadoCompleto(),
      'Ano/Mês': al.mesAnoReferencia.paraExibicao()
    }));
  }
}

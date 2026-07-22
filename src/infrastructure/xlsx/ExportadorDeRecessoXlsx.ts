import * as XLSX from 'xlsx';
import { ExportadorDeRecesso } from '../../application/ports/ExportadorDeRecesso';
import { LinhaDeRecesso } from '../../application/read-models/LinhaDeRecesso';

export class ExportadorDeRecessoXlsx implements ExportadorDeRecesso {
  async exportar(linhas: readonly LinhaDeRecesso[]): Promise<void> {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(ExportadorDeRecessoXlsx.gerarContratos(linhas)),
      'Recesso por Contrato'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(ExportadorDeRecessoXlsx.gerarExtratos(linhas)),
      'Extratos'
    );

    const hoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `recesso_${hoje}.xlsx`);
  }

  private static gerarContratos(linhas: readonly LinhaDeRecesso[]) {
    return linhas.map((linha) => ({
      'Razão Social': linha.fornecedor.empresa,
      'Nome Fantasia': linha.fornecedor.apelido,
      'Responsável Legal': linha.fornecedor.responsavelLegal,
      'CNPJ': linha.fornecedor.cnpj.paraExibicao(),
      'Nº do Contrato': linha.contrato.codContrato,
      'Empresa Vinculada': linha.contrato.nomeEmpresaResponsavel,
      'Proporção': linha.contrato.proporcaoDeRecesso.paraExibicao(),
      'Início': linha.contrato.dataInicio.paraFormatadoCurto(),
      'Fim': linha.contrato.dataFim.paraFormatadoCurto(),
      'Dia/Mês Base': linha.contrato.diaEMesBase(),
      'Saldo Atual (dias)': linha.saldoAtual().obterValor(),
      'Status': linha.statusParaExibicao()
    }));
  }

  private static gerarExtratos(linhas: readonly LinhaDeRecesso[]) {
    return linhas.flatMap((linha) =>
      linha.extrato.comSaldoCorrente().map(({ ocorrencia, saldo }) => ({
        'Nº do Contrato': linha.contrato.codContrato,
        'Razão Social': linha.fornecedor.empresa,
        'ID da Ocorrência': ocorrencia.id,
        'Cálculo': ocorrencia.dataDoCalculoFormatada(),
        'Competência': ocorrencia.competencia.paraExibicao(),
        'Descrição': ocorrencia.descricao,
        'Tipo': ocorrencia.tipo.paraExibicao(),
        'Qtd (dias)': ocorrencia.quantidade.obterValor(),
        'Saldo (dias)': saldo.obterValor(),
        'Quem Lançou': ocorrencia.autor.paraExibicao()
      }))
    );
  }
}

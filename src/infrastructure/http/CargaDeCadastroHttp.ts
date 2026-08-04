import {
  CargaDeCadastro,
  RelatorioDeImportacao
} from '../../application/ports/CargaDeCadastro';
import { lerAbas } from '../mock/cadastro/lerPlanilha';
import { validar } from '../mock/cadastro/validarPlanilha';
import { ApiClient } from './ApiClient';

export class CargaDeCadastroHttp implements CargaDeCadastro {
  async previsualizar(arquivo: File): Promise<RelatorioDeImportacao> {
    // Validação local no client-side para pré-visualização rápida e UX excelente
    const { base, erros } = validar(lerAbas(await arquivo.arrayBuffer()));
    
    // Simula as contagens baseada nas regras locais para exibição prévia
    return {
      fornecedores: { importados: base.fornecedores.length, removidosDaBaseAnterior: 0 },
      contratos: { importados: base.contratos.length, removidosDaBaseAnterior: 0 },
      ignorados: 0,
      erros
    };
  }

  async aplicar(arquivo: File): Promise<RelatorioDeImportacao> {
    const res = await ApiClient.postMultipart<any>('/v2/prestadores/importacao', arquivo);
    return {
      fornecedores: res.fornecedores,
      contratos: res.contratos,
      ignorados: res.ignorados || 0,
      erros: res.erros || []
    };
  }

  async baixarModelo(): Promise<void> {
    await this.baixarArquivo('/v2/prestadores/template', 'modelo_base_prestadores.xlsx');
  }

  async exportarBaseAtual(): Promise<void> {
    await this.baixarArquivo('/v2/prestadores/exportacao', 'base_prestadores_atual.xlsx');
  }

  /**
   * `window.open`/navegação direta não conseguem anexar o header Authorization — a rota exige
   * JWT (verify_integration_token só lê o header, nunca `?token=` na URL). Por isso o download
   * passa por fetch autenticado e um link temporário, nunca por navegação direta com o token na URL.
   */
  private async baixarArquivo(caminho: string, nomePadrao: string): Promise<void> {
    const { blob, filename } = await ApiClient.getBlob(caminho);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || nomePadrao;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}

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
      fornecedores: { inseridos: base.fornecedores.length, atualizados: 0 },
      contratos: { inseridos: base.contratos.length, atualizados: 0, reativados: 0, desativados: 0 },
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

  baixarModelo(): void {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = import.meta.env.VITE_API_TOKEN || '';
    const url = `${baseUrl}/v2/prestadores/template${token ? '?token=' + encodeURIComponent(token) : ''}`;
    window.open(url, '_blank');
  }

  exportarBaseAtual(): void {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = import.meta.env.VITE_API_TOKEN || '';
    const url = `${baseUrl}/v2/prestadores/exportacao${token ? '?token=' + encodeURIComponent(token) : ''}`;
    window.open(url, '_blank');
  }
}

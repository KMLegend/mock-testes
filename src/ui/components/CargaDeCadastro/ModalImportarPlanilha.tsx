import React, { useEffect } from 'react';
import styles from './ModalImportarPlanilha.module.css';
import { RelatorioDaCarga } from './RelatorioDaCarga';
import { ConfirmacaoDaCarga } from './ConfirmacaoDaCarga';
import { ControleDaCarga } from '../../hooks/useCargaDeCadastro';

export interface ModalImportarPlanilhaProps {
  readonly aberto: boolean;
  readonly controle: ControleDaCarga;
  readonly onFechar: () => void;
}

interface ColunaExemplo {
  readonly nome: string;
  readonly obrigatorio: boolean;
  readonly aceita: string;
  readonly exemplo: string;
}

const COLUNAS_FORNECEDORES: readonly ColunaExemplo[] = [
  { nome: 'razao_social', obrigatorio: true, aceita: 'Texto livre', exemplo: 'KEVIN MAYKEL AGOSTINHO GOMES LTDA' },
  { nome: 'nome_fantasia', obrigatorio: false, aceita: 'Texto livre', exemplo: 'KEVIN MAYKEL' },
  { nome: 'responsavel_legal', obrigatorio: false, aceita: 'Texto livre — pessoa responsável legal do PJ (não a razão social)', exemplo: 'Kevin Maykel Agostinho Gomes' },
  { nome: 'email', obrigatorio: true, aceita: 'E-mail — chave de casamento com o Tomticket', exemplo: 'kevin.maykel@cityinc.com.br' },
  { nome: 'cnpj', obrigatorio: true, aceita: '14 dígitos, com ou sem máscara', exemplo: '12.345.678/9012-34' },
  { nome: 'tipo_inscricao', obrigatorio: false, aceita: 'Código do HCM (ex.: "1")', exemplo: '1' },
  { nome: 'ativo', obrigatorio: false, aceita: '"Sim" ou "Não"', exemplo: 'Sim' },
];

const COLUNAS_CONTRATOS: readonly ColunaExemplo[] = [
  { nome: 'cnpj', obrigatorio: true, aceita: 'Mesmo CNPJ da aba Fornecedores', exemplo: '12.345.678/9012-34' },
  { nome: 'cod_contrato', obrigatorio: false, aceita: 'Deixe VAZIO em contrato novo — o sistema gera o próximo número. Preenchido, é preservado (identidade do contrato no histórico de recesso)', exemplo: '2' },
  { nome: 'nome_contrato', obrigatorio: false, aceita: 'Texto livre', exemplo: 'CONTRATO KEVIN - ADMIN' },
  { nome: 'data_inicio', obrigatorio: true, aceita: 'AAAA-MM-DD, DD/MM/AAAA ou célula formatada como data', exemplo: '15/03/2023' },
  { nome: 'data_fim', obrigatorio: false, aceita: 'Mesmos formatos de data_inicio (vazio = sem prazo definido)', exemplo: '31/12/2026' },
  { nome: 'valor_mensal', obrigatorio: false, aceita: 'Número', exemplo: '5000' },
  { nome: 'empresa_vinculada_codigo', obrigatorio: true, aceita: 'Código da empresa tomadora', exemplo: '001' },
  { nome: 'empresa_vinculada_nome', obrigatorio: true, aceita: 'Nome da empresa tomadora', exemplo: 'CITY INCORPORADORA LTDA' },
];

const TabelaDeColunas: React.FC<{ titulo: string; colunas: readonly ColunaExemplo[] }> = ({ titulo, colunas }) => (
  <div className={styles.bloco}>
    <h3 className={styles.tituloAba}>Aba &ldquo;{titulo}&rdquo;</h3>
    <div className={styles.responsivo}>
      <table className={styles.tabela}>
        <thead>
          <tr>
            <th>Coluna</th>
            <th>Aceita</th>
            <th>Exemplo</th>
          </tr>
        </thead>
        <tbody>
          {colunas.map((coluna) => (
            <tr key={coluna.nome}>
              <td className={styles.mono}>
                {coluna.nome}
                {coluna.obrigatorio && <span className={styles.obrigatorio} title="Obrigatório"> *</span>}
              </td>
              <td>{coluna.aceita}</td>
              <td className={styles.mono}>{coluna.exemplo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const OCUPADO: readonly string[] = ['analisando', 'aplicando'];

/**
 * Fluxo completo de importação num único modal (docs/frontend/21): abre com o exemplo de
 * preenchimento, o upload dispara o dry-run (previsualizar) ali mesmo, e a confirmação da
 * carga acontece sem sair do modal.
 */
export const ModalImportarPlanilha: React.FC<ModalImportarPlanilhaProps> = ({ aberto, controle, onFechar }) => {
  const ocupado = OCUPADO.includes(controle.estado);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent): void => {
      if (evento.key === 'Escape') fechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  if (!aberto) return null;

  const fechar = (): void => {
    controle.limpar();
    onFechar();
  };

  const aoEscolher = (evento: React.ChangeEvent<HTMLInputElement>): void => {
    controle.selecionar(evento.target.files?.[0] ?? null);
    evento.target.value = ''; // permite reenviar o mesmo arquivo
  };

  return (
    <div
      className={styles.modalOverlay}
      id="importar-planilha-modal"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) fechar();
      }}
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2>Importar planilha</h2>
          <div className={styles.headerAcoes}>
            <label className={styles.botaoSelecionar} id="btn-enviar-planilha">
              {ocupado ? 'Processando...' : 'Selecionar arquivo (.xlsx)'}
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={aoEscolher}
                disabled={ocupado}
              />
            </label>
            <button className={styles.btnClose} aria-label="Fechar" onClick={fechar}>&times;</button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {controle.nomeArquivo !== '' && <p className={styles.arquivo}>Arquivo: {controle.nomeArquivo}</p>}

          {controle.erroGeral !== '' && (
            <p className={styles.erroGeral} role="alert">{controle.erroGeral}</p>
          )}

          {controle.relatorio && (
            <RelatorioDaCarga relatorio={controle.relatorio} aplicado={controle.estado === 'aplicado'} />
          )}

          {controle.relatorio && controle.estado !== 'aplicado' && (
            <ConfirmacaoDaCarga controle={controle} />
          )}

          {controle.estado === 'aplicado' && (
            <button type="button" className={styles.botaoSelecionar} onClick={fechar} id="btn-fechar-apos-aplicar">
              Fechar
            </button>
          )}

          <p className={styles.aviso}>
            <strong>cod_empresa não é uma coluna</strong> — o sistema gera esse código sozinho a
            partir do CNPJ (é só um identificador interno). A aba <strong>Contratos</strong> vincula
            ao fornecedor pelo <strong>mesmo CNPJ</strong> usado na aba Fornecedores, não por código.
          </p>

          <TabelaDeColunas titulo="Fornecedores" colunas={COLUNAS_FORNECEDORES} />
          <TabelaDeColunas titulo="Contratos" colunas={COLUNAS_CONTRATOS} />

          <p className={styles.legenda}><span className={styles.obrigatorio}>*</span> campo obrigatório</p>
        </div>
      </div>
    </div>
  );
};

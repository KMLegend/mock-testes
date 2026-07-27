import React from 'react';
import styles from './components/CargaDeCadastro/CargaDeCadastro.module.css';
import { RelatorioDaCarga } from './components/CargaDeCadastro/RelatorioDaCarga';
import { ConfirmacaoDaCarga } from './components/CargaDeCadastro/ConfirmacaoDaCarga';
import { TabelaBaseDePjs } from './components/CargaDeCadastro/TabelaBaseDePjs';
import { ControleDaCarga } from './hooks/useCargaDeCadastro';
import { useBaseDePjs } from './hooks/useBaseDePjs';

export interface ModuloCadastroProps {
  readonly controle: ControleDaCarga;
}

const OCUPADO: readonly string[] = ['analisando', 'aplicando'];

export const ModuloCadastro: React.FC<ModuloCadastroProps> = ({ controle }) => {
  const ocupado = OCUPADO.includes(controle.estado);
  const controleBaseDePjs = useBaseDePjs(controle.estado);

  const aoEscolher = (evento: React.ChangeEvent<HTMLInputElement>): void => {
    controle.selecionar(evento.target.files?.[0] ?? null);
    evento.target.value = ''; // permite reenviar o mesmo arquivo
  };

  return (
    <section className={styles.secao} id="tab-cadastro">
      <p className={styles.intro}>
        Enquanto a integração com o HCM não existe, a <strong>base de PJs é carregada por planilha</strong>.
        Baixe o modelo, preencha as abas <strong>Fornecedores</strong> e <strong>Contratos</strong>, e
        envie. A validação é a mesma do restante do sistema — nada é gravado se houver erro.
      </p>

      <div className={styles.acoes}>
        <button type="button" className={styles.botao} onClick={controle.baixarModelo} id="btn-baixar-modelo">
          Baixar planilha-modelo
        </button>
        <button
          type="button"
          className={styles.botao}
          onClick={controle.exportarBaseAtual}
          id="btn-exportar-base"
        >
          Exportar base atual
        </button>
        <label className={`${styles.botao} ${styles.enviar}`} id="btn-enviar-planilha">
          {ocupado ? 'Processando...' : 'Enviar planilha'}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={aoEscolher}
            disabled={ocupado}
          />
        </label>
        {controle.nomeArquivo !== '' && <span className={styles.arquivo}>{controle.nomeArquivo}</span>}
      </div>

      {controle.erroGeral !== '' && (
        <p className={styles.erroGeral} role="alert">{controle.erroGeral}</p>
      )}

      {controle.relatorio && (
        <RelatorioDaCarga relatorio={controle.relatorio} aplicado={controle.estado === 'aplicado'} />
      )}

      {controle.relatorio && controle.estado !== 'aplicado' && (
        <ConfirmacaoDaCarga controle={controle} />
      )}

      <TabelaBaseDePjs controle={controleBaseDePjs} />
    </section>
  );
};

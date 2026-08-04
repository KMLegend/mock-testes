import React, { useState } from 'react';
import styles from './components/CargaDeCadastro/CargaDeCadastro.module.css';
import { TabelaBaseDePjs } from './components/CargaDeCadastro/TabelaBaseDePjs';
import { ModalImportarPlanilha } from './components/CargaDeCadastro/ModalImportarPlanilha';
import { ControleDaCarga } from './hooks/useCargaDeCadastro';
import { useBaseDePjs } from './hooks/useBaseDePjs';

export interface ModuloCadastroProps {
  readonly controle: ControleDaCarga;
}

export const ModuloCadastro: React.FC<ModuloCadastroProps> = ({ controle }) => {
  const controleBaseDePjs = useBaseDePjs(controle.estado);
  const [importarAberto, setImportarAberto] = useState(false);

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
        <button
          type="button"
          className={`${styles.botao} ${styles.botaoPrimario}`}
          onClick={() => setImportarAberto(true)}
          id="btn-abrir-importar-planilha"
        >
          Importar planilha
        </button>
      </div>

      <TabelaBaseDePjs controle={controleBaseDePjs} />

      <ModalImportarPlanilha
        aberto={importarAberto}
        controle={controle}
        onFechar={() => setImportarAberto(false)}
      />
    </section>
  );
};

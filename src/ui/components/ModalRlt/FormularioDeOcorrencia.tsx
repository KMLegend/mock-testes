import React, { useState } from 'react';
import styles from './ModalRlt.module.css';

export interface DadosDoFormulario {
  readonly dataDaOcorrencia: string;
  readonly descricao: string;
  readonly tipo: string;
  readonly quantidade: string;
}

export interface FormularioDeOcorrenciaProps {
  readonly desabilitado: boolean;
  readonly motivo: string;
  readonly onLancar: (dados: DadosDoFormulario) => Promise<void>;
}

const HOJE = new Date().toISOString().slice(0, 10);

const VAZIO: DadosDoFormulario = {
  dataDaOcorrencia: HOJE,
  descricao: '',
  tipo: 'Credito',
  quantidade: '1'
};

/**
 * "Quem lançou" e "Competência" NÃO são campos: vêm do usuário atual e da data (02 §4).
 * Em caso de erro, o formulário é PRESERVADO (04 §5.2).
 */
export const FormularioDeOcorrencia: React.FC<FormularioDeOcorrenciaProps> = ({
  desabilitado,
  motivo,
  onLancar
}) => {
  const [dados, setDados] = useState<DadosDoFormulario>(VAZIO);
  const [erro, setErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  const alterar = (campo: keyof DadosDoFormulario, valor: string): void => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  };

  const submeter = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await onLancar(dados);
      setDados({ ...VAZIO, dataDaOcorrencia: dados.dataDaOcorrencia });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível lançar a ocorrência.');
    } finally {
      setSalvando(false);
    }
  };

  if (desabilitado) {
    return (
      <p className={styles.avisoInativo}>
        {motivo}: novos lançamentos estão bloqueados. O histórico permanece visível.
      </p>
    );
  }

  return (
    <form className={styles.formulario} onSubmit={submeter}>
      <div className={styles.campo}>
        <label htmlFor="ocorrencia-data">Data da Ocorrência</label>
        <input
          id="ocorrencia-data"
          type="date"
          max={HOJE}
          value={dados.dataDaOcorrencia}
          onChange={(e) => alterar('dataDaOcorrencia', e.target.value)}
          required
        />
      </div>
      <div className={`${styles.campo} ${styles.campoLargo}`}>
        <label htmlFor="ocorrencia-descricao">Descrição</label>
        <input
          id="ocorrencia-descricao"
          type="text"
          placeholder="Ex.: Recesso gozado"
          value={dados.descricao}
          onChange={(e) => alterar('descricao', e.target.value)}
          required
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="ocorrencia-tipo">Tipo</label>
        <select
          id="ocorrencia-tipo"
          value={dados.tipo}
          onChange={(e) => alterar('tipo', e.target.value)}
        >
          <option value="Credito">Crédito</option>
          <option value="Debito">Débito</option>
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="ocorrencia-qtd">Qtd (dias)</label>
        <input
          id="ocorrencia-qtd"
          type="number"
          min={0.5}
          step={0.5}
          value={dados.quantidade}
          onChange={(e) => alterar('quantidade', e.target.value)}
          required
        />
      </div>
      <button type="submit" className={styles.botaoLancar} disabled={salvando}>
        {salvando ? 'Lançando...' : 'Lançar Ocorrência'}
      </button>
      {erro !== '' && <p className={styles.erro} role="alert">{erro}</p>}
    </form>
  );
};

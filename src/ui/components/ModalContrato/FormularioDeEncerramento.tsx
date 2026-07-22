import React, { useState } from 'react';
import styles from './ModalContrato.module.css';

export interface FormularioDeEncerramentoProps {
  readonly nomeDoContrato: string;
  readonly onEncerrar: (dataDaRescisao: string) => Promise<void>;
}

const HOJE = new Date().toISOString().slice(0, 10);

/**
 * Encerramento é irreversível e zera o saldo: exige confirmação explícita
 * antes de chamar o caso de uso (docs/modulo-recesso/04).
 */
export const FormularioDeEncerramento: React.FC<FormularioDeEncerramentoProps> = ({
  nomeDoContrato,
  onEncerrar
}) => {
  const [data, setData] = useState<string>(HOJE);
  const [confirmando, setConfirmando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);

  const submeter = async (evento: React.FormEvent): Promise<void> => {
    evento.preventDefault();
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      await onEncerrar(data);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível encerrar o contrato.');
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form className={styles.formularioEncerramento} onSubmit={submeter}>
      <div className={styles.campo}>
        <label htmlFor="rescisao-data">Data da rescisão</label>
        <input
          id="rescisao-data"
          type="date"
          max={HOJE}
          value={data}
          onChange={(evento) => { setData(evento.target.value); setConfirmando(false); }}
          required
        />
      </div>

      {confirmando && (
        <p className={styles.confirmacao} role="alert" id="confirmacao-encerramento">
          Encerrar <strong>{nomeDoContrato}</strong> em {data.split('-').reverse().join('/')}?
          O saldo atual será zerado e o contrato não aceitará novos lançamentos.
        </p>
      )}

      <button
        type="submit"
        id="btn-encerrar-contrato"
        className={confirmando ? styles.botaoPerigoConfirmar : styles.botaoPerigo}
        disabled={salvando}
      >
        {salvando ? 'Encerrando...' : confirmando ? 'Confirmar encerramento' : 'Encerrar contrato'}
      </button>

      {confirmando && !salvando && (
        <button
          type="button"
          className={styles.botaoCancelar}
          onClick={() => setConfirmando(false)}
        >
          Cancelar
        </button>
      )}

      {erro !== '' && <p className={styles.erro} role="alert">{erro}</p>}
    </form>
  );
};

import React, { useState } from 'react';
import styles from './TabelaBaseDePjs.module.css';
import { ItemBasePj } from '../../../application/read-models/ItemBasePj';

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/**
 * Valor mensal é dado sensível: some por padrão e só some ao clicar (docs/1-frontend-mockado/21).
 * Estado local por linha — revelar um contrato não revela os demais.
 */
const ValorMensalOculto: React.FC<{ valor: number }> = ({ valor }) => {
  const [revelado, setRevelado] = useState(false);
  return (
    <button
      type="button"
      className={styles.botaoRevelarValor}
      onClick={() => setRevelado((atual) => !atual)}
      aria-pressed={revelado}
      aria-label={revelado ? 'Ocultar valor mensal' : 'Revelar valor mensal'}
      title={revelado ? 'Clique para ocultar' : 'Clique para revelar'}
    >
      {revelado ? formatarMoeda(valor) : '••••••'}
    </button>
  );
};

/** Contratos vinculados do PJ. Coluna Status vem da VIGÊNCIA de cada contrato. */
const DetalhesDosContratos: React.FC<{ item: ItemBasePj; hoje: Date }> = ({ item, hoje }) => (
  <tr className={styles.linhaDetalhes}>
    <td colSpan={7}>
      <div className={styles.detalhesContratos}>
        <div className={styles.detalhesTitulo}>Contratos vinculados a {item.razaoSocial}</div>
        <table className={styles.tabelaContratos}>
          <thead>
            <tr>
              <th>Nº Contrato</th>
              <th>Descrição / Nome</th>
              <th>Empresa Vinculada</th>
              <th>Vigência</th>
              <th>Valor Mensal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {item.contratos.map((contrato) => {
              const ativo = contrato.estaVigente(hoje);
              return (
                <tr key={contrato.identificador()}>
                  <td className={styles.mono}>{contrato.codContrato}</td>
                  <td>{contrato.nomeContrato}</td>
                  <td>
                    <div>{contrato.nomeEmpresaResponsavel}</div>
                    <div className={`${styles.subtitulo} ${styles.mono}`}>{contrato.empresaResponsavel}</div>
                  </td>
                  <td>
                    {contrato.dataInicio.paraFormatadoCurto()} até{' '}
                    {contrato.dataFimParaExibicao}
                  </td>
                  <td><ValorMensalOculto valor={contrato.valorMensal} /></td>
                  <td>
                    <span className={`${styles.badge} ${ativo ? styles.badgeAtivo : styles.badgeInativo}`}>
                      {ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
);

export interface LinhaDePjProps {
  readonly item: ItemBasePj;
  readonly hoje: Date;
  readonly expandido: boolean;
  readonly onAlternar: (codEmpresa: string) => void;
}

const CelulaContratos: React.FC<Omit<LinhaDePjProps, 'hoje'>> = ({ item, expandido, onAlternar }) => {
  if (item.totalContratos === 0) return <span className={styles.semContrato}>Sem contrato</span>;
  return (
    <button
      type="button"
      className={styles.botaoExpansao}
      onClick={() => onAlternar(item.codEmpresa)}
      title={`${expandido ? 'Ocultar' : 'Ver'} ${item.totalContratos} contrato(s)`}
    >
      {expandido ? '▲ Ocultar' : '▼'} ({item.totalContratos})
    </button>
  );
};

export const LinhaDePj: React.FC<LinhaDePjProps> = ({ item, hoje, expandido, onAlternar }) => (
  <>
    <tr className={item.ativo ? '' : styles.linhaInativo}>
      <td className={styles.mono}>{item.codEmpresa}</td>
      <td>
        <div className={styles.razaoSocial}>{item.razaoSocial}</div>
        {item.nomeFantasia && item.nomeFantasia !== item.razaoSocial && (
          <div className={styles.subtitulo}>{item.nomeFantasia}</div>
        )}
      </td>
      <td>{item.responsavelLegalParaExibicao}</td>
      <td className={styles.mono}>{item.cnpj}</td>
      <td>{item.email}</td>
      <td>
        <span className={`${styles.badge} ${item.ativo ? styles.badgeAtivo : styles.badgeInativo}`}>
          {item.statusTexto}
        </span>
      </td>
      <td><CelulaContratos item={item} expandido={expandido} onAlternar={onAlternar} /></td>
    </tr>
    {expandido && item.totalContratos > 0 && <DetalhesDosContratos item={item} hoje={hoje} />}
  </>
);

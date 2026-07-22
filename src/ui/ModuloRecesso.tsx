import React from 'react';
import { TabelaDeRecesso } from './components/TabelaDeRecesso/TabelaDeRecesso';
import { ModalRlt } from './components/ModalRlt/ModalRlt';
import { ModalContrato } from './components/ModalContrato/ModalContrato';
import { ControleDoRecesso } from './hooks/useRecesso';
import { LinhaDeRecesso } from '../application/read-models/LinhaDeRecesso';

export interface ModuloRecessoProps {
  readonly controle: ControleDoRecesso;
  /** Já filtradas pela App — o mesmo conjunto que o Exportar leva. */
  readonly linhas: readonly LinhaDeRecesso[];
}

export const ModuloRecesso: React.FC<ModuloRecessoProps> = ({ controle, linhas }) => {
  return (
    <div id="tab-recesso">
      <TabelaDeRecesso
        linhas={linhas}
        onAbrirExtrato={controle.abrirExtrato}
        onAbrirInformacao={controle.abrirInformacao}
      />
      <ModalRlt
        linha={controle.modalAberto === 'extrato' ? controle.selecionada : null}
        onFechar={controle.fechar}
        onLancar={controle.lancar}
      />
      <ModalContrato
        linha={controle.modalAberto === 'contrato' ? controle.selecionada : null}
        onFechar={controle.fechar}
        onEncerrar={controle.encerrar}
      />
    </div>
  );
};

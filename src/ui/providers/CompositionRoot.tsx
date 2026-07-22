import React, { useMemo } from 'react';
import { DependenciasContext, Dependencias } from './DependenciasContext';
import { FornecedorRepositoryEmMemoria } from '../../infrastructure/mock/FornecedorRepositoryEmMemoria';
import { ChamadoRepositoryEmMemoria } from '../../infrastructure/mock/ChamadoRepositoryEmMemoria';
import { ContratoRepositoryEmMemoria } from '../../infrastructure/mock/ContratoRepositoryEmMemoria';
import { AlertaRepositoryEmMemoria } from '../../infrastructure/mock/AlertaRepositoryEmMemoria';
import { ExtratorCnpjMock } from '../../infrastructure/mock/ExtratorCnpjMock';
import { ExportadorXlsx } from '../../infrastructure/xlsx/ExportadorXlsx';
import { ObterStatusDaCompetencia } from '../../application/use-cases/ObterStatusDaCompetencia';
import { ListarMensagens } from '../../application/use-cases/ListarMensagens';
import { ListarMensagensDoFornecedor } from '../../application/use-cases/ListarMensagensDoFornecedor';
import { ExportarPlanilha } from '../../application/use-cases/ExportarPlanilha';
import { CNPJ_TOMADORES } from '../../infrastructure/mock/dados/mockData';
import { OcorrenciaDeRecessoRepositoryEmMemoria } from '../../infrastructure/mock/OcorrenciaDeRecessoRepositoryEmMemoria';
import { UsuarioAtualFixo } from '../../infrastructure/mock/UsuarioAtualFixo';
import { MotorDeCreditoMensal } from '../../domain/services/MotorDeCreditoMensal';
import { ListarContratosParaRecesso } from '../../application/use-cases/ListarContratosParaRecesso';
import { LancarOcorrenciaDeRecesso } from '../../application/use-cases/LancarOcorrenciaDeRecesso';
import { EncerrarContrato } from '../../application/use-cases/EncerrarContrato';
import { ExportarRecesso } from '../../application/use-cases/ExportarRecesso';
import { ExportadorDeRecessoXlsx } from '../../infrastructure/xlsx/ExportadorDeRecessoXlsx';

export interface CompositionRootProps {
  readonly children: React.ReactNode;
}

export const CompositionRoot: React.FC<CompositionRootProps> = ({ children }) => {
  const dependencias = useMemo<Dependencias>(() => {
    const fornecedorRepo = new FornecedorRepositoryEmMemoria();
    const chamadoRepo = new ChamadoRepositoryEmMemoria();
    const contratoRepo = new ContratoRepositoryEmMemoria();
    const alertaRepo = new AlertaRepositoryEmMemoria();
    const extratorCnpj = new ExtratorCnpjMock();
    const exportador = new ExportadorXlsx();

    // --- Módulo Recesso ---
    const ocorrenciaRepo = new OcorrenciaDeRecessoRepositoryEmMemoria();
    const usuarioAtual = new UsuarioAtualFixo();
    const motorDeCredito = new MotorDeCreditoMensal();

    return {
      obterStatus: new ObterStatusDaCompetencia(
        { fornecedorRepo, chamadoRepo, contratoRepo, extratorCnpj },
        CNPJ_TOMADORES
      ),
      listarMensagens: new ListarMensagens(alertaRepo),
      listarMensagensDoFornecedor: new ListarMensagensDoFornecedor(alertaRepo),
      exportarPlanilha: new ExportarPlanilha(exportador),
      chamadoRepo,
      fornecedorRepo,
      listarContratosParaRecesso: new ListarContratosParaRecesso({
        contratoRepo, fornecedorRepo, ocorrenciaRepo, motor: motorDeCredito
      }),
      lancarOcorrenciaDeRecesso: new LancarOcorrenciaDeRecesso({
        ocorrenciaRepo, contratoRepo, usuarioAtual
      }),
      encerrarContrato: new EncerrarContrato({ ocorrenciaRepo, contratoRepo, usuarioAtual }),
      exportarRecesso: new ExportarRecesso(new ExportadorDeRecessoXlsx())
    };
  }, []);

  return (
    <DependenciasContext.Provider value={dependencias}>
      {children}
    </DependenciasContext.Provider>
  );
};

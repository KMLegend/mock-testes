import React, { useMemo } from 'react';
import { DependenciasContext, Dependencias } from './DependenciasContext';

// Mocks
import { FornecedorRepositoryEmMemoria } from '../../infrastructure/mock/FornecedorRepositoryEmMemoria';
import { ChamadoRepositoryEmMemoria } from '../../infrastructure/mock/ChamadoRepositoryEmMemoria';
import { ContratoRepositoryEmMemoria } from '../../infrastructure/mock/ContratoRepositoryEmMemoria';
import { AlertaRepositoryEmMemoria } from '../../infrastructure/mock/AlertaRepositoryEmMemoria';
import { OcorrenciaDeRecessoRepositoryEmMemoria } from '../../infrastructure/mock/OcorrenciaDeRecessoRepositoryEmMemoria';
import { CargaDeCadastroMock } from '../../infrastructure/mock/cadastro/CargaDeCadastroMock';

// HTTP API Repositories
import { FornecedorRepositoryHttp } from '../../infrastructure/http/FornecedorRepositoryHttp';
import { ChamadoRepositoryHttp } from '../../infrastructure/http/ChamadoRepositoryHttp';
import { ContratoRepositoryHttp } from '../../infrastructure/http/ContratoRepositoryHttp';
import { AlertaRepositoryHttp } from '../../infrastructure/http/AlertaRepositoryHttp';
import { OcorrenciaDeRecessoRepositoryHttp } from '../../infrastructure/http/OcorrenciaDeRecessoRepositoryHttp';
import { CargaDeCadastroHttp } from '../../infrastructure/http/CargaDeCadastroHttp';

import { ExtratorCnpjMock } from '../../infrastructure/mock/ExtratorCnpjMock';
import { ExportadorXlsx } from '../../infrastructure/xlsx/ExportadorXlsx';
import { ObterStatusDaCompetencia } from '../../application/use-cases/ObterStatusDaCompetencia';
import { ListarMensagens } from '../../application/use-cases/ListarMensagens';
import { ListarMensagensDoFornecedor } from '../../application/use-cases/ListarMensagensDoFornecedor';
import { ExportarPlanilha } from '../../application/use-cases/ExportarPlanilha';
import { CNPJ_TOMADORES } from '../../infrastructure/mock/dados/mockData';
import { UsuarioAtualFixo } from '../../infrastructure/mock/UsuarioAtualFixo';
import { MotorDeCreditoMensal } from '../../domain/services/MotorDeCreditoMensal';
import { ListarContratosParaRecesso } from '../../application/use-cases/ListarContratosParaRecesso';
import { LancarOcorrenciaDeRecesso } from '../../application/use-cases/LancarOcorrenciaDeRecesso';
import { ExportarRecesso } from '../../application/use-cases/ExportarRecesso';
import { FinalizarContratoAntecipadamente } from '../../application/use-cases/FinalizarContratoAntecipadamente';
import { ExportadorDeRecessoXlsx } from '../../infrastructure/xlsx/ExportadorDeRecessoXlsx';
import { BaseDeCadastroStore } from '../../infrastructure/mock/cadastro/BaseDeCadastroStore';

export interface CompositionRootProps {
  readonly children: React.ReactNode;
}

export const CompositionRoot: React.FC<CompositionRootProps> = ({ children }) => {
  const dependencias = useMemo<Dependencias>(() => {
    const useApi = import.meta.env.VITE_USE_API === 'true';

    // Store de cadastro compartilhado: os dois repositórios leem daqui, e a carga
    // de planilha escreve aqui (persistido em localStorage).
    const cadastroStore = new BaseDeCadastroStore();
    
    const fornecedorRepo = useApi 
      ? new FornecedorRepositoryHttp() 
      : new FornecedorRepositoryEmMemoria(cadastroStore);
      
    const chamadoRepo = useApi 
      ? new ChamadoRepositoryHttp() 
      : new ChamadoRepositoryEmMemoria();
      
    const contratoRepo = useApi 
      ? new ContratoRepositoryHttp() 
      : new ContratoRepositoryEmMemoria(cadastroStore);
      
    const alertaRepo = useApi 
      ? new AlertaRepositoryHttp() 
      : new AlertaRepositoryEmMemoria();

    const extratorCnpj = new ExtratorCnpjMock();
    const exportador = new ExportadorXlsx();

    // --- Módulo Recesso ---
    const ocorrenciaRepo = useApi
      ? new OcorrenciaDeRecessoRepositoryHttp()
      : new OcorrenciaDeRecessoRepositoryEmMemoria(cadastroStore);
      
    const usuarioAtual = new UsuarioAtualFixo();
    const motorDeCredito = new MotorDeCreditoMensal();

    const cargaDeCadastro = useApi 
      ? new CargaDeCadastroHttp() 
      : new CargaDeCadastroMock(cadastroStore, ocorrenciaRepo as any);

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
      contratoRepo,
      listarContratosParaRecesso: new ListarContratosParaRecesso({
        contratoRepo, fornecedorRepo, ocorrenciaRepo, motor: motorDeCredito
      }),
      lancarOcorrenciaDeRecesso: new LancarOcorrenciaDeRecesso({
        ocorrenciaRepo, contratoRepo, usuarioAtual
      }),
      finalizarContratoAntecipadamente: new FinalizarContratoAntecipadamente({ ocorrenciaRepo }),
      exportarRecesso: new ExportarRecesso(new ExportadorDeRecessoXlsx()),
      cargaDeCadastro
    };
  }, []);

  return (
    <DependenciasContext.Provider value={dependencias}>
      {children}
    </DependenciasContext.Provider>
  );
};

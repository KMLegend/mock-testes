// Base de dados mock do projeto (Fase 1)
// Em conformidade com docs/13-referencia-payloads-mock.md e docs/08-mocks-e-testes.md

export const mockFornecedores = [
  {
    "Cod_Empresa": "012",
    "Empresa": "KEVIN MAYKEL AGOSTINHO GOMES LTDA",
    "Apelido": "KEVIN MAYKEL",
    "Email": "kevin.maykel@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "12345678901234",
    "ativo": 1
  },
  {
    "Cod_Empresa": "013",
    "Empresa": "JOÃO SILVA SERVIÇOS LTDA",
    "Apelido": "João Silva",
    "Email": "joao.silva@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "98765432101234",
    "ativo": 1
  },
  {
    "Cod_Empresa": "014",
    "Empresa": "MARIA SOUZA CONSULTORIA LTDA",
    "Apelido": "Maria Souza",
    "Email": "maria.souza@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "87654321098765",
    "ativo": 1
  },
  {
    "Cod_Empresa": "015",
    "Empresa": "CARLOS SANTOS SERVICOS LTDA",
    "Apelido": "CARLOS SANTOS",
    "Email": "carlos.santos@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "33333333000133",
    "ativo": 1
  },
  {
    "Cod_Empresa": "016",
    "Empresa": "PEDRO PEDROSA ENGENHARIA LTDA",
    "Apelido": "Pedro Pedrosa",
    "Email": "pedro.pedrosa@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "11112222333344",
    "ativo": 1
  },
  {
    "Cod_Empresa": "017",
    "Empresa": "FORNECEDOR INATIVO LTDA",
    "Apelido": "Inativo",
    "Email": "inativo@cityinc.com.br",
    "Tipo_Inscricao": "1",
    "CNPJ": "99999999999999",
    "ativo": 0
  }
];

export const mockContratos = [
  {
    "Cod_empresa": "012",
    "Cod_Contrato": "CONTRATO-012-A",
    "Nome_Contrato": "CONTRATO KEVIN - ADMIN",
    "Data_Inicio": "2023-01-01",
    "Data_Fim": "2026-12-31",
    "Valor_Mensal": 5000,
    "Empresa_Responsavel": "001",
    "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA"
  },
  {
    "Cod_empresa": "013",
    "Cod_Contrato": "CONTRATO-013-A",
    "Nome_Contrato": "CONTRATO JOAO - TI",
    "Data_Inicio": "2023-01-01",
    "Data_Fim": "2026-12-31",
    "Valor_Mensal": 4500,
    "Empresa_Responsavel": "001",
    "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA"
  },
  {
    "Cod_empresa": "014",
    "Cod_Contrato": "CONTRATO-014-A",
    "Nome_Contrato": "CONTRATO MARIA - MKT",
    "Data_Inicio": "2023-01-01",
    "Data_Fim": "2026-12-31",
    "Valor_Mensal": 6000,
    "Empresa_Responsavel": "001",
    "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA"
  },
  {
    "Cod_empresa": "015",
    "Cod_Contrato": "101",
    "Nome_Contrato": "SERVIÇOS - CITY INCORP",
    "Data_Inicio": "2024-01-01",
    "Data_Fim": "2026-12-31",
    "Valor_Mensal": 10000,
    "Empresa_Responsavel": "001",
    "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA"
  },
  {
    "Cod_empresa": "015",
    "Cod_Contrato": "102",
    "Nome_Contrato": "SERVIÇOS - SPE PRAÇA DO SOL",
    "Data_Inicio": "2024-01-01",
    "Data_Fim": "2026-12-31",
    "Valor_Mensal": 15000,
    "Empresa_Responsavel": "002",
    "Nome_Empresa_Responsavel": "SPE RESIDENCIAL PRAÇA DO SOL EMPREENDIMENTOS LTDA"
  },
  {
    "Cod_empresa": "016",
    "Cod_Contrato": "CONTRATO-016-A",
    "Nome_Contrato": "CONTRATO PEDRO - OBRAS",
    "Data_Inicio": "2025-01-01",
    "Data_Fim": "2027-12-31",
    "Valor_Mensal": 8000,
    "Empresa_Responsavel": "001",
    "Nome_Empresa_Responsavel": "CITY INCORPORADORA LTDA"
  }
];

export const mockChamados = [
  {
    "id": "8a9f8362abaaf5f90a1884d501cd6176",
    "protocol": "19164",
    "subject": "Envio de Nota Fiscal - Julho 2026",
    "creation_date": "2026-07-20 09:15:00-03:00",
    "end_date": "2026-07-20 10:30:00-03:00",
    "name": "João Silva",
    "email": "joao.silva@cityinc.com.br",
    "situation_id": "5",
    "situation_description": "Finalizado",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Contratual",
    "mes_referente": "07-2026"
  },
  {
    "id": "238d061bed2cff0a763dce00a0c8b586",
    "protocol": "19165",
    "subject": "NF Reembolso Convênio Médico - Julho 2026",
    "creation_date": "2026-07-21 11:20:15-03:00",
    "end_date": "2026-07-21 14:05:22-03:00",
    "name": "Maria Souza",
    "email": "maria.souza@cityinc.com.br",
    "situation_id": "5",
    "situation_description": "Finalizado",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Reembolso plano de saude", // cru sem acento para testar normalização
    "mes_referente": "07-2026"
  },
  {
    "id": "c73a8362abaaf5f90a1884d501cd9912",
    "protocol": "19166",
    "subject": "Nota Fiscal Julho - Serviços e Plano de Saúde",
    "creation_date": "2026-07-22 14:10:30-03:00",
    "end_date": null,
    "name": "Carlos Santos",
    "email": "carlos.santos@cityinc.com.br",
    "situation_id": "2",
    "situation_description": "Em Andamento",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Ambas", // Ambas num único chamado = 1 linha no grid com Tipo Lançamento "Ambas"
    "mes_referente": "07-2026",
    "cnpj_anexo": "17928511000170" // CNPJ da SPE RESIDENCIAL PRAÇA DO SOL (Contrato 102)
  },
  {
    "id": "65d9a0d8c0b11ff31a884d501cd99451",
    "protocol": "19167",
    "subject": "Nota Fiscal Julho - Kevin Maykel",
    "creation_date": "2026-07-23 10:00:00-03:00",
    "end_date": null,
    "name": "Kevin Maykel",
    "email": "  Kevin.Maykel@cityinc.com.br  ", // espaços e caixa mista para teste de normalização
    "situation_id": "2",
    "situation_description": "Em Andamento",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Contratual",
    "mes_referente": "Julho/2026" // formato texto para testar o parser
  },
  {
    "id": "d27a123ebbcff32901cd84d501cc2219",
    "protocol": "19168",
    "subject": "Nota Fiscal de Contrato Carlos Santos",
    "creation_date": "2026-07-24 16:30:00-03:00",
    "end_date": null,
    "name": "Carlos Santos",
    "email": "carlos.santos@cityinc.com.br",
    "situation_id": "2",
    "situation_description": "Em Andamento",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Contratual",
    "mes_referente": "07-2026",
    "cnpj_anexo": "00000000000000" // CNPJ inexistente no cadastro para testar tratamento manual
  },
  {
    "id": "8f889988abaaf5f90a1884d501cd7777",
    "protocol": "19169",
    "subject": "NF Reembolso Convênio Médico - Junho 2026",
    "creation_date": "2026-06-20 11:20:15-03:00",
    "end_date": "2026-06-20 14:05:22-03:00",
    "name": "Maria Souza",
    "email": "maria.souza@cityinc.com.br",
    "situation_id": "5",
    "situation_description": "Finalizado",
    "category_id": "8b9a123fcd09bd585714b53d5370f1a2",
    "category_name": "Recebimento de Notas - PJ",
    "tipo_de_lancamento": "Reembolso plano de saude",
    "mes_referente": "06-2026"
  }
];

export const mockAlertas = [
  {
    "email": "kevin.maykel@cityinc.com.br",
    "nome": "KEVIN MAYKEL AGOSTINHO GOMES",
    "cnpj": "12345678901234",
    "regra": "D-3",
    "data_hora_envio": "2026-07-29 09:00:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "kevin.maykel@cityinc.com.br",
    "nome": "KEVIN MAYKEL AGOSTINHO GOMES",
    "cnpj": "12345678901234",
    "regra": "D",
    "data_hora_envio": "2026-08-01 09:00:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "joao.silva@cityinc.com.br",
    "nome": "JOÃO SILVA SERVIÇOS LTDA",
    "cnpj": "98765432101234",
    "regra": "D-3",
    "data_hora_envio": "2026-07-29 09:02:15",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "maria.souza@cityinc.com.br",
    "nome": "MARIA SOUZA CONSULTORIA LTDA",
    "cnpj": "87654321098765",
    "regra": "D-3",
    "data_hora_envio": "2026-07-29 09:05:40",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "carlos.santos@cityinc.com.br",
    "nome": "CARLOS SANTOS SERVICOS LTDA",
    "cnpj": "33333333000133",
    "regra": "D-3",
    "data_hora_envio": "2026-07-29 09:10:12",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "carlos.santos@cityinc.com.br",
    "nome": "CARLOS SANTOS SERVICOS LTDA",
    "cnpj": "33333333000133",
    "regra": "D",
    "data_hora_envio": "2026-08-01 09:12:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "carlos.santos@cityinc.com.br",
    "nome": "CARLOS SANTOS SERVICOS LTDA",
    "cnpj": "33333333000133",
    "regra": "D+1",
    "data_hora_envio": "2026-08-02 10:15:30",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "pedro.pedrosa@cityinc.com.br",
    "nome": "PEDRO PEDROSA ENGENHARIA LTDA",
    "cnpj": "11112222333344",
    "regra": "D-3",
    "data_hora_envio": "2026-07-29 09:15:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "pedro.pedrosa@cityinc.com.br",
    "nome": "PEDRO PEDROSA ENGENHARIA LTDA",
    "cnpj": "11112222333344",
    "regra": "D",
    "data_hora_envio": "2026-08-01 09:20:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "pedro.pedrosa@cityinc.com.br",
    "nome": "PEDRO PEDROSA ENGENHARIA LTDA",
    "cnpj": "11112222333344",
    "regra": "D+1",
    "data_hora_envio": "2026-08-02 09:00:00",
    "mes_ano_referencia": "07-2026"
  },
  {
    "email": "pedro.pedrosa@cityinc.com.br",
    "nome": "PEDRO PEDROSA ENGENHARIA LTDA",
    "cnpj": "11112222333344",
    "regra": "D+3",
    "data_hora_envio": "2026-08-04 09:30:00",
    "mes_ano_referencia": "07-2026"
  }
];

import { useState, useMemo } from 'react';
import { Competencia } from '../../domain/value-objects/Competencia';

const hoje = new Date();
const anoPadrao = String(hoje.getFullYear());
const mesPadrao = String(hoje.getMonth() + 1).padStart(2, '0');

export function useCompetencia() {
  const [ano, setAno] = useState<string>(anoPadrao);
  const [mes, setMes] = useState<string>(mesPadrao);

  const competencia = useMemo(() => Competencia.de(mes, ano), [mes, ano]);

  return {
    ano,
    mes,
    setAno,
    setMes,
    competencia
  };
}

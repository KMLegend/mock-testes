import { useState, useEffect, useCallback } from 'react';
import { Competencia } from '../../domain/value-objects/Competencia';
import { LinhasDeStatus } from '../../domain/collections/LinhasDeStatus';
import { useDependencias } from '../providers/DependenciasContext';

export function useStatusDaCompetencia(competencia: Competencia) {
  const { obterStatus } = useDependencias();
  const [linhasGrid, setLinhasGrid] = useState<LinhasDeStatus>(new LinhasDeStatus([]));
  const [carregando, setCarregando] = useState<boolean>(true);
  const [versao, setVersao] = useState<number>(0);

  const recarregar = useCallback(() => {
    setVersao((v) => v + 1);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    obterStatus.executar(competencia).then((resultado) => {
      if (!cancelado) {
        setLinhasGrid(resultado);
        setCarregando(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [obterStatus, competencia, versao]);

  return {
    linhasGrid,
    carregando,
    recarregar
  };
}

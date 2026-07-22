import { useState, useEffect } from 'react';
import { Alertas, CriterioFiltroAlertas } from '../../domain/collections/Alertas';
import { useDependencias } from '../providers/DependenciasContext';

export function useMensagens(criterio: CriterioFiltroAlertas) {
  const { listarMensagens } = useDependencias();
  const [alertas, setAlertas] = useState<Alertas>(new Alertas([]));
  const [carregando, setCarregando] = useState<boolean>(true);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    listarMensagens.executar(criterio).then((resultado) => {
      if (!cancelado) {
        setAlertas(resultado);
        setCarregando(false);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [listarMensagens, criterio]);

  return {
    alertas,
    carregando
  };
}

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CONFIG_PADRAO, obterConfig } from '../db/db';

/** Configurações reativas; garante o registro padrão na primeira execução. */
export function useConfig() {
  useEffect(() => {
    obterConfig();
  }, []);
  const config = useLiveQuery(() => db.config.get('config'));
  return config ?? CONFIG_PADRAO;
}

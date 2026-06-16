import { db } from '../db/db';

/** Dispara o download de um arquivo no navegador. */
function baixar(nome: string, conteudo: BlobPart, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporta um CSV (separador ';' e BOM para abrir certo no Excel pt-BR). */
export function exportarCSV(nome: string, colunas: string[], linhas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v).replace(/"/g, '""');
    return /[";\n]/.test(s) ? `"${s}"` : s;
  };
  const corpo = [colunas, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n');
  baixar(`${nome}.csv`, '﻿' + corpo, 'text/csv;charset=utf-8');
}

interface Backup {
  versao: number;
  exportadoEm: string;
  clientes: unknown[];
  emprestimos: unknown[];
  parcelas: unknown[];
  pagamentos: unknown[];
  movimentos: unknown[];
  config: unknown[];
}

/** Exporta TODOS os dados como um único JSON (backup completo). */
export async function exportarBackup(): Promise<void> {
  const backup: Backup = {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    clientes: await db.clientes.toArray(),
    emprestimos: await db.emprestimos.toArray(),
    parcelas: await db.parcelas.toArray(),
    pagamentos: await db.pagamentos.toArray(),
    movimentos: await db.movimentos.toArray(),
    config: await db.config.toArray(),
  };
  const data = new Date().toISOString().slice(0, 10);
  baixar(
    `backup-credito-${data}.json`,
    JSON.stringify(backup, null, 2),
    'application/json',
  );
}

/** Importa um backup JSON, substituindo os dados atuais. */
export async function importarBackup(arquivo: File): Promise<void> {
  const texto = await arquivo.text();
  const dados = JSON.parse(texto) as Backup;
  if (!dados.clientes || !dados.emprestimos) {
    throw new Error('Arquivo de backup inválido.');
  }
  await db.transaction(
    'rw',
    [db.clientes, db.emprestimos, db.parcelas, db.pagamentos, db.movimentos, db.config],
    async () => {
      await Promise.all([
        db.clientes.clear(),
        db.emprestimos.clear(),
        db.parcelas.clear(),
        db.pagamentos.clear(),
        db.movimentos.clear(),
        db.config.clear(),
      ]);
      await db.clientes.bulkAdd(dados.clientes as never);
      await db.emprestimos.bulkAdd(dados.emprestimos as never);
      await db.parcelas.bulkAdd(dados.parcelas as never);
      await db.pagamentos.bulkAdd(dados.pagamentos as never);
      await db.movimentos.bulkAdd(dados.movimentos as never);
      if (dados.config?.length) await db.config.bulkAdd(dados.config as never);
    },
  );
}

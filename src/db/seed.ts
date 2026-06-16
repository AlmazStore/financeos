import { db } from './db';
import {
  atualizarAtrasos,
  criarCliente,
  criarEmprestimo,
  registrarPagamento,
  type NovoEmprestimoInput,
} from './repos';
import { dataParaISO, isoParaData } from '../lib/datas';
import type { FormaPagamento } from '../types/modelos';

/** Já existem dados cadastrados? */
export async function jaTemDados(): Promise<boolean> {
  return (await db.clientes.count()) > 0;
}

/** Apaga TODOS os dados (mantém apenas a configuração). */
export async function limparTudo(): Promise<void> {
  await db.transaction(
    'rw',
    [db.clientes, db.emprestimos, db.parcelas, db.pagamentos, db.movimentos],
    async () => {
      await Promise.all([
        db.clientes.clear(),
        db.emprestimos.clear(),
        db.parcelas.clear(),
        db.pagamentos.clear(),
        db.movimentos.clear(),
      ]);
    },
  );
}

function addDias(iso: string, n: number): string {
  const d = isoParaData(iso);
  d.setDate(d.getDate() + n);
  return dataParaISO(d);
}

type PadraoEmp = Omit<NovoEmprestimoInput, 'clienteId'>;

const padrao = (over: Partial<PadraoEmp>): PadraoEmp => ({
  principal: 100_000,
  taxaPercent: 10,
  periodicidadeTaxa: 'MENSAL',
  sistema: 'PRICE',
  numeroParcelas: 4,
  frequencia: 'MENSAL',
  dataEmprestimoISO: '2026-03-01',
  multaAtraso: 2,
  jurosMoraDia: 0.33,
  ...over,
});

/** Paga parcelas de um empréstimo. dataISO ausente = paga na data do vencimento. */
async function pagar(
  empId: string,
  itens: { numero: number; fracao?: number; dataISO?: string; forma?: FormaPagamento }[],
) {
  const parcelas = await db.parcelas.where('emprestimoId').equals(empId).sortBy('numero');
  for (const it of itens) {
    const p = parcelas.find((x) => x.numero === it.numero);
    if (!p) continue;
    await registrarPagamento({
      parcelaId: p.id,
      valor: Math.round(p.valorParcela * (it.fracao ?? 1)),
      forma: it.forma ?? 'PIX',
      dataISO: it.dataISO ?? p.dataVencimento,
    });
  }
}

/**
 * Popula o app com dados de demonstração realistas, cobrindo todos os
 * status (em dia, atrasado, quitado), riscos (bom/regular/atenção),
 * os 4 sistemas de cálculo e um pagamento parcial.
 */
export async function seedDemo(): Promise<void> {
  // 1) Maria — boa pagadora, em dia (Price)
  const maria = await criarCliente({
    nome: 'Maria Souza',
    apelido: 'Maria',
    telefone: '11991112222',
  });
  const empMaria = await criarEmprestimo({
    clienteId: maria,
    ...padrao({
      principal: 200_000,
      numeroParcelas: 5,
      dataEmprestimoISO: '2026-03-10',
      dataPrimeiraParcelaISO: '2026-04-10',
    }),
  });
  await pagar(empMaria, [{ numero: 1 }, { numero: 2 }, { numero: 3 }]);

  // 2) Pedro — atrasado, com pagamento parcial (SAC) → Atenção
  const pedro = await criarCliente({
    nome: 'Pedro Lima',
    telefone: '11993334444',
  });
  const empPedro = await criarEmprestimo({
    clienteId: pedro,
    ...padrao({
      principal: 100_000,
      sistema: 'SAC',
      dataEmprestimoISO: '2026-02-01',
      dataPrimeiraParcelaISO: '2026-03-01',
    }),
  });
  await pagar(empPedro, [{ numero: 1, fracao: 0.5 }]); // parcial e vencida

  // 3) Ana — rotativo (Só Juros), em dia
  const ana = await criarCliente({
    nome: 'Ana Costa',
    apelido: 'Aninha',
    telefone: '11995556666',
  });
  const empAna = await criarEmprestimo({
    clienteId: ana,
    ...padrao({
      principal: 500_000,
      taxaPercent: 8,
      sistema: 'SO_JUROS',
      numeroParcelas: 6,
      dataEmprestimoISO: '2026-05-01',
      dataPrimeiraParcelaISO: '2026-06-01',
    }),
  });
  await pagar(empAna, [{ numero: 1 }]);

  // 4) Carlos — quitado (Juros Simples), bom pagador
  const carlos = await criarCliente({
    nome: 'Carlos Mendes',
    telefone: '11997778888',
  });
  const empCarlos = await criarEmprestimo({
    clienteId: carlos,
    ...padrao({
      principal: 300_000,
      sistema: 'JUROS_SIMPLES',
      numeroParcelas: 3,
      dataEmprestimoISO: '2026-01-05',
      dataPrimeiraParcelaISO: '2026-02-05',
    }),
  });
  await pagar(empCarlos, [{ numero: 1 }, { numero: 2 }, { numero: 3 }]);

  // 5) Beatriz — pagou com atraso, mas hoje sem pendência vencida → Regular
  const bia = await criarCliente({
    nome: 'Beatriz Rocha',
    apelido: 'Bia',
    telefone: '11999990000',
  });
  const empBia = await criarEmprestimo({
    clienteId: bia,
    ...padrao({
      principal: 150_000,
      dataEmprestimoISO: '2026-03-20',
      dataPrimeiraParcelaISO: '2026-04-20',
    }),
  });
  await pagar(empBia, [
    { numero: 1, dataISO: addDias('2026-04-20', 12) }, // pagou 12 dias atrasado
    { numero: 2 }, // em dia
  ]);

  await atualizarAtrasos();
}

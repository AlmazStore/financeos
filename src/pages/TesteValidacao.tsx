import { simular, ROTULO_SISTEMA, type ParametrosSimulacao } from '../lib/finance/simulador';
import type { SistemaCalculo } from '../types/modelos';
import { formatBRL } from '../lib/dinheiro';

/**
 * Tela de validação (seção 6.2): roda o exemplo R$ 1.000, 10% a.m., 4 parcelas
 * para os 4 sistemas e compara o calculado com o esperado pela especificação.
 */

const BASE: Omit<ParametrosSimulacao, 'sistema'> = {
  principal: 100_000,
  taxaPercent: 10,
  numParcelas: 4,
  frequencia: 'MENSAL',
  dataEmprestimo: new Date(2026, 0, 1),
  dataPrimeiraParcela: new Date(2026, 1, 1),
};

interface Esperado {
  sistema: SistemaCalculo;
  // valores esperados em centavos
  parcelas: number[];
  totalJuros: number;
  totalAReceber: number;
  saldos: number[];
}

const ESPERADOS: Esperado[] = [
  {
    sistema: 'JUROS_SIMPLES',
    parcelas: [35_000, 35_000, 35_000, 35_000],
    totalJuros: 40_000,
    totalAReceber: 140_000,
    saldos: [75_000, 50_000, 25_000, 0],
  },
  {
    sistema: 'PRICE',
    parcelas: [31_547, 31_547, 31_547, 31_547],
    totalJuros: 26_188,
    totalAReceber: 126_188,
    saldos: [78_453, 54_751, 28_679, 0],
  },
  {
    sistema: 'SAC',
    parcelas: [35_000, 32_500, 30_000, 27_500],
    totalJuros: 25_000,
    totalAReceber: 125_000,
    saldos: [75_000, 50_000, 25_000, 0],
  },
  {
    sistema: 'SO_JUROS',
    parcelas: [10_000, 10_000, 10_000, 10_000],
    totalJuros: 40_000,
    totalAReceber: 140_000,
    saldos: [100_000, 100_000, 100_000, 100_000],
  },
];

function arraysIguais(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export default function TesteValidacao() {
  const resultados = ESPERADOS.map((esp) => {
    const r = simular({ ...BASE, sistema: esp.sistema });
    const calcParcelas = r.parcelas.map((p) => p.parcela);
    const calcSaldos = r.parcelas.map((p) => p.saldo);
    const ok =
      arraysIguais(calcParcelas, esp.parcelas) &&
      arraysIguais(calcSaldos, esp.saldos) &&
      r.totalJuros === esp.totalJuros &&
      r.totalAReceber === esp.totalAReceber;
    return { esp, r, calcParcelas, calcSaldos, ok };
  });

  const todosOk = resultados.every((x) => x.ok);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Validação dos cálculos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Exemplo da seção 6.2: R$ 1.000, 10% ao mês, 4 parcelas mensais.
        </p>
      </div>

      <div
        className={`rounded-2xl p-4 text-center font-bold ${
          todosOk
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
        }`}
      >
        {todosOk
          ? '✓ Todos os sistemas batem com a especificação'
          : '✗ Há divergências — revisar'}
      </div>

      {resultados.map(({ esp, r, calcParcelas, ok }) => (
        <section
          key={esp.sistema}
          className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="font-semibold">{ROTULO_SISTEMA[esp.sistema]}</span>
            <span
              className={
                ok
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }
            >
              {ok ? '✓ OK' : '✗ Falhou'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200 text-sm dark:bg-slate-800">
            <LinhaComparada
              rotulo="Parcela(s)"
              calc={
                esp.sistema === 'SAC'
                  ? calcParcelas.map((c) => formatBRL(c)).join(' / ')
                  : formatBRL(calcParcelas[0])
              }
              esperado={
                esp.sistema === 'SAC'
                  ? esp.parcelas.map((c) => formatBRL(c)).join(' / ')
                  : formatBRL(esp.parcelas[0])
              }
            />
            <LinhaComparada
              rotulo="Total de juros"
              calc={formatBRL(r.totalJuros)}
              esperado={formatBRL(esp.totalJuros)}
            />
            <LinhaComparada
              rotulo="Total a receber"
              calc={formatBRL(r.totalAReceber)}
              esperado={formatBRL(esp.totalAReceber)}
            />
            <LinhaComparada
              rotulo="Saldo final"
              calc={formatBRL(r.parcelas.at(-1)!.saldo)}
              esperado={formatBRL(esp.saldos.at(-1)!)}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function LinhaComparada({
  rotulo,
  calc,
  esperado,
}: {
  rotulo: string;
  calc: string;
  esperado: string;
}) {
  const igual = calc === esperado;
  return (
    <div className="bg-white p-3 dark:bg-slate-900">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{rotulo}</div>
      <div className="font-semibold">{calc}</div>
      <div
        className={`text-[11px] ${
          igual
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        esperado: {esperado} {igual ? '✓' : '✗'}
      </div>
    </div>
  );
}

import type { ResultadoSimulacao } from '../lib/finance/simulador';
import { formatBRL, formatPercent } from '../lib/dinheiro';
import { formatData } from '../lib/datas';
import { Cartao, Indicador } from './ui';

/** Cartões de indicadores + tabela de amortização de uma simulação. */
export default function ResultadoView({ r }: { r: ResultadoSimulacao }) {
  return (
    <>
      <section className="grid grid-cols-2 gap-3">
        <Indicador
          titulo={r.parcelaFixa ? 'Valor da parcela' : 'Parcelas'}
          valor={r.parcelaFixa ? formatBRL(r.parcelaFixa) : 'Decrescentes'}
          destaque
        />
        <Indicador titulo="Total a receber" valor={formatBRL(r.totalAReceber)} />
        <Indicador
          titulo="Lucro previsto (juros)"
          valor={formatBRL(r.totalJuros)}
          cor="text-emerald-600 dark:text-emerald-400"
        />
        <Indicador
          titulo="Taxa efetiva / período"
          valor={formatPercent(r.taxaEfetivaPeriodo)}
        />
        <Indicador titulo="CET aproximado (ano)" valor={formatPercent(r.cetAnual)} />
        <Indicador titulo="Capital emprestado" valor={formatBRL(r.principal)} />
      </section>

      {r.observacao && (
        <p className="rounded-xl bg-slate-200 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          ℹ️ {r.observacao}
        </p>
      )}

      <Cartao>
        <div className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">
          Tabela de amortização
        </div>
        <div className="tabela-scroll overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-slate-500 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2">Juros</th>
                <th className="px-3 py-2">Amort.</th>
                <th className="px-3 py-2">Parcela</th>
                <th className="px-3 py-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {r.parcelas.map((p) => (
                <tr
                  key={p.numero}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-3 py-2 text-left font-medium">{p.numero}</td>
                  <td className="px-3 py-2 text-left text-slate-500 dark:text-slate-400">
                    {formatData(p.vencimento)}
                  </td>
                  <td className="px-3 py-2">{formatBRL(p.juros)}</td>
                  <td className="px-3 py-2">{formatBRL(p.amortizacao)}</td>
                  <td className="px-3 py-2 font-semibold">{formatBRL(p.parcela)}</td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {formatBRL(p.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}

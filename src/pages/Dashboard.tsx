import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTudo } from '../hooks/useDados';
import { resumoCarteira, seriesMensais, vencimentos } from '../lib/agregados';
import { abertoParcela } from '../lib/metricas';
import { formatBRL } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { hojeISO } from '../lib/id';
import { Botao, Cartao, Indicador, PageHeader, Vazio } from '../components/ui';

export default function Dashboard() {
  const dados = useTudo();
  const hoje = hojeISO();

  const calc = useMemo(() => {
    if (!dados) return null;
    return {
      carteira: resumoCarteira(dados.emprestimos, dados.parcelas),
      venc: vencimentos(dados.emprestimos, dados.parcelas, dados.clientes, hoje),
      serie: seriesMensais(dados.parcelas, dados.movimentos),
    };
  }, [dados, hoje]);

  if (!calc) return <Vazio>Carregando…</Vazio>;
  const { carteira, venc, serie } = calc;
  const vazio = dados!.emprestimos.length === 0;

  return (
    <div className="space-y-4">
      <PageHeader titulo="Início" subtitulo="Visão geral da operação" />

      {vazio && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          Comece cadastrando um <Link to="/clientes/novo" className="font-semibold underline">cliente</Link> e
          criando um <Link to="/emprestimos/novo" className="font-semibold underline">empréstimo</Link>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Capital na rua" valor={formatBRL(carteira.capitalNaRua)} destaque />
        <Indicador titulo="A receber" valor={formatBRL(carteira.aReceber)} />
        <Indicador
          titulo="Já recebido"
          valor={formatBRL(carteira.totalRecebido)}
          cor="text-emerald-600 dark:text-emerald-400"
        />
        <Indicador
          titulo="Lucro (juros)"
          valor={formatBRL(carteira.lucro)}
          cor="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Cartao className="p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {carteira.clientesEmDia}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">em dia</div>
        </Cartao>
        <Cartao className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {carteira.clientesAtrasados}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">atrasados</div>
        </Cartao>
      </div>

      {/* Vencimentos de hoje */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Vencem hoje</h3>
          <Link to="/cobranca" className="text-sm text-emerald-600 dark:text-emerald-400">
            ver cobrança ›
          </Link>
        </div>
        {venc.hoje.length === 0 && venc.atrasadas.length === 0 ? (
          <Vazio>Nenhum vencimento para hoje. 🎉</Vazio>
        ) : (
          [...venc.hoje, ...venc.atrasadas.slice(0, 3)].map((it) => (
            <Cartao key={it.parcela.id} className="flex items-center justify-between p-3">
              <div>
                <div className="font-semibold">{it.cliente?.nome ?? '—'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Parcela #{it.parcela.numero} · {formatISO(it.parcela.dataVencimento)}
                  {it.diasAtraso > 0 && ` · ${it.diasAtraso}d atraso`}
                </div>
              </div>
              <Link to={`/emprestimos/${it.emprestimo.id}`}>
                <Botao className="py-2">{formatBRL(abertoParcela(it.parcela))}</Botao>
              </Link>
            </Cartao>
          ))
        )}
      </section>

      {/* Gráfico */}
      <Cartao className="p-3">
        <h3 className="mb-2 font-semibold">Recebimentos e lucro (6 meses)</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={serie} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip
                formatter={(v: number) =>
                  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                }
              />
              <Bar dataKey="recebido" name="Recebido" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Cartao>
    </div>
  );
}

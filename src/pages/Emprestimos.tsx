import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTudo } from '../hooks/useDados';
import { resumoEmprestimo } from '../lib/metricas';
import { formatBRL } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { ROTULO_SISTEMA } from '../lib/finance/simulador';
import {
  Cartao,
  PageHeader,
  StatusEmprestimoSelo,
  Vazio,
} from '../components/ui';
import type { StatusEmprestimo } from '../types/modelos';

type Filtro = 'ATIVOS' | 'ATRASADO' | 'QUITADO' | 'TODOS';

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'ATIVOS', rotulo: 'Ativos' },
  { chave: 'ATRASADO', rotulo: 'Atrasados' },
  { chave: 'QUITADO', rotulo: 'Quitados' },
  { chave: 'TODOS', rotulo: 'Todos' },
];

function casa(status: StatusEmprestimo, filtro: Filtro): boolean {
  if (filtro === 'TODOS') return true;
  if (filtro === 'ATIVOS') return status === 'EM_DIA' || status === 'ATRASADO';
  return status === filtro;
}

export default function Emprestimos() {
  const dados = useTudo();
  const [filtro, setFiltro] = useState<Filtro>('ATIVOS');

  const lista = useMemo(() => {
    if (!dados) return [];
    const mapaCliente = new Map(dados.clientes.map((c) => [c.id, c]));
    return dados.emprestimos
      .filter((e) => casa(e.status, filtro))
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map((e) => ({
        emp: e,
        cliente: mapaCliente.get(e.clienteId),
        resumo: resumoEmprestimo(
          e,
          dados.parcelas.filter((p) => p.emprestimoId === e.id),
        ),
      }));
  }, [dados, filtro]);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Empréstimos"
        acao={
          <Link
            to="/emprestimos/novo"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Novo
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              filtro === f.chave
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <Vazio>Nenhum empréstimo nesta lista.</Vazio>
      ) : (
        <div className="space-y-2">
          {lista.map(({ emp, cliente, resumo }) => (
            <Link key={emp.id} to={`/emprestimos/${emp.id}`}>
              <Cartao className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{cliente?.nome ?? '—'}</span>
                  <StatusEmprestimoSelo status={emp.status} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatBRL(emp.valorPrincipal)} · {ROTULO_SISTEMA[emp.sistemaCalculo]} ·{' '}
                    {formatISO(emp.dataEmprestimo)}
                  </span>
                  <span>
                    {resumo.parcelasPagas}/{resumo.parcelasTotais}
                  </span>
                </div>
                <div className="mt-1 text-xs">
                  Em aberto:{' '}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatBRL(resumo.aReceber)}
                  </span>
                </div>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

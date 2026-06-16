import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTudo } from '../hooks/useDados';
import { resumoCliente } from '../lib/agregados';
import { formatBRL } from '../lib/dinheiro';
import { Cartao, PageHeader, RiscoSelo, Vazio, inputClasse } from '../components/ui';

export default function Clientes() {
  const dados = useTudo();
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    if (!dados) return [];
    const termo = busca.trim().toLowerCase();
    return dados.clientes
      .filter(
        (c) =>
          !termo ||
          c.nome.toLowerCase().includes(termo) ||
          c.apelido?.toLowerCase().includes(termo) ||
          c.telefone?.includes(termo),
      )
      .map((c) => ({
        cliente: c,
        resumo: resumoCliente(c.id, dados.emprestimos, dados.parcelas),
      }))
      .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome));
  }, [dados, busca]);

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Clientes"
        subtitulo="Quem me deve"
        acao={
          <Link
            to="/clientes/novo"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + Novo
          </Link>
        }
      />

      <input
        placeholder="Buscar por nome, apelido ou telefone…"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className={inputClasse}
      />

      {lista.length === 0 ? (
        <Vazio>
          {busca
            ? 'Nenhum cliente encontrado.'
            : 'Nenhum cliente ainda. Toque em “+ Novo”.'}
        </Vazio>
      ) : (
        <div className="space-y-2">
          {lista.map(({ cliente, resumo }) => (
            <Link key={cliente.id} to={`/clientes/${cliente.id}`}>
              <Cartao className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{cliente.nome}</span>
                    <RiscoSelo risco={cliente.risco} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {resumo.emprestimosAtivos > 0
                      ? `${resumo.emprestimosAtivos} ativo(s) · em aberto `
                      : 'Sem empréstimos ativos'}
                    {resumo.emprestimosAtivos > 0 && (
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {formatBRL(resumo.totalEmAberto)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-slate-400">›</span>
              </Cartao>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

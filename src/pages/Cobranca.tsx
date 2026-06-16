import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTudo } from '../hooks/useDados';
import { vencimentos, type ItemVencimento } from '../lib/agregados';
import { abertoParcela } from '../lib/metricas';
import { calcularAtraso } from '../lib/atrasos';
import { hojeISO } from '../lib/id';
import { formatBRL } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { abrirWhatsApp, mensagemCobranca } from '../lib/whatsapp';
import { Botao, Cartao, PageHeader, Vazio } from '../components/ui';

export default function Cobranca() {
  const dados = useTudo();
  const hoje = hojeISO();

  const grupos = useMemo(() => {
    if (!dados) return null;
    return vencimentos(dados.emprestimos, dados.parcelas, dados.clientes, hoje);
  }, [dados, hoje]);

  if (!grupos) return <Vazio>Carregando…</Vazio>;

  return (
    <div className="space-y-5">
      <PageHeader titulo="Cobrança" subtitulo="Vencem hoje e em atraso" />

      <Grupo
        titulo={`Atrasados (${grupos.atrasadas.length})`}
        cor="text-red-600 dark:text-red-400"
        itens={grupos.atrasadas}
        hoje={hoje}
      />
      <Grupo
        titulo={`Vencem hoje (${grupos.hoje.length})`}
        cor="text-amber-600 dark:text-amber-400"
        itens={grupos.hoje}
        hoje={hoje}
      />
      <Grupo
        titulo={`Próximos 7 dias (${grupos.proximos7.length})`}
        cor="text-slate-500 dark:text-slate-400"
        itens={grupos.proximos7}
        hoje={hoje}
      />
    </div>
  );
}

function Grupo({
  titulo,
  cor,
  itens,
  hoje,
}: {
  titulo: string;
  cor: string;
  itens: ItemVencimento[];
  hoje: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className={`font-semibold ${cor}`}>{titulo}</h3>
      {itens.length === 0 ? (
        <Vazio>Nada por aqui.</Vazio>
      ) : (
        itens.map((it) => {
          const atraso = calcularAtraso(it.parcela, it.emprestimo, hoje);
          const valor = atraso.emAtraso
            ? atraso.valorAtualizado
            : abertoParcela(it.parcela);
          return (
            <Cartao key={it.parcela.id} className="p-3">
              <div className="flex items-center justify-between">
                <Link to={`/emprestimos/${it.emprestimo.id}`} className="font-semibold">
                  {it.cliente?.nome ?? '—'}
                </Link>
                <span className="font-semibold">{formatBRL(valor)}</span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Parcela #{it.parcela.numero} · vence {formatISO(it.parcela.dataVencimento)}
                {it.diasAtraso > 0 && ` · ${it.diasAtraso} dia(s) em atraso`}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Botao
                  variante="secundario"
                  className="py-2"
                  onClick={() =>
                    abrirWhatsApp(
                      mensagemCobranca({
                        cliente: it.cliente!,
                        valor,
                        vencimentoISO: it.parcela.dataVencimento,
                        diasAtraso: it.diasAtraso,
                      }),
                      it.cliente?.telefone,
                    )
                  }
                  disabled={!it.cliente}
                >
                  Cobrar no WhatsApp
                </Botao>
                <Link to={`/emprestimos/${it.emprestimo.id}`}>
                  <Botao className="w-full py-2">Receber</Botao>
                </Link>
              </div>
            </Cartao>
          );
        })
      )}
    </section>
  );
}

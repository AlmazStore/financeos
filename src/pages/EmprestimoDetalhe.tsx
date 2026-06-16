import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCliente,
  useEmprestimo,
  useParcelasDoEmprestimo,
} from '../hooks/useDados';
import {
  calcularQuitacao,
  cancelarEmprestimo,
  quitarAntecipado,
  registrarPagamento,
} from '../db/repos';
import { resumoEmprestimo, abertoParcela } from '../lib/metricas';
import { calcularAtraso } from '../lib/atrasos';
import { hojeISO } from '../lib/id';
import { formatBRL, parseValorParaCentavos } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { ROTULO_SISTEMA } from '../lib/finance/simulador';
import type { FormaPagamento, Parcela } from '../types/modelos';
import {
  Botao,
  Campo,
  Cartao,
  Indicador,
  PageHeader,
  StatusEmprestimoSelo,
  StatusParcelaSelo,
  Vazio,
  inputClasse,
} from '../components/ui';
import Modal from '../components/Modal';

const FORMAS: FormaPagamento[] = ['PIX', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO'];

export default function EmprestimoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const emp = useEmprestimo(id);
  const parcelas = useParcelasDoEmprestimo(id) ?? [];
  const cliente = useCliente(emp?.clienteId);

  const [pagando, setPagando] = useState<Parcela | null>(null);
  const [valorPag, setValorPag] = useState('');
  const [forma, setForma] = useState<FormaPagamento>('PIX');
  const [quitacao, setQuitacao] = useState<{ valor: number; comDesconto: boolean } | null>(null);

  const hoje = hojeISO();
  const resumo = useMemo(
    () => (emp ? resumoEmprestimo(emp, parcelas) : null),
    [emp, parcelas],
  );

  if (!emp) return <Vazio>Empréstimo não encontrado.</Vazio>;
  const ativo = emp.status === 'EM_DIA' || emp.status === 'ATRASADO';

  function abrirPagamento(p: Parcela) {
    const atraso = calcularAtraso(p, emp!, hoje);
    setValorPag((atraso.valorAtualizado / 100).toFixed(2).replace('.', ','));
    setForma('PIX');
    setPagando(p);
  }

  async function confirmarPagamento() {
    if (!pagando) return;
    const valor = parseValorParaCentavos(valorPag);
    if (valor <= 0) return;
    await registrarPagamento({ parcelaId: pagando.id, valor, forma });
    const p = pagando;
    setPagando(null);
    if (confirm('Pagamento registrado. Gerar recibo em PDF?')) {
      const { reciboPagamentoPDF } = await import('../lib/pdf');
      reciboPagamentoPDF({
        clienteNome: cliente?.nome ?? 'Cliente',
        valor,
        dataISO: hoje,
        forma,
        emprestimoRef: emp!.id.slice(0, 8),
        parcelaInfo: `Parcela ${p.numero} de ${emp!.numeroParcelas}`,
      });
    }
  }

  async function abrirQuitacao() {
    const q = await calcularQuitacao(emp!.id);
    setQuitacao({ valor: q.valor, comDesconto: q.comDesconto });
  }

  async function confirmarQuitacao() {
    if (!quitacao) return;
    await quitarAntecipado(emp!.id, 'PIX');
    setQuitacao(null);
  }

  async function cancelar() {
    if (!confirm('Cancelar este empréstimo? Ele sairá da carteira ativa.')) return;
    await cancelarEmprestimo(emp!.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={cliente?.nome ?? 'Empréstimo'}
        subtitulo={`${ROTULO_SISTEMA[emp.sistemaCalculo]} · ${emp.numeroParcelas}x · taxa ${emp.taxaJuros}%`}
        acao={<StatusEmprestimoSelo status={emp.status} />}
      />

      {resumo && (
        <div className="grid grid-cols-2 gap-3">
          <Indicador titulo="Principal" valor={formatBRL(emp.valorPrincipal)} />
          <Indicador titulo="Total a receber" valor={formatBRL(emp.totalAReceber)} />
          <Indicador
            titulo="Em aberto"
            valor={formatBRL(resumo.aReceber)}
            cor="text-red-600 dark:text-red-400"
          />
          <Indicador
            titulo="Recebido"
            valor={formatBRL(resumo.recebido)}
            cor="text-emerald-600 dark:text-emerald-400"
          />
          <Indicador titulo="Saldo devedor (principal)" valor={formatBRL(emp.saldoDevedor)} />
          <Indicador
            titulo="Lucro recebido"
            valor={formatBRL(resumo.jurosRecebido)}
            cor="text-emerald-600 dark:text-emerald-400"
          />
        </div>
      )}

      {ativo && (
        <div className="grid grid-cols-3 gap-2">
          <Botao onClick={abrirQuitacao}>Quitar</Botao>
          <Botao variante="secundario" onClick={() => navigate(`/emprestimos/${emp.id}/renegociar`)}>
            Renegociar
          </Botao>
          <Botao variante="secundario" className="text-red-600" onClick={cancelar}>
            Cancelar
          </Botao>
        </div>
      )}

      {/* Parcelas */}
      <section className="space-y-2">
        <h3 className="font-semibold">Parcelas</h3>
        {parcelas.map((p) => {
          const atraso = calcularAtraso(p, emp, hoje);
          const aberto = abertoParcela(p);
          return (
            <Cartao key={p.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{p.numero}</span>
                  <StatusParcelaSelo status={p.status} />
                </div>
                <span className="font-semibold">{formatBRL(p.valorParcela)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Vence {formatISO(p.dataVencimento)}</span>
                {p.valorPago > 0 && <span>Pago {formatBRL(p.valorPago)}</span>}
              </div>
              {atraso.emAtraso && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {atraso.diasAtraso} dia(s) em atraso · multa+mora{' '}
                  {formatBRL(atraso.multa + atraso.mora)} · total{' '}
                  {formatBRL(atraso.valorAtualizado)}
                </div>
              )}
              {p.status !== 'PAGA' && aberto > 0 && (
                <Botao className="mt-2 w-full py-2" onClick={() => abrirPagamento(p)}>
                  Receber
                </Botao>
              )}
            </Cartao>
          );
        })}
      </section>

      {/* Modal de pagamento */}
      <Modal titulo={`Receber parcela #${pagando?.numero ?? ''}`} aberto={!!pagando} onFechar={() => setPagando(null)}>
        <div className="space-y-3">
          <Campo rotulo="Valor recebido">
            <div className="flex items-center rounded-xl border border-slate-300 px-3 dark:border-slate-700">
              <span className="text-slate-500">R$</span>
              <input
                inputMode="decimal"
                value={valorPag}
                onChange={(e) => setValorPag(e.target.value)}
                className="w-full bg-transparent px-2 py-3 text-lg font-semibold outline-none"
              />
            </div>
          </Campo>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pagamento parcial é permitido — abate do saldo e mantém o restante pendente.
          </p>
          <Campo rotulo="Forma de pagamento">
            <select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)} className={inputClasse}>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Campo>
          <Botao className="w-full" onClick={confirmarPagamento}>
            Confirmar recebimento
          </Botao>
        </div>
      </Modal>

      {/* Modal de quitação */}
      <Modal titulo="Quitação antecipada" aberto={!!quitacao} onFechar={() => setQuitacao(null)}>
        {quitacao && (
          <div className="space-y-3">
            <p className="text-sm">
              Valor para quitar agora:{' '}
              <strong className="text-lg">{formatBRL(quitacao.valor)}</strong>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {quitacao.comDesconto
                ? 'Com desconto dos juros futuros (configurável em Ajustes).'
                : 'Sem desconto — soma das parcelas em aberto.'}
            </p>
            <Botao className="w-full" onClick={confirmarQuitacao}>
              Confirmar quitação
            </Botao>
          </div>
        )}
      </Modal>
    </div>
  );
}

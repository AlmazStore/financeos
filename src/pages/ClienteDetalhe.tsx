import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTudo } from '../hooks/useDados';
import { removerCliente } from '../db/repos';
import { resumoCliente } from '../lib/agregados';
import { abertoParcela } from '../lib/metricas';
import { formatBRL } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { abrirWhatsApp, mensagemCobranca } from '../lib/whatsapp';
import { ROTULO_SISTEMA } from '../lib/finance/simulador';
import {
  Botao,
  Cartao,
  Indicador,
  PageHeader,
  RiscoSelo,
  StatusEmprestimoSelo,
  Vazio,
} from '../components/ui';

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dados = useTudo();

  const info = useMemo(() => {
    if (!dados || !id) return null;
    const cliente = dados.clientes.find((c) => c.id === id);
    if (!cliente) return null;
    const emprestimos = dados.emprestimos
      .filter((e) => e.clienteId === id)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    const pagamentos = dados.pagamentos
      .filter((p) => emprestimos.some((e) => e.id === p.emprestimoId))
      .sort((a, b) => b.data.localeCompare(a.data));
    return {
      cliente,
      emprestimos,
      pagamentos,
      resumo: resumoCliente(id, dados.emprestimos, dados.parcelas),
    };
  }, [dados, id]);

  if (!dados) return <Vazio>Carregando…</Vazio>;
  if (!info) return <Vazio>Cliente não encontrado.</Vazio>;

  const { cliente, emprestimos, pagamentos, resumo } = info;

  function cobrar() {
    if (!info) return;
    // Pega a parcela em aberto mais antiga para compor a mensagem.
    const parcelasAbertas = dados!.parcelas
      .filter(
        (p) =>
          info.emprestimos.some(
            (e) => e.id === p.emprestimoId && (e.status === 'EM_DIA' || e.status === 'ATRASADO'),
          ) && abertoParcela(p) > 0,
      )
      .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
    const alvo = parcelasAbertas[0];
    const texto = alvo
      ? mensagemCobranca({
          cliente,
          valor: abertoParcela(alvo),
          vencimentoISO: alvo.dataVencimento,
        })
      : `Olá, ${cliente.apelido || cliente.nome}!`;
    abrirWhatsApp(texto, cliente.telefone);
  }

  async function excluir() {
    if (!confirm(`Remover o cliente ${cliente.nome}?`)) return;
    try {
      await removerCliente(cliente.id);
      navigate('/clientes');
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo={cliente.nome}
        subtitulo={cliente.apelido}
        acao={<RiscoSelo risco={cliente.risco} />}
      />

      <Cartao className="space-y-1 p-4 text-sm">
        {cliente.telefone && <div>📱 {cliente.telefone}</div>}
        {cliente.cpf && <div>CPF: {cliente.cpf}</div>}
        {cliente.endereco && <div>📍 {cliente.endereco}</div>}
        {cliente.observacoes && (
          <div className="text-slate-500 dark:text-slate-400">{cliente.observacoes}</div>
        )}
      </Cartao>

      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Total emprestado (ativo)" valor={formatBRL(resumo.totalEmprestado)} />
        <Indicador
          titulo="Em aberto"
          valor={formatBRL(resumo.totalEmAberto)}
          cor="text-red-600 dark:text-red-400"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Botao onClick={() => navigate(`/emprestimos/novo?cliente=${cliente.id}`)}>
          Emprestar
        </Botao>
        <Botao variante="secundario" onClick={cobrar}>
          WhatsApp
        </Botao>
        <Botao variante="secundario" onClick={() => navigate(`/clientes/${cliente.id}/editar`)}>
          Editar
        </Botao>
      </div>

      {/* Histórico de empréstimos */}
      <section className="space-y-2">
        <h3 className="font-semibold">Empréstimos</h3>
        {emprestimos.length === 0 ? (
          <Vazio>Nenhum empréstimo para este cliente.</Vazio>
        ) : (
          emprestimos.map((e) => (
            <Link key={e.id} to={`/emprestimos/${e.id}`}>
              <Cartao className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatBRL(e.valorPrincipal)}</span>
                    <StatusEmprestimoSelo status={e.status} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {ROTULO_SISTEMA[e.sistemaCalculo]} · {e.numeroParcelas}x ·{' '}
                    {formatISO(e.dataEmprestimo)}
                  </div>
                </div>
                <span className="text-slate-400">›</span>
              </Cartao>
            </Link>
          ))
        )}
      </section>

      {/* Histórico de pagamentos */}
      <section className="space-y-2">
        <h3 className="font-semibold">Pagamentos</h3>
        {pagamentos.length === 0 ? (
          <Vazio>Nenhum pagamento registrado.</Vazio>
        ) : (
          <Cartao className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagamentos.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  {formatISO(p.data)} · {p.forma}
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(p.valor)}
                </span>
              </div>
            ))}
          </Cartao>
        )}
      </section>

      <Botao variante="secundario" className="w-full text-red-600" onClick={excluir}>
        Remover cliente
      </Botao>
    </div>
  );
}

import { useMemo } from 'react';
import { useTudo } from '../hooks/useDados';
import { resumoCarteira } from '../lib/agregados';
import { resumoEmprestimo } from '../lib/metricas';
import { calcularAtraso } from '../lib/atrasos';
import { hojeISO } from '../lib/id';
import { formatBRL, formatPercent, centavosParaReais } from '../lib/dinheiro';
import { formatISO } from '../lib/datas';
import { ROTULO_SISTEMA } from '../lib/finance/simulador';
import { exportarCSV } from '../lib/exportar';
import { Botao, Cartao, Indicador, PageHeader, Vazio } from '../components/ui';

export default function Relatorios() {
  const dados = useTudo();
  const hoje = hojeISO();

  const calc = useMemo(() => {
    if (!dados) return null;
    const carteira = resumoCarteira(dados.emprestimos, dados.parcelas);
    const mapaCliente = new Map(dados.clientes.map((c) => [c.id, c]));

    const ativos = dados.emprestimos.filter(
      (e) => e.status === 'EM_DIA' || e.status === 'ATRASADO',
    );

    let valorAtrasado = 0;
    for (const e of ativos) {
      for (const p of dados.parcelas.filter((x) => x.emprestimoId === e.id)) {
        const a = calcularAtraso(p, e, hoje);
        if (a.emAtraso) valorAtrasado += a.valorAberto;
      }
    }
    const inadimplencia =
      carteira.aReceber > 0 ? valorAtrasado / carteira.aReceber : 0;

    const linhas = ativos.map((e) => {
      const r = resumoEmprestimo(
        e,
        dados.parcelas.filter((p) => p.emprestimoId === e.id),
      );
      return {
        cliente: mapaCliente.get(e.clienteId)?.nome ?? '—',
        emp: e,
        resumo: r,
      };
    });

    return { carteira, inadimplencia, valorAtrasado, linhas };
  }, [dados, hoje]);

  if (!calc) return <Vazio>Carregando…</Vazio>;
  const { carteira, inadimplencia, valorAtrasado, linhas } = calc;

  async function exportarPDF() {
    const { relatorioCarteiraPDF } = await import('../lib/pdf');
    relatorioCarteiraPDF({
      titulo: 'Relatório da carteira',
      resumo: [
        { rotulo: 'Capital na rua', valor: formatBRL(carteira.capitalNaRua) },
        { rotulo: 'A receber', valor: formatBRL(carteira.aReceber) },
        { rotulo: 'Já recebido', valor: formatBRL(carteira.totalRecebido) },
        { rotulo: 'Lucro (juros)', valor: formatBRL(carteira.lucro) },
        { rotulo: 'Inadimplência', valor: formatPercent(inadimplencia) },
        { rotulo: 'Empréstimos ativos', valor: String(carteira.qtdAtivos) },
      ],
      colunas: ['Cliente', 'Principal', 'Sistema', 'A receber', 'Recebido', 'Status'],
      linhas: linhas.map((l) => [
        l.cliente,
        formatBRL(l.emp.valorPrincipal),
        ROTULO_SISTEMA[l.emp.sistemaCalculo],
        formatBRL(l.resumo.aReceber),
        formatBRL(l.resumo.recebido),
        l.emp.status,
      ]),
    });
  }

  function exportarPlanilha() {
    exportarCSV(
      `carteira-${hoje}`,
      ['Cliente', 'Principal (R$)', 'Sistema', 'Data', 'A receber (R$)', 'Recebido (R$)', 'Status'],
      linhas.map((l) => [
        l.cliente,
        centavosParaReais(l.emp.valorPrincipal).toFixed(2),
        ROTULO_SISTEMA[l.emp.sistemaCalculo],
        formatISO(l.emp.dataEmprestimo),
        centavosParaReais(l.resumo.aReceber).toFixed(2),
        centavosParaReais(l.resumo.recebido).toFixed(2),
        l.emp.status,
      ]),
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo="Relatórios" subtitulo="Carteira e resultados" />

      <div className="grid grid-cols-2 gap-3">
        <Indicador titulo="Capital na rua" valor={formatBRL(carteira.capitalNaRua)} />
        <Indicador titulo="A receber" valor={formatBRL(carteira.aReceber)} />
        <Indicador
          titulo="Lucro (juros)"
          valor={formatBRL(carteira.lucro)}
          cor="text-emerald-600 dark:text-emerald-400"
        />
        <Indicador
          titulo="Inadimplência"
          valor={formatPercent(inadimplencia)}
          cor="text-red-600 dark:text-red-400"
        />
        <Indicador titulo="Em atraso" valor={formatBRL(valorAtrasado)} />
        <Indicador titulo="Ativos" valor={String(carteira.qtdAtivos)} />
      </div>

      <Cartao className="p-4">
        <h3 className="mb-2 font-semibold">Exportar</h3>
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="secundario" onClick={exportarPDF} disabled={linhas.length === 0}>
            PDF da carteira
          </Botao>
          <Botao variante="secundario" onClick={exportarPlanilha} disabled={linhas.length === 0}>
            Planilha (CSV)
          </Botao>
        </div>
      </Cartao>

      {linhas.length === 0 && <Vazio>Sem empréstimos ativos para relatar.</Vazio>}
    </div>
  );
}

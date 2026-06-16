import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBRL } from './dinheiro';
import { formatISO } from './datas';
import type { FormaPagamento } from '../types/modelos';

const ROTULO_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  TRANSFERENCIA: 'Transferência',
  OUTRO: 'Outro',
};

/** Gera e baixa um recibo de pagamento em PDF. */
export function reciboPagamentoPDF(opts: {
  clienteNome: string;
  valor: number; // centavos
  dataISO: string;
  forma: FormaPagamento;
  emprestimoRef: string;
  parcelaInfo?: string; // ex.: "Parcela 2 de 4"
  saldoRestante?: number;
}) {
  const doc = new jsPDF();
  const m = 18;
  let y = 22;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', m, y);
  y += 6;
  doc.setDrawColor(200);
  doc.line(m, y, 192, y);
  y += 12;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const valorTxt = formatBRL(opts.valor);
  const linhas = [
    `Recebi de ${opts.clienteNome} a importância de ${valorTxt},`,
    `referente ao empréstimo ${opts.emprestimoRef}` +
      (opts.parcelaInfo ? ` (${opts.parcelaInfo}).` : '.'),
  ];
  for (const l of linhas) {
    const wrapped = doc.splitTextToSize(l, 174);
    doc.text(wrapped, m, y);
    y += wrapped.length * 7;
  }
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Valor: ${valorTxt}`, m, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${formatISO(opts.dataISO)}`, m, y);
  y += 7;
  doc.text(`Forma de pagamento: ${ROTULO_FORMA[opts.forma]}`, m, y);
  y += 7;
  if (opts.saldoRestante !== undefined) {
    doc.text(`Saldo restante: ${formatBRL(opts.saldoRestante)}`, m, y);
    y += 7;
  }

  y += 24;
  doc.line(m, y, 110, y);
  y += 6;
  doc.text('Assinatura do credor', m, y);

  doc.save(`recibo-${opts.dataISO}.pdf`);
}

/** Relatório de carteira em PDF (resumo + tabela de empréstimos). */
export function relatorioCarteiraPDF(opts: {
  resumo: { rotulo: string; valor: string }[];
  colunas: string[];
  linhas: (string | number)[][];
  titulo?: string;
}) {
  const doc = new jsPDF();
  const m = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.titulo ?? 'Relatório da carteira', m, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  for (const item of opts.resumo) {
    doc.text(`${item.rotulo}: ${item.valor}`, m, y);
    y += 5;
  }
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [opts.colunas],
    body: opts.linhas.map((l) => l.map(String)),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  const data = new Date().toISOString().slice(0, 10);
  doc.save(`relatorio-carteira-${data}.pdf`);
}

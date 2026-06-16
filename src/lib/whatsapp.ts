import type { Cliente } from '../types/modelos';
import { formatBRL } from './dinheiro';
import { formatISO } from './datas';

/** Normaliza o telefone para o formato wa.me: só dígitos, com DDI 55. */
export function normalizarTelefone(tel?: string): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, '');
  if (d.length < 10) return null;
  if (!d.startsWith('55')) d = '55' + d;
  return d;
}

/** Abre o WhatsApp com a mensagem pré-pronta (ou o compositor, se sem telefone). */
export function abrirWhatsApp(texto: string, telefone?: string) {
  const num = normalizarTelefone(telefone);
  const base = num
    ? `https://wa.me/${num}`
    : 'https://api.whatsapp.com/send';
  const url = `${base}?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}

export function mensagemCobranca(opts: {
  cliente: Cliente;
  valor: number; // centavos
  vencimentoISO: string;
  diasAtraso?: number;
}): string {
  const { cliente, valor, vencimentoISO, diasAtraso } = opts;
  const nome = cliente.apelido || cliente.nome.split(' ')[0];
  if (diasAtraso && diasAtraso > 0) {
    return (
      `Olá, ${nome}! Passando para lembrar da parcela de ${formatBRL(valor)} ` +
      `que venceu em ${formatISO(vencimentoISO)} (${diasAtraso} dia(s) em atraso). ` +
      `Pode acertar hoje? Obrigado!`
    );
  }
  return (
    `Olá, ${nome}! Lembrando que sua parcela de ${formatBRL(valor)} ` +
    `vence em ${formatISO(vencimentoISO)}. Qualquer dúvida, é só chamar. Obrigado!`
  );
}

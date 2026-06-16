/**
 * MODELO DE DADOS (seção 5)
 *
 * Convenções:
 *  - Todo valor em dinheiro é CENTAVOS INTEIROS (ex.: R$ 1.000,00 => 100000).
 *  - Datas são ISO string "YYYY-MM-DD" para persistência simples e ordenável.
 *  - IDs são strings (uuid). Campos opcionais marcados com `?`.
 */

export type ISODate = string; // "2026-06-16"
export type ID = string;

/* ───────────────────────── Enums / domínios ───────────────────────── */

export type SistemaCalculo =
  | 'JUROS_SIMPLES'
  | 'PRICE'
  | 'SAC'
  | 'SO_JUROS'; // rotativo (só juros)

export type Periodicidade = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';

export type StatusEmprestimo =
  | 'EM_DIA'
  | 'ATRASADO'
  | 'QUITADO'
  | 'RENEGOCIADO'
  | 'CANCELADO';

export type StatusParcela = 'PENDENTE' | 'PAGA' | 'PARCIAL' | 'ATRASADA';

export type RiscoCliente = 'BOM' | 'REGULAR' | 'ATENCAO';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'TRANSFERENCIA' | 'OUTRO';

export type TipoMovimento = 'SAIDA' | 'ENTRADA';

/* ───────────────────────── Cliente (Devedor) ───────────────────────── */

export interface Cliente {
  id: ID;
  nome: string;
  apelido?: string;
  telefone?: string; // WhatsApp, só dígitos: "5511999998888"
  cpf?: string;
  endereco?: string;
  foto?: string; // dataURL ou referência no storage
  risco: RiscoCliente; // calculado pelo histórico
  observacoes?: string;
  criadoEm: ISODate;
}

/* ───────────────────────── Empréstimo ───────────────────────── */

export interface Emprestimo {
  id: ID;
  clienteId: ID;

  valorPrincipal: number; // capital emprestado (centavos)
  taxaJuros: number; // taxa em % por período (ex.: 10 = 10%)
  periodicidadeTaxa: Periodicidade; // a que período a taxa se refere
  sistemaCalculo: SistemaCalculo;
  numeroParcelas: number;
  frequenciaPagamento: Periodicidade;

  dataEmprestimo: ISODate;
  dataPrimeiraParcela: ISODate;

  multaAtraso: number; // % fixo sobre o valor em atraso
  jurosMoraDia: number; // % ao dia sobre o valor em atraso

  status: StatusEmprestimo;

  // Totais calculados e congelados no momento da criação
  totalAReceber: number; // centavos
  totalJuros: number; // centavos
  saldoDevedor: number; // centavos (atualizado conforme pagamentos)

  observacoes?: string;
  comprovante?: string; // foto/PDF do contrato

  // Vínculo de renegociação (regra 7): novo empréstimo gerado do saldo de outro
  emprestimoOrigemId?: ID;

  criadoEm: ISODate;
}

/* ───────────────────────── Parcela ───────────────────────── */

export interface Parcela {
  id: ID;
  emprestimoId: ID;
  numero: number;

  dataVencimento: ISODate;

  valorParcela: number; // centavos
  valorJuros: number; // centavos
  valorAmortizacao: number; // centavos
  saldoApos: number; // saldo devedor após esta parcela (centavos)

  valorPago: number; // centavos acumulados pagos nesta parcela
  dataPagamento?: ISODate;

  multaAplicada: number; // centavos
  moraAplicada: number; // centavos

  status: StatusParcela;
}

/* ───────────────────────── Pagamento (Recebimento) ───────────────────────── */

export interface Pagamento {
  id: ID;
  emprestimoId: ID;
  parcelaId?: ID; // pode ser pagamento avulso do empréstimo
  valor: number; // centavos
  data: ISODate;
  forma: FormaPagamento;
  reciboGerado: boolean;
  observacao?: string;
}

/* ───────────────────────── Movimento de Caixa ───────────────────────── */

export interface MovimentoCaixa {
  id: ID;
  tipo: TipoMovimento; // SAIDA = emprestou | ENTRADA = recebeu
  valor: number; // centavos
  data: ISODate;
  referenciaTipo: 'EMPRESTIMO' | 'PAGAMENTO' | 'AJUSTE';
  referenciaId?: ID;
  descricao?: string;
}

/* ───────────────────────── Configurações ───────────────────────── */

export interface Configuracoes {
  id: 'config';
  limiteTaxaPercent?: number; // aviso de conformidade (seção 12)
  descontoQuitacaoAntecipada: boolean; // abate juros futuros na quitação?
  bloqueioInatividadeMin: number; // minutos até bloquear o app
  temaEscuro: boolean;
}

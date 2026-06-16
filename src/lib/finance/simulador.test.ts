import { describe, it, expect } from 'vitest';
import { simular, type ParametrosSimulacao } from './simulador';

/**
 * Testes da seção 6.2 — Empréstimo de R$ 1.000, 10% ao mês, 4 parcelas mensais.
 * Todos os valores em CENTAVOS inteiros.
 */

const base: Omit<ParametrosSimulacao, 'sistema'> = {
  principal: 100_000, // R$ 1.000,00
  taxaPercent: 10,
  numParcelas: 4,
  frequencia: 'MENSAL',
  dataEmprestimo: new Date(2026, 0, 1), // 01/01/2026
  dataPrimeiraParcela: new Date(2026, 1, 1), // 01/02/2026
};

describe('6.2 — Juros Simples', () => {
  const r = simular({ ...base, sistema: 'JUROS_SIMPLES' });

  it('montante de R$ 1.400 em 4x de R$ 350', () => {
    expect(r.totalAReceber).toBe(140_000);
    expect(r.parcelaFixa).toBe(35_000);
    r.parcelas.forEach((p) => expect(p.parcela).toBe(35_000));
  });

  it('total de juros de R$ 400', () => {
    expect(r.totalJuros).toBe(40_000);
  });

  it('saldo final fecha em zero', () => {
    expect(r.parcelas.at(-1)!.saldo).toBe(0);
  });
});

describe('6.2 — Tabela Price', () => {
  const r = simular({ ...base, sistema: 'PRICE' });

  it('parcela de R$ 315,47', () => {
    expect(r.parcelaFixa).toBe(31_547);
  });

  it('total a receber de R$ 1.261,88', () => {
    expect(r.totalAReceber).toBe(126_188);
    expect(r.totalJuros).toBe(26_188);
  });

  it('tabela de amortização correta', () => {
    const saldos = r.parcelas.map((p) => p.saldo);
    expect(saldos).toEqual([78_453, 54_751, 28_679, 0]);
    const juros = r.parcelas.map((p) => p.juros);
    expect(juros).toEqual([10_000, 7_845, 5_475, 2_868]);
  });

  it('soma das amortizações = principal exato', () => {
    const somaAmort = r.parcelas.reduce((s, p) => s + p.amortizacao, 0);
    expect(somaAmort).toBe(100_000);
  });
});

describe('6.2 — SAC', () => {
  const r = simular({ ...base, sistema: 'SAC' });

  it('amortização constante de R$ 250 e parcelas decrescentes 350/325/300/275', () => {
    expect(r.parcelas.map((p) => p.amortizacao)).toEqual([
      25_000, 25_000, 25_000, 25_000,
    ]);
    expect(r.parcelas.map((p) => p.parcela)).toEqual([
      35_000, 32_500, 30_000, 27_500,
    ]);
  });

  it('parcela variável (não fixa) e total de juros R$ 250', () => {
    expect(r.parcelaFixa).toBeNull();
    expect(r.totalJuros).toBe(25_000);
    expect(r.totalAReceber).toBe(125_000);
  });

  it('saldo final fecha em zero', () => {
    expect(r.parcelas.at(-1)!.saldo).toBe(0);
  });
});

describe('6.2 — Só Juros (rotativo)', () => {
  const r = simular({ ...base, sistema: 'SO_JUROS' });

  it('R$ 100/mês de juros, principal aberto', () => {
    r.parcelas.forEach((p) => {
      expect(p.parcela).toBe(10_000);
      expect(p.amortizacao).toBe(0);
      expect(p.saldo).toBe(100_000); // principal não reduz
    });
  });

  it('quitação após 4 períodos: principal + juros = R$ 1.400', () => {
    expect(r.totalAReceber).toBe(140_000);
  });
});

describe('Integridade de arredondamento (regra 8.2)', () => {
  // Caso que gera dízimas: R$ 1.000, 3 parcelas, Price.
  const r = simular({
    ...base,
    sistema: 'PRICE',
    numParcelas: 3,
  });

  it('saldo fecha exatamente em zero mesmo com sobra de centavos', () => {
    expect(r.parcelas.at(-1)!.saldo).toBe(0);
  });

  it('soma das amortizações = principal exato', () => {
    const somaAmort = r.parcelas.reduce((s, p) => s + p.amortizacao, 0);
    expect(somaAmort).toBe(100_000);
  });

  it('soma das parcelas = total a receber', () => {
    const soma = r.parcelas.reduce((s, p) => s + p.parcela, 0);
    expect(soma).toBe(r.totalAReceber);
  });
});

describe('Taxa efetiva / CET', () => {
  it('Price: TIR por período ≈ taxa nominal (10%)', () => {
    const r = simular({ ...base, sistema: 'PRICE' });
    expect(r.taxaEfetivaPeriodo).toBeCloseTo(0.1, 3);
    // CET anual ≈ (1,10)^12 - 1 ≈ 213,8%
    expect(r.cetAnual).toBeCloseTo(2.138, 2);
  });
});

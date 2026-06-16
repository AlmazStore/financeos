import { useMemo, useState } from 'react';
import {
  ROTULO_SISTEMA,
  simular,
  type ResultadoSimulacao,
} from '../lib/finance/simulador';
import type { Periodicidade, SistemaCalculo } from '../types/modelos';
import { parseValorParaCentavos } from '../lib/dinheiro';
import { converterTaxa } from '../lib/taxa';
import { paraInputDate } from '../lib/datas';
import { Campo, ROTULO_FREQUENCIA, SelectFreq, inputClasse } from './ui';

const SISTEMAS: SistemaCalculo[] = ['JUROS_SIMPLES', 'PRICE', 'SAC', 'SO_JUROS'];

export interface DadosSimulador {
  principal: number;
  taxaInformada: number;
  periodoTaxa: Periodicidade;
  numParcelas: number;
  sistema: SistemaCalculo;
  frequencia: Periodicidade;
  dataEmprestimoISO: string;
  dataPrimeiraISO?: string;
}

export interface InicialSimulador {
  valorTexto?: string;
  taxaTexto?: string;
  periodoTaxa?: Periodicidade;
  numParcelas?: string;
  frequencia?: Periodicidade;
  sistema?: SistemaCalculo;
}

/**
 * Hook reutilizável com o formulário do simulador.
 * Retorna o JSX dos campos, os dados crus e o resultado calculado ao vivo.
 */
export function useSimuladorForm(inicial?: InicialSimulador) {
  const [valorTexto, setValorTexto] = useState(inicial?.valorTexto ?? '1.000,00');
  const [taxaTexto, setTaxaTexto] = useState(inicial?.taxaTexto ?? '10');
  const [periodoTaxa, setPeriodoTaxa] = useState<Periodicidade>(
    inicial?.periodoTaxa ?? 'MENSAL',
  );
  const [numParcelas, setNumParcelas] = useState(inicial?.numParcelas ?? '4');
  const [frequencia, setFrequencia] = useState<Periodicidade>(
    inicial?.frequencia ?? 'MENSAL',
  );
  const [sistema, setSistema] = useState<SistemaCalculo>(
    inicial?.sistema ?? 'PRICE',
  );
  const [dataEmprestimo, setDataEmprestimo] = useState(paraInputDate(new Date()));
  const [dataPrimeira, setDataPrimeira] = useState('');

  const principal = parseValorParaCentavos(valorTexto);
  const taxaInformada = Number(taxaTexto.replace(',', '.')) || 0;
  const n = Math.max(0, Math.floor(Number(numParcelas) || 0));
  const taxaPorParcela = converterTaxa(taxaInformada, periodoTaxa, frequencia);

  const resultado: ResultadoSimulacao | null = useMemo(() => {
    if (principal <= 0 || n <= 0) return null;
    try {
      return simular({
        principal,
        taxaPercent: taxaPorParcela,
        numParcelas: n,
        sistema,
        frequencia,
        dataEmprestimo: new Date(dataEmprestimo + 'T00:00:00'),
        dataPrimeiraParcela: dataPrimeira
          ? new Date(dataPrimeira + 'T00:00:00')
          : undefined,
      });
    } catch {
      return null;
    }
  }, [principal, taxaPorParcela, n, sistema, frequencia, dataEmprestimo, dataPrimeira]);

  const dados: DadosSimulador = {
    principal,
    taxaInformada,
    periodoTaxa,
    numParcelas: n,
    sistema,
    frequencia,
    dataEmprestimoISO: dataEmprestimo,
    dataPrimeiraISO: dataPrimeira || undefined,
  };

  const node = (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Campo rotulo="Valor emprestado">
        <div className="flex items-center rounded-xl border border-slate-300 px-3 dark:border-slate-700">
          <span className="text-slate-500">R$</span>
          <input
            inputMode="decimal"
            value={valorTexto}
            onChange={(e) => setValorTexto(e.target.value)}
            className="w-full bg-transparent px-2 py-3 text-lg font-semibold outline-none"
          />
        </div>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Taxa de juros (%)">
          <input
            inputMode="decimal"
            value={taxaTexto}
            onChange={(e) => setTaxaTexto(e.target.value)}
            className={inputClasse}
          />
        </Campo>
        <Campo rotulo="Período da taxa">
          <SelectFreq valor={periodoTaxa} onChange={setPeriodoTaxa} />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Nº de parcelas">
          <input
            inputMode="numeric"
            value={numParcelas}
            onChange={(e) => setNumParcelas(e.target.value)}
            className={inputClasse}
          />
        </Campo>
        <Campo rotulo="Frequência de pagamento">
          <SelectFreq valor={frequencia} onChange={setFrequencia} />
        </Campo>
      </div>

      <Campo rotulo="Sistema de cálculo">
        <div className="grid grid-cols-2 gap-2">
          {SISTEMAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSistema(s)}
              className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                sistema === s
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {ROTULO_SISTEMA[s]}
            </button>
          ))}
        </div>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data do empréstimo">
          <input
            type="date"
            value={dataEmprestimo}
            onChange={(e) => setDataEmprestimo(e.target.value)}
            className={inputClasse}
          />
        </Campo>
        <Campo rotulo="1ª parcela (opcional)">
          <input
            type="date"
            value={dataPrimeira}
            onChange={(e) => setDataPrimeira(e.target.value)}
            className={inputClasse}
          />
        </Campo>
      </div>

      {periodoTaxa !== frequencia && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Taxa convertida para a parcela:{' '}
          <strong>{taxaPorParcela.toFixed(4)}%</strong> por{' '}
          {ROTULO_FREQUENCIA[frequencia].toLowerCase()} (proporcional por dias).
        </p>
      )}
    </section>
  );

  return { node, dados, resultado };
}

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { criarEmprestimo } from '../db/repos';
import { useConfig } from '../hooks/useConfig';
import { useSimuladorForm } from '../components/useSimuladorForm';
import ResultadoView from '../components/ResultadoView';
import { Botao, Campo, PageHeader, Vazio, inputClasse } from '../components/ui';

export default function NovoEmprestimo() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = useConfig();
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray()) ?? [];

  const [clienteId, setClienteId] = useState(params.get('cliente') ?? '');
  const [multa, setMulta] = useState('2');
  const [mora, setMora] = useState('0,33');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { node, dados, resultado } = useSimuladorForm();

  const acimaDoLimite =
    config.limiteTaxaPercent !== undefined &&
    dados.taxaInformada > config.limiteTaxaPercent;

  async function salvar() {
    if (!clienteId || !resultado) return;
    setSalvando(true);
    try {
      const id = await criarEmprestimo({
        clienteId,
        principal: dados.principal,
        taxaPercent: dados.taxaInformada,
        periodicidadeTaxa: dados.periodoTaxa,
        sistema: dados.sistema,
        numeroParcelas: dados.numParcelas,
        frequencia: dados.frequencia,
        dataEmprestimoISO: dados.dataEmprestimoISO,
        dataPrimeiraParcelaISO: dados.dataPrimeiraISO,
        multaAtraso: Number(multa.replace(',', '.')) || 0,
        jurosMoraDia: Number(mora.replace(',', '.')) || 0,
        observacoes: observacoes.trim() || undefined,
      });
      navigate(`/emprestimos/${id}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader titulo="Novo empréstimo" subtitulo="Simule e salve para gerar as parcelas." />

      {clientes.length === 0 ? (
        <Vazio>
          Cadastre um cliente primeiro.{' '}
          <Link to="/clientes/novo" className="font-semibold text-emerald-600">
            Novo cliente
          </Link>
        </Vazio>
      ) : (
        <Campo rotulo="Cliente *">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className={inputClasse}
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
                {c.apelido ? ` (${c.apelido})` : ''}
              </option>
            ))}
          </select>
        </Campo>
      )}

      {node}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Multa por atraso (%)">
          <input
            inputMode="decimal"
            value={multa}
            onChange={(e) => setMulta(e.target.value)}
            className={inputClasse}
          />
        </Campo>
        <Campo rotulo="Juros de mora (% ao dia)">
          <input
            inputMode="decimal"
            value={mora}
            onChange={(e) => setMora(e.target.value)}
            className={inputClasse}
          />
        </Campo>
      </div>
      <Campo rotulo="Observações">
        <textarea
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className={inputClasse}
        />
      </Campo>

      {acimaDoLimite && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          ⚠️ A taxa informada ({dados.taxaInformada}%) está acima do limite
          configurado ({config.limiteTaxaPercent}%). Verifique a legislação aplicável.
        </p>
      )}

      {resultado ? (
        <ResultadoView r={resultado} />
      ) : (
        <Vazio>Preencha os parâmetros para ver a simulação.</Vazio>
      )}

      <Botao
        className="w-full"
        onClick={salvar}
        disabled={!clienteId || !resultado || salvando}
      >
        {salvando ? 'Salvando…' : 'Salvar empréstimo'}
      </Botao>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { renegociarEmprestimo, sugestaoSaldoRenegociacao } from '../db/repos';
import { useSimuladorForm } from '../components/useSimuladorForm';
import ResultadoView from '../components/ResultadoView';
import { Botao, Campo, PageHeader, Vazio, inputClasse } from '../components/ui';
import { formatBRL } from '../lib/dinheiro';
import type { Emprestimo } from '../types/modelos';

export default function Renegociar() {
  const { id } = useParams();
  const [origem, setOrigem] = useState<Emprestimo | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const emp = await db.emprestimos.get(id);
      setOrigem(emp ?? null);
      setSaldo(await sugestaoSaldoRenegociacao(id));
    })();
  }, [id]);

  if (!origem || saldo === null) return <Vazio>Carregando…</Vazio>;
  return <Formulario origem={origem} saldoSugerido={saldo} />;
}

function Formulario({
  origem,
  saldoSugerido,
}: {
  origem: Emprestimo;
  saldoSugerido: number;
}) {
  const navigate = useNavigate();
  const [multa, setMulta] = useState(String(origem.multaAtraso).replace('.', ','));
  const [mora, setMora] = useState(String(origem.jurosMoraDia).replace('.', ','));
  const [salvando, setSalvando] = useState(false);

  const { node, dados, resultado } = useSimuladorForm({
    valorTexto: (saldoSugerido / 100).toFixed(2).replace('.', ','),
    taxaTexto: String(origem.taxaJuros).replace('.', ','),
    periodoTaxa: origem.periodicidadeTaxa,
    frequencia: origem.frequenciaPagamento,
    sistema: origem.sistemaCalculo,
    numParcelas: String(origem.numeroParcelas),
  });

  async function salvar() {
    if (!resultado) return;
    setSalvando(true);
    try {
      const novo = await renegociarEmprestimo({
        emprestimoOrigemId: origem.id,
        novoPrincipal: dados.principal,
        taxaPercent: dados.taxaInformada,
        periodicidadeTaxa: dados.periodoTaxa,
        sistema: dados.sistema,
        numeroParcelas: dados.numParcelas,
        frequencia: dados.frequencia,
        dataEmprestimoISO: dados.dataEmprestimoISO,
        dataPrimeiraParcelaISO: dados.dataPrimeiraISO,
        multaAtraso: Number(multa.replace(',', '.')) || 0,
        jurosMoraDia: Number(mora.replace(',', '.')) || 0,
      });
      navigate(`/emprestimos/${novo}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Renegociar"
        subtitulo="Gera um novo empréstimo a partir do saldo, mantendo o vínculo."
      />
      <p className="rounded-xl bg-slate-200 p-3 text-sm dark:bg-slate-800">
        Saldo sugerido do empréstimo original:{' '}
        <strong>{formatBRL(saldoSugerido)}</strong>. O original ficará marcado como
        <em> renegociado</em>.
      </p>

      {node}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Multa por atraso (%)">
          <input inputMode="decimal" value={multa} onChange={(e) => setMulta(e.target.value)} className={inputClasse} />
        </Campo>
        <Campo rotulo="Juros de mora (% ao dia)">
          <input inputMode="decimal" value={mora} onChange={(e) => setMora(e.target.value)} className={inputClasse} />
        </Campo>
      </div>

      {resultado ? <ResultadoView r={resultado} /> : <Vazio>Preencha os parâmetros.</Vazio>}

      <Botao className="w-full" onClick={salvar} disabled={!resultado || salvando}>
        {salvando ? 'Salvando…' : 'Confirmar renegociação'}
      </Botao>
    </div>
  );
}

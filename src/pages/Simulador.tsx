import { useNavigate } from 'react-router-dom';
import { useSimuladorForm } from '../components/useSimuladorForm';
import ResultadoView from '../components/ResultadoView';
import { ROTULO_SISTEMA } from '../lib/finance/simulador';
import { Botao, PageHeader, ROTULO_FREQUENCIA, Vazio } from '../components/ui';
import { formatBRL } from '../lib/dinheiro';
import { abrirWhatsApp } from '../lib/whatsapp';

export default function Simulador() {
  const { node, dados, resultado } = useSimuladorForm();
  const navigate = useNavigate();

  function compartilhar() {
    if (!resultado) return;
    const linhas = [
      '*Simulação de empréstimo*',
      `Valor: ${formatBRL(dados.principal)}`,
      `Taxa: ${dados.taxaInformada}% (${ROTULO_FREQUENCIA[dados.periodoTaxa].toLowerCase()})`,
      `Sistema: ${ROTULO_SISTEMA[dados.sistema]}`,
      `Parcelas: ${dados.numParcelas}x (${ROTULO_FREQUENCIA[dados.frequencia].toLowerCase()})`,
      resultado.parcelaFixa
        ? `Valor da parcela: ${formatBRL(resultado.parcelaFixa)}`
        : 'Parcelas decrescentes (SAC)',
      `Total de juros: ${formatBRL(resultado.totalJuros)}`,
      `Total a receber: ${formatBRL(resultado.totalAReceber)}`,
    ];
    abrirWhatsApp(linhas.join('\n'));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Simulador"
        subtitulo="Digite os parâmetros — o cálculo é instantâneo."
      />
      {node}

      {resultado ? (
        <>
          <ResultadoView r={resultado} />
          <div className="grid grid-cols-2 gap-3">
            <Botao variante="secundario" onClick={compartilhar}>
              Compartilhar
            </Botao>
            <Botao onClick={() => navigate('/emprestimos/novo')}>
              Salvar empréstimo
            </Botao>
          </div>
        </>
      ) : (
        <Vazio>Preencha valor, taxa e parcelas para ver o resultado.</Vazio>
      )}
    </div>
  );
}

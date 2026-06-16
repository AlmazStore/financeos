import { useRef, useState } from 'react';
import { db } from '../db/db';
import { useConfig } from '../hooks/useConfig';
import { exportarBackup, importarBackup } from '../lib/exportar';
import { jaTemDados, limparTudo, seedDemo } from '../db/seed';
import { definirPIN, removerPIN, temPIN } from '../security/pin';
import { Botao, Campo, Cartao, PageHeader, inputClasse } from '../components/ui';

export default function Configuracoes() {
  const config = useConfig();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');

  function aviso(texto: string) {
    setMsg(texto);
    setTimeout(() => setMsg(''), 3000);
  }

  async function setLimite(valor: string) {
    const n = Number(valor.replace(',', '.'));
    await db.config.update('config', {
      limiteTaxaPercent: valor.trim() === '' || Number.isNaN(n) ? undefined : n,
    });
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!confirm('Importar substitui TODOS os dados atuais. Continuar?')) return;
    try {
      await importarBackup(f);
      aviso('Backup importado com sucesso.');
    } catch (err) {
      aviso('Falha: ' + (err as Error).message);
    }
  }

  async function carregarExemplos() {
    if (await jaTemDados()) {
      if (!confirm('Já existem dados. Limpar tudo e recriar os exemplos?')) return;
      await limparTudo();
    }
    await seedDemo();
    aviso('Dados de exemplo carregados.');
  }

  async function limparDados() {
    if (!confirm('Apagar TODOS os clientes, empréstimos e pagamentos?')) return;
    await limparTudo();
    aviso('Todos os dados foram apagados.');
  }

  function salvarPIN() {
    if (pin.length < 4) {
      aviso('Use ao menos 4 dígitos.');
      return;
    }
    definirPIN(pin);
    setPin('');
    aviso('PIN definido. Será pedido ao abrir o app.');
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo="Ajustes" subtitulo="Configurações, segurança e backup" />

      {msg && (
        <div className="rounded-xl bg-emerald-100 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {msg}
        </div>
      )}

      <Cartao className="space-y-4 p-4">
        <h3 className="font-semibold">Operação</h3>
        <Campo rotulo="Limite de taxa (% — aviso de conformidade)">
          <input
            inputMode="decimal"
            defaultValue={config.limiteTaxaPercent ?? ''}
            onBlur={(e) => setLimite(e.target.value)}
            placeholder="ex.: 20"
            className={inputClasse}
          />
        </Campo>
        <label className="flex items-center justify-between">
          <span className="text-sm">Desconto de juros futuros na quitação antecipada</span>
          <input
            type="checkbox"
            checked={config.descontoQuitacaoAntecipada}
            onChange={(e) =>
              db.config.update('config', { descontoQuitacaoAntecipada: e.target.checked })
            }
            className="h-5 w-5"
          />
        </label>
        <Campo rotulo="Bloquear app após inatividade (minutos)">
          <input
            inputMode="numeric"
            defaultValue={config.bloqueioInatividadeMin}
            onBlur={(e) =>
              db.config.update('config', {
                bloqueioInatividadeMin: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className={inputClasse}
          />
        </Campo>
      </Cartao>

      <Cartao className="space-y-3 p-4">
        <h3 className="font-semibold">Segurança</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {temPIN()
            ? 'Um PIN está ativo. Ele é pedido ao abrir o app.'
            : 'Defina um PIN para proteger os dados financeiros.'}
        </p>
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Novo PIN"
            className={inputClasse}
          />
          <Botao onClick={salvarPIN}>Definir</Botao>
        </div>
        {temPIN() && (
          <Botao
            variante="secundario"
            className="w-full text-red-600"
            onClick={() => {
              removerPIN();
              aviso('PIN removido.');
            }}
          >
            Remover PIN
          </Botao>
        )}
      </Cartao>

      <Cartao className="space-y-3 p-4">
        <h3 className="font-semibold">Backup dos dados</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tudo fica no seu dispositivo. Exporte regularmente para não perder dados.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Botao onClick={() => exportarBackup()}>Exportar backup</Botao>
          <Botao variante="secundario" onClick={() => arquivoRef.current?.click()}>
            Importar backup
          </Botao>
        </div>
        <input
          ref={arquivoRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={importar}
        />
      </Cartao>

      <Cartao className="space-y-3 p-4">
        <h3 className="font-semibold">Dados de exemplo</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cria clientes e empréstimos de demonstração (em dia, atrasado, quitado)
          para você testar o app. Use “Limpar” quando for começar de verdade.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Botao onClick={carregarExemplos}>Carregar exemplos</Botao>
          <Botao variante="secundario" className="text-red-600" onClick={limparDados}>
            Limpar dados
          </Botao>
        </div>
      </Cartao>
    </div>
  );
}

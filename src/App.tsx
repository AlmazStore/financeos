import { Suspense, lazy, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Lock from './security/Lock';
import { temPIN } from './security/pin';
import { atualizarAtrasos } from './db/repos';
import { db } from './db/db';
import { seedDemo } from './db/seed';
import { useConfig } from './hooks/useConfig';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clientes = lazy(() => import('./pages/Clientes'));
const ClienteForm = lazy(() => import('./pages/ClienteForm'));
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'));
const Emprestimos = lazy(() => import('./pages/Emprestimos'));
const NovoEmprestimo = lazy(() => import('./pages/NovoEmprestimo'));
const EmprestimoDetalhe = lazy(() => import('./pages/EmprestimoDetalhe'));
const Renegociar = lazy(() => import('./pages/Renegociar'));
const Cobranca = lazy(() => import('./pages/Cobranca'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Simulador = lazy(() => import('./pages/Simulador'));
const TesteValidacao = lazy(() => import('./pages/TesteValidacao'));
const Mais = lazy(() => import('./pages/Mais'));

// Trava síncrona: garante que a inicialização (e o seed) rode UMA vez só,
// mesmo com o duplo-disparo de efeitos do StrictMode em desenvolvimento.
let inicializou = false;

function useTema() {
  const [escuro, setEscuro] = useState<boolean>(() => {
    const salvo = localStorage.getItem('tema');
    if (salvo) return salvo === 'escuro';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', escuro);
    localStorage.setItem('tema', escuro ? 'escuro' : 'claro');
  }, [escuro]);
  return { escuro, alternar: () => setEscuro((v) => !v) };
}

const ITENS_NAV = [
  { para: '/', rotulo: 'Início', icone: '🏠', exato: true },
  { para: '/clientes', rotulo: 'Clientes', icone: '👥', exato: false },
  { para: '/emprestimos', rotulo: 'Empréstimos', icone: '💵', exato: false },
  { para: '/cobranca', rotulo: 'Cobrança', icone: '🔔', exato: false },
  { para: '/mais', rotulo: 'Mais', icone: '☰', exato: false },
];

export default function App() {
  const { escuro, alternar } = useTema();
  const config = useConfig();
  const [bloqueado, setBloqueado] = useState(() => temPIN());

  // Na 1ª abertura: carrega dados de demonstração (some quando o usuário
  // limpa os dados em Ajustes). Depois roda a varredura de atrasos.
  useEffect(() => {
    if (inicializou) return;
    inicializou = true;
    (async () => {
      if (!localStorage.getItem('cc-init')) {
        if ((await db.clientes.count()) === 0) {
          await seedDemo();
          localStorage.setItem('cc-demo', '1');
        }
        localStorage.setItem('cc-init', '1');
      }
      await atualizarAtrasos();
    })();
  }, []);

  // Bloqueio automático por inatividade.
  useEffect(() => {
    if (!temPIN() || bloqueado) return;
    const min = config.bloqueioInatividadeMin;
    if (!min || min <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setBloqueado(true), min * 60_000);
    };
    const eventos: (keyof WindowEventMap)[] = ['pointerdown', 'keydown'];
    eventos.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      eventos.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [config.bloqueioInatividadeMin, bloqueado]);

  if (bloqueado) return <Lock onDesbloquear={() => setBloqueado(false)} />;

  return (
    <div className="min-h-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div>
            <h1 className="text-base font-bold leading-tight">Crédito Control</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Controle de empréstimos
            </p>
          </div>
          <button
            onClick={alternar}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            aria-label="Alternar tema"
          >
            {escuro ? '☀️' : '🌙'}
          </button>
        </header>

        <main className="flex-1 px-4 pb-24 pt-4">
          <Suspense
            fallback={
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Carregando…
              </div>
            }
          >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/novo" element={<ClienteForm />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/clientes/:id/editar" element={<ClienteForm />} />
            <Route path="/emprestimos" element={<Emprestimos />} />
            <Route path="/emprestimos/novo" element={<NovoEmprestimo />} />
            <Route path="/emprestimos/:id" element={<EmprestimoDetalhe />} />
            <Route path="/emprestimos/:id/renegociar" element={<Renegociar />} />
            <Route path="/cobranca" element={<Cobranca />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/config" element={<Configuracoes />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/teste" element={<TesteValidacao />} />
            <Route path="/mais" element={<Mais />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="grid grid-cols-5">
            {ITENS_NAV.map((item) => (
              <NavLink
                key={item.para}
                to={item.para}
                end={item.exato}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                }
              >
                <span className="text-lg">{item.icone}</span>
                {item.rotulo}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

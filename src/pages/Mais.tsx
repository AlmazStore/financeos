import { Link } from 'react-router-dom';
import { Cartao, PageHeader } from '../components/ui';

const ITENS = [
  { to: '/simulador', icone: '🧮', titulo: 'Simulador', desc: 'Calcular sem salvar' },
  { to: '/relatorios', icone: '📊', titulo: 'Relatórios', desc: 'Carteira e exportações' },
  { to: '/config', icone: '⚙️', titulo: 'Ajustes', desc: 'Segurança e backup' },
  { to: '/teste', icone: '✓', titulo: 'Validação', desc: 'Conferir os cálculos (6.2)' },
];

export default function Mais() {
  return (
    <div className="space-y-4">
      <PageHeader titulo="Mais" />
      <div className="space-y-2">
        {ITENS.map((i) => (
          <Link key={i.to} to={i.to}>
            <Cartao className="flex items-center gap-3 p-4">
              <span className="text-2xl">{i.icone}</span>
              <div>
                <div className="font-semibold">{i.titulo}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{i.desc}</div>
              </div>
              <span className="ml-auto text-slate-400">›</span>
            </Cartao>
          </Link>
        ))}
      </div>
    </div>
  );
}

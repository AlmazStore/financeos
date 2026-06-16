import type { ReactNode } from 'react';
import type {
  Periodicidade,
  RiscoCliente,
  StatusEmprestimo,
  StatusParcela,
} from '../types/modelos';

/* ───────────────────────── Layout básico ───────────────────────── */

export function PageHeader({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">{titulo}</h2>
        {subtitulo && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
        )}
      </div>
      {acao}
    </div>
  );
}

export function Cartao({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function Indicador({
  titulo,
  valor,
  destaque,
  cor,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
  cor?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 shadow-sm ${
        destaque
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{titulo}</div>
      <div className={`mt-0.5 text-lg font-bold ${cor ?? ''}`}>{valor}</div>
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
      {children}
    </p>
  );
}

/* ───────────────────────── Formulário ───────────────────────── */

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

export const inputClasse =
  'w-full rounded-xl border border-slate-300 px-3 py-3 outline-none dark:border-slate-700 dark:bg-slate-900';

export function Botao({
  children,
  variante = 'primario',
  className = '',
  ...props
}: {
  children: ReactNode;
  variante?: 'primario' | 'secundario' | 'perigo';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const estilos: Record<string, string> = {
    primario: 'bg-emerald-600 text-white disabled:bg-slate-400',
    secundario:
      'border border-slate-300 dark:border-slate-700 disabled:text-slate-400',
    perigo: 'bg-red-600 text-white',
  };
  return (
    <button
      {...props}
      className={`rounded-xl py-3 px-4 font-semibold transition ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

export const ROTULO_FREQUENCIA: Record<Periodicidade, string> = {
  DIARIA: 'Diária',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
};

export function SelectFreq({
  valor,
  onChange,
}: {
  valor: Periodicidade;
  onChange: (v: Periodicidade) => void;
}) {
  return (
    <select
      value={valor}
      onChange={(e) => onChange(e.target.value as Periodicidade)}
      className={inputClasse}
    >
      {(['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL'] as Periodicidade[]).map((f) => (
        <option key={f} value={f}>
          {ROTULO_FREQUENCIA[f]}
        </option>
      ))}
    </select>
  );
}

/* ───────────────────────── Selos / status ───────────────────────── */

function Selo({ texto, classe }: { texto: string; classe: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${classe}`}
    >
      {texto}
    </span>
  );
}

const ST_EMP: Record<StatusEmprestimo, { t: string; c: string }> = {
  EM_DIA: { t: 'Em dia', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  ATRASADO: { t: 'Atrasado', c: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  QUITADO: { t: 'Quitado', c: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  RENEGOCIADO: { t: 'Renegociado', c: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  CANCELADO: { t: 'Cancelado', c: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};
export const StatusEmprestimoSelo = ({ status }: { status: StatusEmprestimo }) => (
  <Selo texto={ST_EMP[status].t} classe={ST_EMP[status].c} />
);

const ST_PARC: Record<StatusParcela, { t: string; c: string }> = {
  PENDENTE: { t: 'Pendente', c: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  PAGA: { t: 'Paga', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  PARCIAL: { t: 'Parcial', c: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  ATRASADA: { t: 'Atrasada', c: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};
export const StatusParcelaSelo = ({ status }: { status: StatusParcela }) => (
  <Selo texto={ST_PARC[status].t} classe={ST_PARC[status].c} />
);

const RISCO: Record<RiscoCliente, { t: string; c: string }> = {
  BOM: { t: 'Bom pagador', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  REGULAR: { t: 'Regular', c: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  ATENCAO: { t: 'Atenção', c: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
};
export const RiscoSelo = ({ risco }: { risco: RiscoCliente }) => (
  <Selo texto={RISCO[risco].t} classe={RISCO[risco].c} />
);

import { useState } from 'react';
import { validarPIN } from './pin';
import { Botao } from '../components/ui';

export default function Lock({ onDesbloquear }: { onDesbloquear: () => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState(false);

  function tentar() {
    if (validarPIN(pin)) {
      setPin('');
      setErro(false);
      onDesbloquear();
    } else {
      setErro(true);
      setPin('');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-white">
      <div className="text-center">
        <div className="text-4xl">🔒</div>
        <h1 className="mt-3 text-xl font-bold">Crédito Control</h1>
        <p className="text-sm text-slate-400">Digite seu PIN para continuar</p>
      </div>
      <input
        autoFocus
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => e.key === 'Enter' && tentar()}
        className="w-48 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none"
      />
      {erro && <p className="text-sm text-red-400">PIN incorreto.</p>}
      <Botao className="w-48" onClick={tentar}>
        Desbloquear
      </Botao>
    </div>
  );
}

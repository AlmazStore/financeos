/**
 * PIN local simples para proteger a abertura do app.
 * Guarda só um hash no dispositivo (não é criptografia forte, mas evita
 * leitura casual). Para dados muito sensíveis, combine com o bloqueio do SO.
 */
const CHAVE = 'credito-pin';

function hashSimples(texto: string): string {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = (h * 33) ^ texto.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function definirPIN(pin: string): void {
  localStorage.setItem(CHAVE, hashSimples(pin));
}

export function removerPIN(): void {
  localStorage.removeItem(CHAVE);
}

export function temPIN(): boolean {
  return localStorage.getItem(CHAVE) !== null;
}

export function validarPIN(pin: string): boolean {
  return localStorage.getItem(CHAVE) === hashSimples(pin);
}

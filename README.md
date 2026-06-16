# Crédito Control

App **mobile-first (PWA, offline)** para quem empresta dinheiro controlar
clientes, empréstimos, parcelas, recebimentos, lucro, atrasos e cobrança —
com um **simulador** que calcula parcelas, juros e a tabela de amortização
completa (Juros Simples, Price, SAC e Só Juros/rotativo).

> Frase-resumo: *"Sei quanto emprestei, quanto voltou, quanto tenho a receber,
> quem está em dia, quem está atrasado e quanto estou lucrando."*

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- `decimal.js` — dinheiro sempre em **centavos inteiros**
- **Dexie (IndexedDB)** — funciona 100% offline, dados no dispositivo
- `vite-plugin-pwa` — instalável e com cache offline (Service Worker)
- Recharts (gráficos), jsPDF (recibos/relatórios)
- Vitest (testes dos cálculos)

## Como rodar

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:5173)
npm run build      # build de produção (/dist) — gera o PWA
npm run preview    # serve o build
npm test           # testes do motor financeiro (exemplos da seção 6.2)
```

## Instalar no celular (PWA)

Faça o `build` e sirva o `/dist` por HTTPS (ex.: Vercel/Netlify ou
`npm run preview` na rede local). No navegador do celular, use
**“Adicionar à tela inicial”**. Depois de aberto uma vez, funciona offline.

## Módulos

| Módulo | O que faz |
|---|---|
| **Início (Dashboard)** | Capital na rua, recebido, lucro, a receber, em dia × atrasados, vencimentos de hoje e gráfico de 6 meses |
| **Clientes** | Cadastro, busca, ficha com histórico, selo de pagador (Bom/Regular/Atenção), total em aberto, “Cobrar no WhatsApp” |
| **Empréstimos** | Criar a partir da simulação (gera parcelas), filtros, detalhe com parcelas, registrar pagamento, **quitação antecipada**, **renegociação**, cancelar |
| **Recebimentos** | Pagamento total ou **parcial**, recibo em **PDF**, forma (PIX/dinheiro/transferência), movimento de caixa |
| **Atrasos** | Marca parcelas vencidas, aplica **multa + juros de mora ao dia**, mostra dias e valor atualizado |
| **Cobrança** | Vencem hoje / atrasados / próximos 7 dias, botão WhatsApp com mensagem pronta |
| **Relatórios** | Carteira, inadimplência %, exportação **PDF** e **CSV** |
| **Ajustes** | Limite de taxa (conformidade), desconto na quitação, bloqueio por inatividade, **PIN**, **backup/exportação** |

## Regras de negócio garantidas

- Dinheiro em centavos inteiros; saldo fecha em **R$ 0,00** (sobra na última parcela).
- Status do empréstimo derivado das parcelas; selo do cliente recalculado a cada pagamento.
- Pagamento parcial nunca “some” — fica registrado e abate o saldo.
- Toda operação de dinheiro gera registro no caixa (auditável).
- Renegociação gera novo empréstimo do saldo, mantendo o vínculo com o original.

## Backup / exportação

Em **Ajustes → Backup**: *Exportar backup* baixa um JSON com tudo;
*Importar backup* restaura. Relatórios também exportam CSV (Excel) e PDF.
Como os dados ficam no dispositivo, **exporte com frequência**.

## Estrutura

```
src/
  types/modelos.ts          # Modelo de dados (seção 5)
  db/                       # Dexie (db.ts) + operações de negócio (repos.ts)
  lib/
    dinheiro.ts datas.ts taxa.ts id.ts
    finance/simulador.ts    # Motor de cálculo (seção 6.1) + testes
    atrasos.ts metricas.ts agregados.ts   # multa/mora, métricas, dashboard
    whatsapp.ts pdf.ts exportar.ts
  hooks/  components/  security/  pages/   # UI mobile-first + PIN/lock
```

## Conformidade

Ferramenta de **controle e organização financeira**. As condições de cada
empréstimo são definidas e de responsabilidade do usuário. Há um campo de
**limite de taxa** com aviso (Ajustes) para manter as taxas dentro da
legislação aplicável.

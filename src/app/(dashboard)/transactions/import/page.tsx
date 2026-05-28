"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, UploadCloud, FileText, Loader2, CheckCircle2,
  TrendingUp, TrendingDown, AlertCircle, Trash2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { parseStatement, guessCategoryId, type ParsedTx } from "@/lib/statement-parser";

type Category = { id: string; name: string; icon: string | null; type: string };

type Row = ParsedTx & { id: number; categoryId: string | null; include: boolean };

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {});
  }, []);

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const content = await file.text();
      const parsed = parseStatement(file.name, content);

      if (parsed.length === 0) {
        toast("Não encontramos transações nesse arquivo. Tente um arquivo .OFX ou .CSV do seu banco.", "error");
        setParsing(false);
        return;
      }

      const newRows: Row[] = parsed.map((tx, i) => ({
        ...tx,
        id: i,
        categoryId: guessCategoryId(tx.description, tx.type, categories),
        include: true,
      }));

      setRows(newRows);
      setStep("preview");
    } catch {
      toast("Erro ao ler o arquivo.", "error");
    } finally {
      setParsing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const included = rows.filter((r) => r.include);
  const totalIncome = included.filter((r) => r.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const totalExpense = included.filter((r) => r.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);

  const confirmImport = async () => {
    if (included.length === 0) { toast("Selecione ao menos uma transação.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: included.map((r) => ({
            title: r.description,
            amount: r.amount,
            type: r.type,
            date: r.date,
            categoryId: r.categoryId,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast(`${data.imported} transações importadas com sucesso!`, "success");
      router.push("/transactions");
      router.refresh();
    } catch {
      toast("Erro ao importar. Tente novamente.", "error");
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1000px]">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Importar Extrato</h2>
          <p className="text-sm text-muted-foreground">Leia automaticamente as transações do seu banco</p>
        </div>
      </div>

      {step === "upload" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all",
              dragOver ? "border-emerald-400 bg-emerald-400/5" : "border-border hover:border-emerald-400/50 hover:bg-muted/20"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.csv,.txt"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                <p className="text-sm font-medium">Lendo {fileName}...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold">Arraste o arquivo aqui ou clique para escolher</p>
                  <p className="text-sm text-muted-foreground mt-1">Formatos aceitos: <strong>.OFX</strong> e <strong>.CSV</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* How to */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-sm">Como baixar o extrato do seu banco</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-emerald-400">•</span> <span><strong>Nubank:</strong> Conta → ícone de extrato → Exportar → escolha <strong>OFX</strong> ou CSV.</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span> <span><strong>Itaú / Bradesco / BB / Santander:</strong> Internet banking → Extrato → Exportar/Salvar como <strong>OFX</strong>.</span></li>
              <li className="flex gap-2"><span className="text-emerald-400">•</span> <span><strong>Outros:</strong> procure por &quot;Exportar extrato&quot; e escolha OFX (formato universal) ou CSV.</span></li>
            </ul>
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                O sistema lê as datas, valores e descrições automaticamente e ainda <strong>sugere a categoria</strong> de cada gasto. Você revisa tudo antes de salvar.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {step === "preview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Selecionadas</p>
              <p className="text-xl font-bold">{included.length}<span className="text-sm text-muted-foreground font-normal"> / {rows.length}</span></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Entradas</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Saídas</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Revise as transações abaixo. Você pode mudar a categoria, o tipo ou remover qualquer linha.
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden md:grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground items-center">
              <span></span>
              <span>Data</span>
              <span>Descrição</span>
              <span>Categoria</span>
              <span>Tipo</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="divide-y divide-border max-h-[440px] overflow-y-auto">
              {rows.map((row) => {
                const cats = categories.filter((c) => c.type === row.type || c.type === "BOTH");
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "grid grid-cols-2 md:grid-cols-[auto_auto_1fr_auto_auto_auto] gap-3 px-4 py-3 items-center text-sm transition-opacity",
                      !row.include && "opacity-40"
                    )}
                  >
                    <button onClick={() => updateRow(row.id, { include: !row.include })} className="flex-shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                        row.include ? "border-emerald-400 bg-emerald-400" : "border-border"
                      )}>
                        {row.include && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                      </div>
                    </button>

                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(new Date(row.date))}</span>

                    <span className="truncate font-medium" title={row.description}>{row.description}</span>

                    <select
                      value={row.categoryId ?? ""}
                      onChange={(e) => updateRow(row.id, { categoryId: e.target.value || null })}
                      className="text-xs bg-muted/50 border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary max-w-[140px]"
                    >
                      <option value="">Sem categoria</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => updateRow(row.id, {
                        type: row.type === "INCOME" ? "EXPENSE" : "INCOME",
                        categoryId: null,
                      })}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                        row.type === "INCOME" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}
                    >
                      {row.type === "INCOME" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.type === "INCOME" ? "Entrada" : "Saída"}
                    </button>

                    <div className="flex items-center justify-end gap-2">
                      <span className={cn("font-semibold whitespace-nowrap", row.type === "INCOME" ? "text-emerald-400" : "text-foreground")}>
                        {row.type === "INCOME" ? "+" : "-"}{formatCurrency(row.amount)}
                      </span>
                      <button onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setStep("upload"); setRows([]); }}>
              Escolher outro arquivo
            </Button>
            <Button variant="premium" className="flex-1" onClick={confirmImport} disabled={saving || included.length === 0}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Importar {included.length} {included.length === 1 ? "transação" : "transações"}</>}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

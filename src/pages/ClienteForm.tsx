import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { criarCliente, atualizarCliente } from '../db/repos';
import { Botao, Campo, PageHeader, inputClasse } from '../components/ui';

export default function ClienteForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    db.clientes.get(id).then((c) => {
      if (!c) return;
      setNome(c.nome);
      setApelido(c.apelido ?? '');
      setTelefone(c.telefone ?? '');
      setCpf(c.cpf ?? '');
      setEndereco(c.endereco ?? '');
      setObservacoes(c.observacoes ?? '');
    });
  }, [id]);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    const dados = {
      nome: nome.trim(),
      apelido: apelido.trim() || undefined,
      telefone: telefone.replace(/\D/g, '') || undefined,
      cpf: cpf.trim() || undefined,
      endereco: endereco.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    };
    if (editando && id) {
      await atualizarCliente(id, dados);
      navigate(`/clientes/${id}`);
    } else {
      const novoId = await criarCliente(dados);
      navigate(`/clientes/${novoId}`);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo={editando ? 'Editar cliente' : 'Novo cliente'} />

      <div className="space-y-3">
        <Campo rotulo="Nome completo *">
          <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputClasse} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Apelido">
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} className={inputClasse} />
          </Campo>
          <Campo rotulo="Telefone (WhatsApp)">
            <input
              inputMode="tel"
              placeholder="(11) 99999-8888"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className={inputClasse}
            />
          </Campo>
        </div>
        <Campo rotulo="CPF (opcional)">
          <input value={cpf} onChange={(e) => setCpf(e.target.value)} className={inputClasse} />
        </Campo>
        <Campo rotulo="Endereço (opcional)">
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} className={inputClasse} />
        </Campo>
        <Campo rotulo="Observações">
          <textarea
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className={inputClasse}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Botao variante="secundario" onClick={() => navigate(-1)}>
          Cancelar
        </Botao>
        <Botao onClick={salvar} disabled={!nome.trim() || salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </Botao>
      </div>
    </div>
  );
}

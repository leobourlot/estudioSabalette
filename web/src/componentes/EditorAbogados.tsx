import { type FormEvent, useState } from 'react';
import type { CausaDetalle, IntegranteResumen, LawyersData } from '../servicios/causas';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  type LawyersForm,
  toLawyersData,
  validateLawyersForm,
} from '../servicios/formulario-causa';
import { ListaDeErrores } from './ListaDeErrores';
import { useCausasService } from './ProveedorServicios';
import { SelectorIntegrantes } from './SelectorIntegrantes';

interface EditorAbogadosProps {
  causa: CausaDetalle;
  onSaved: (causa: CausaDetalle) => void;
}

const assignedOf = (causa: CausaDetalle): LawyersData => ({
  responsableId: causa.responsable.id,
  colaboradorIds: causa.colaboradores.map((member) => member.id),
});

/**
 * Edición del responsable y los colaboradores de una causa (RF-29 a RF-34). Parte de los
 * asignados actuales, así los desactivados que ya ocupaban su lugar se conservan (RF-32).
 * En una causa desactivada no se ofrece (RF-41).
 */
export function EditorAbogados({ causa, onSaved }: EditorAbogadosProps) {
  const causas = useCausasService();
  const [editing, setEditing] = useState(false);
  const [members, setMembers] = useState<IntegranteResumen[]>([]);
  const [value, setValue] = useState<LawyersForm>(assignedOf(causa));
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function open() {
    setValue(assignedOf(causa));
    setProblems([]);
    setEditing(true);
    try {
      setMembers(await causas.listMembers());
    } catch (caught) {
      setProblems([errorMessage(caught)]);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateLawyersForm(value);
    setProblems(found);
    if (found.length > 0) return;
    setEnviando(true);
    try {
      onSaved(await causas.updateLawyers(causa.id, toLawyersData(value)));
      setEditing(false);
    } catch (caught) {
      setProblems(
        caught instanceof ApiError && caught.messages.length > 0
          ? caught.messages
          : [errorMessage(caught)],
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!causa.activa) return null;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => void open()}
        className="rounded border border-slate-300 px-3 py-1.5 text-sm"
      >
        Editar abogados
      </button>
    );
  }

  return (
    <form onSubmit={save} noValidate className="space-y-4 rounded border border-slate-200 p-4">
      <ListaDeErrores messages={problems} />
      <SelectorIntegrantes
        members={members}
        value={value}
        assigned={assignedOf(causa)}
        onChange={setValue}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Guardar abogados
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border border-slate-300 px-4 py-2 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

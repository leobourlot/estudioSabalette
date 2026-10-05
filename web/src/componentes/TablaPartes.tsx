import { useState } from 'react';
import type { CausaDetalle, NewPartyData, ParteDetalle, ResultadoParte } from '../servicios/causas';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import { EMPTY_PARTY_FORM, type PartyForm, partyFormFrom } from '../servicios/formulario-causa';
import {
  applyPartyAnswer,
  pendingQuestion,
  type PendingQuestion,
  type QuestionOption,
} from '../servicios/preguntas';
import { EMPTY_VALUE } from '../servicios/presentacion';
import { partyDocument, partyName, rolProcesalLabel } from '../servicios/presentacion-causas';
import type { Avisos } from './AvisosResultado';
import { FormularioParte } from './FormularioParte';
import { PreguntaConfirmacion } from './PreguntaConfirmacion';
import { useCausasService } from './ProveedorServicios';

interface TablaPartesProps {
  causa: CausaDetalle;
  /** La causa actualizada después de una operación y, si corresponde, sus avisos (RF-20). */
  onChanged: (causa: CausaDetalle, avisos?: Avisos) => void;
}

type Editing = { kind: 'add' } | { kind: 'edit'; parte: ParteDetalle };

const apiMessages = (caught: unknown) =>
  caught instanceof ApiError && caught.messages.length > 0
    ? caught.messages
    : [errorMessage(caught)];

function clientMark(parte: ParteDetalle): string {
  if (!parte.esCliente) return 'No cliente';
  return parte.clienteActivo === false ? 'Cliente (desactivado)' : 'Cliente';
}

const buttonClass = 'text-sm text-slate-700 underline';

/**
 * Partes de una causa (RF-12 a RF-25): vigentes y desvinculadas. Permite agregar, modificar,
 * desvincular y volver a vincular partes, respondiendo las preguntas de la API (RF-16,
 * RF-19). De una parte cliente solo se modifica el rol (RF-21). En una causa desactivada no
 * ofrece acciones (RF-41).
 */
export function TablaPartes({ causa, onChanged }: TablaPartesProps) {
  const causas = useCausasService();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<PartyForm>(EMPTY_PARTY_FORM);
  const [lastData, setLastData] = useState<NewPartyData | null>(null);
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [formProblems, setFormProblems] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Cambiar la clave vacía el formulario, incluido el cliente elegido.
  const [formKey, setFormKey] = useState(0);

  function open(next: Editing) {
    setEditing(next);
    setForm(next.kind === 'edit' ? partyFormFrom(next.parte) : EMPTY_PARTY_FORM);
    setFormKey((key) => key + 1);
    setQuestion(null);
    setFormProblems([]);
    setActionError(null);
  }

  function close() {
    setEditing(null);
    setQuestion(null);
    setFormProblems([]);
  }

  function finish(response: ResultadoParte) {
    onChanged(response.causa, { rechazos: [], causasComoNoCliente: response.causasComoNoCliente });
  }

  async function send(data: NewPartyData) {
    if (!editing) return;
    setEnviando(true);
    setLastData(data);
    setQuestion(null);
    setFormProblems([]);
    try {
      const response =
        editing.kind === 'add'
          ? await causas.addParty(causa.id, data)
          : await causas.updateParty(
              causa.id,
              editing.parte.id,
              // Los datos de una parte cliente se modifican desde su cuenta (RF-21).
              editing.parte.esCliente ? { rol: data.rol } : data,
            );
      finish(response);
      close();
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else setFormProblems(apiMessages(caught));
    } finally {
      setEnviando(false);
    }
  }

  function answer(option: QuestionOption) {
    if (option.kind === 'cancel' || !lastData) {
      setQuestion(null);
      return;
    }
    const next = applyPartyAnswer(lastData, option);
    if (next === null) close();
    else void send(next);
  }

  async function unlink(parte: ParteDetalle) {
    setActionError(null);
    try {
      onChanged(await causas.unlinkParty(causa.id, parte.id));
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  async function relink(parte: ParteDetalle) {
    setActionError(null);
    try {
      finish(await causas.relinkParty(causa.id, parte.id));
    } catch (caught) {
      setActionError(errorMessage(caught));
    }
  }

  const canEdit = causa.activa;

  return (
    <section aria-label="Partes" className="space-y-4 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Partes</h2>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => open({ kind: 'add' })}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
          >
            Agregar parte
          </button>
        )}
      </div>

      {actionError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <table aria-label="Partes vigentes" className="w-full text-left text-sm">
        <thead className="text-slate-600">
          <tr>
            <th className="py-1 font-medium">Parte</th>
            <th className="py-1 font-medium">Documento</th>
            <th className="py-1 font-medium">Rol</th>
            <th className="py-1 font-medium">Tipo</th>
            {canEdit && <th className="py-1 font-medium">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {causa.partes.map((parte) => (
            <tr key={parte.id}>
              <td className="py-1">{partyName(parte)}</td>
              <td className="py-1">{partyDocument(parte) ?? EMPTY_VALUE}</td>
              <td className="py-1">{rolProcesalLabel(parte.rol)}</td>
              <td className="py-1">{clientMark(parte)}</td>
              {canEdit && (
                <td className="flex gap-3 py-1">
                  <button
                    type="button"
                    onClick={() => open({ kind: 'edit', parte })}
                    className={buttonClass}
                  >
                    Modificar
                  </button>
                  <button type="button" onClick={() => void unlink(parte)} className={buttonClass}>
                    Desvincular
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="space-y-3 rounded border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700">
            {editing.kind === 'add' ? 'Nueva parte' : `Modificar a ${partyName(editing.parte)}`}
          </h3>
          <FormularioParte
            key={formKey}
            value={form}
            onChange={setForm}
            submitLabel="Guardar parte"
            onSubmit={(data) => send(data)}
            fixedMode={editing.kind === 'edit'}
            clientLabel={editing.kind === 'edit' ? partyName(editing.parte) : null}
            apiProblems={formProblems}
            enviando={enviando}
            onCancel={close}
          />
          {question && <PreguntaConfirmacion question={question} onAnswer={answer} />}
        </div>
      )}

      {causa.partesDesvinculadas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Partes desvinculadas</h3>
          <table
            aria-label="Partes desvinculadas"
            className="w-full text-left text-sm text-slate-600"
          >
            <tbody className="divide-y divide-slate-200">
              {causa.partesDesvinculadas.map((parte) => (
                <tr key={parte.id}>
                  <td className="py-1">{partyName(parte)}</td>
                  <td className="py-1">{partyDocument(parte) ?? EMPTY_VALUE}</td>
                  <td className="py-1">{rolProcesalLabel(parte.rol)}</td>
                  <td className="py-1">{clientMark(parte)}</td>
                  {canEdit && (
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => void relink(parte)}
                        className={buttonClass}
                      >
                        Volver a vincular
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

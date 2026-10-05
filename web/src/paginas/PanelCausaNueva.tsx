import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Avisos } from '../componentes/AvisosResultado';
import { FormularioCausa } from '../componentes/FormularioCausa';
import { FormularioParte } from '../componentes/FormularioParte';
import { PreguntaConfirmacion } from '../componentes/PreguntaConfirmacion';
import { useCausasService } from '../componentes/ProveedorServicios';
import { SelectorIntegrantes } from '../componentes/SelectorIntegrantes';
import type { IntegranteResumen, NewPartyData } from '../servicios/causas';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildCreateCausaData,
  EMPTY_CAUSA_FORM,
  EMPTY_PARTY_FORM,
  type LawyersForm,
  toLawyersData,
  validateLawyersForm,
} from '../servicios/formulario-causa';
import {
  applyPartyAnswer,
  pendingQuestion,
  type PendingQuestion,
  type QuestionOption,
} from '../servicios/preguntas';
import { rejectionMessages, rolProcesalLabel } from '../servicios/presentacion-causas';

const FORM_ID = 'formulario-causa';

interface LoadedParty {
  data: NewPartyData;
  name: string;
}

/** Respuesta a la pregunta de expediente repetido, que se conserva entre preguntas. */
interface CaseAnswers {
  confirmarExpedienteRepetido?: boolean;
}

/**
 * Alta de una causa (RF-6): datos, responsable, colaboradores y al menos una parte. Las
 * preguntas de la API (RF-9, RF-16, RF-19) se responden acá y se reenvía el alta. Al crearla
 * lleva al detalle con lo que no se guardó (RF-7) y el aviso de RF-20.
 */
export function PanelCausaNueva() {
  const causas = useCausasService();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_CAUSA_FORM);
  const [lawyers, setLawyers] = useState<LawyersForm>({ responsableId: null, colaboradorIds: [] });
  const [members, setMembers] = useState<IntegranteResumen[]>([]);
  const [parties, setParties] = useState<LoadedParty[]>([]);
  const [partyForm, setPartyForm] = useState(EMPTY_PARTY_FORM);
  // Cambiar la clave vacía el formulario de la parte, incluido el cliente elegido.
  const [partyFormKey, setPartyFormKey] = useState(0);
  const [answers, setAnswers] = useState<CaseAnswers>({});
  const [question, setQuestion] = useState<PendingQuestion | null>(null);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    causas
      .listMembers()
      .then((list) => {
        if (active) setMembers(list);
      })
      .catch((caught: unknown) => {
        if (active) setApiProblems([errorMessage(caught)]);
      });
    return () => {
      active = false;
    };
  }, [causas]);

  function addParty(data: NewPartyData, name: string) {
    setParties((current) => [...current, { data, name }]);
    setPartyForm(EMPTY_PARTY_FORM);
    setPartyFormKey((key) => key + 1);
  }

  async function save(currentParties: LoadedParty[], currentAnswers: CaseAnswers) {
    setEnviando(true);
    setApiProblems([]);
    setQuestion(null);
    try {
      const result = await causas.createCausa({
        ...buildCreateCausaData(
          form,
          toLawyersData(lawyers),
          currentParties.map((party) => party.data),
        ),
        ...currentAnswers,
      });
      const avisos: Avisos = {
        rechazos: rejectionMessages(
          result.rechazos,
          currentParties.map((party) => party.name),
          members,
        ),
        causasComoNoCliente: result.causasComoNoCliente,
      };
      navigate(`/panel/causas/${result.causa.id}`, { state: { avisos } });
    } catch (caught) {
      const pending = pendingQuestion(caught);
      if (pending) setQuestion(pending);
      else {
        setApiProblems(
          caught instanceof ApiError && caught.messages.length > 0
            ? caught.messages
            : [errorMessage(caught)],
        );
      }
      setEnviando(false);
    }
  }

  function answer(option: QuestionOption) {
    if (!question) return;
    if (option.kind === 'cancel') {
      setQuestion(null);
      return;
    }
    if (question.codigo === 'EXPEDIENTE_REPETIDO') {
      const next = { ...answers, confirmarExpedienteRepetido: true };
      setAnswers(next);
      void save(parties, next);
      return;
    }
    const index = question.indiceParte;
    if (index === undefined || !parties[index]) return;
    const updated = applyPartyAnswer(parties[index].data, option);
    const nextParties =
      updated === null
        ? parties.filter((_, position) => position !== index)
        : parties.map((party, position) =>
            position === index ? { ...party, data: updated } : party,
          );
    setParties(nextParties);
    void save(nextParties, answers);
  }

  const questionParty =
    question?.indiceParte !== undefined ? parties[question.indiceParte]?.name : undefined;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Nueva causa</h1>

      <FormularioCausa
        id={FORM_ID}
        renderSubmit={false}
        value={form}
        onChange={setForm}
        submitLabel="Crear causa"
        onSubmit={() => save(parties, answers)}
        extraProblems={() => [
          ...validateLawyersForm(lawyers),
          ...(parties.length === 0 ? ['Agregá al menos una parte'] : []),
        ]}
        apiProblems={apiProblems}
        enviando={enviando}
      >
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-800">Abogados</h2>
          <SelectorIntegrantes members={members} value={lawyers} onChange={setLawyers} />
        </section>
      </FormularioCausa>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Partes</h2>
        {parties.length > 0 && (
          <ul
            aria-label="Partes cargadas"
            className="divide-y divide-slate-200 rounded bg-white shadow"
          >
            {parties.map((party, index) => (
              <li
                key={`${index}-${party.name}`}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span>
                  {party.name} · {rolProcesalLabel(party.data.rol)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setParties((current) => current.filter((_, position) => position !== index))
                  }
                  className="text-slate-600 underline"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <FormularioParte
          key={partyFormKey}
          value={partyForm}
          onChange={setPartyForm}
          submitLabel="Agregar parte"
          onSubmit={addParty}
        />
      </section>

      {question && (
        <PreguntaConfirmacion question={question} partyName={questionParty} onAnswer={answer} />
      )}

      <button
        type="submit"
        form={FORM_ID}
        disabled={enviando}
        className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        Crear causa
      </button>
    </main>
  );
}

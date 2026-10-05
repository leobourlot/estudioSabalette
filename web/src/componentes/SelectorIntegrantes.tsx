import type { IntegranteResumen, LawyersData } from '../servicios/causas';
import type { LawyersForm } from '../servicios/formulario-causa';
import { memberName } from '../servicios/presentacion-causas';

interface SelectorIntegrantesProps {
  /** Administradores y abogados, activos y desactivados, en el orden de la API. */
  members: IntegranteResumen[];
  value: LawyersForm;
  /** Abogados guardados de la causa; null en el alta. */
  assigned?: LawyersData | null;
  onChange: (value: LawyersForm) => void;
}

const selectClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';

/**
 * Responsable y colaboradores de una causa (RF-29 a RF-32). Ofrece solo integrantes activos;
 * un desactivado aparece únicamente en el lugar que ya ocupaba en la causa, marcado como tal,
 * y se conserva al guardar. El responsable no se ofrece como colaborador (RF-31).
 */
export function SelectorIntegrantes({
  members,
  value,
  assigned = null,
  onChange,
}: SelectorIntegrantesProps) {
  const responsableCandidates = members.filter(
    (member) => member.activo || member.id === assigned?.responsableId,
  );
  const collaboratorCandidates = members.filter(
    (member) =>
      (member.activo || assigned?.colaboradorIds.includes(member.id)) &&
      member.id !== value.responsableId,
  );

  function chooseResponsible(raw: string) {
    const responsableId = raw === '' ? null : Number(raw);
    onChange({
      responsableId,
      colaboradorIds: value.colaboradorIds.filter((id) => id !== responsableId),
    });
  }

  function toggleCollaborator(id: number, checked: boolean) {
    onChange({
      ...value,
      colaboradorIds: checked
        ? [...value.colaboradorIds, id]
        : value.colaboradorIds.filter((current) => current !== id),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="responsable" className="block text-sm font-medium text-slate-700">
          Responsable
        </label>
        <select
          id="responsable"
          value={value.responsableId === null ? '' : String(value.responsableId)}
          onChange={(event) => chooseResponsible(event.target.value)}
          className={selectClass}
        >
          <option value="">Elegí el responsable</option>
          {responsableCandidates.map((member) => (
            <option key={member.id} value={member.id}>
              {memberName(member)}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-700">Colaboradores</legend>
        {collaboratorCandidates.map((member) => (
          <label key={member.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.colaboradorIds.includes(member.id)}
              onChange={(event) => toggleCollaborator(member.id, event.target.checked)}
            />
            {memberName(member)}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

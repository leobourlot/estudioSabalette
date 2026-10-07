import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  accionLabel,
  authorName,
  campoLabel,
  DESCRIPTION_PREVIEW_LENGTH,
  formatChangeValue,
  formatMovementDate,
  movementAuditLines,
  MOVEMENT_TYPE_OPTIONS,
  tipoMovimientoLabel,
  truncateDescription,
} from './presentacion-movimientos';

describe('etiquetas (RF-1, RF-22)', () => {
  it('lista los tipos de la spec en su orden', () => {
    expect(MOVEMENT_TYPE_OPTIONS.map(([, label]) => label)).toEqual([
      'Escrito presentado',
      'Providencia',
      'Resolución',
      'Sentencia',
      'Notificación',
      'Audiencia',
      'Pericia',
      'Oficio',
      'Otro',
    ]);
  });

  it('nombra cada tipo, acción y campo', () => {
    expect(tipoMovimientoLabel('escrito_presentado')).toBe('Escrito presentado');
    expect(tipoMovimientoLabel('notificacion')).toBe('Notificación');
    expect(accionLabel('carga')).toBe('Carga');
    expect(accionLabel('modificacion')).toBe('Modificación');
    expect(accionLabel('anulacion')).toBe('Anulación');
    expect(accionLabel('restauracion')).toBe('Restauración');
    expect(campoLabel('textoCliente')).toBe('Texto para el cliente');
    expect(campoLabel('visible')).toBe('Visible para el cliente');
  });
});

describe('formatMovementDate (RNF de fechas)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['UTC', 'America/Argentina/Buenos_Aires', 'Pacific/Kiritimati'])(
    'muestra el mismo día con la zona horaria %s',
    (timeZone) => {
      vi.stubEnv('TZ', timeZone);
      expect(formatMovementDate('2024-03-01')).toBe('01/03/2024');
      expect(formatMovementDate('1998-12-31')).toBe('31/12/1998');
    },
  );
});

describe('truncateDescription (RF-24)', () => {
  it('no recorta un texto corto', () => {
    expect(truncateDescription('Se fija audiencia.')).toEqual({
      texto: 'Se fija audiencia.',
      recortada: false,
    });
  });

  it('no recorta un texto de exactamente el largo de la vista previa', () => {
    const text = 'a'.repeat(DESCRIPTION_PREVIEW_LENGTH);
    expect(truncateDescription(text)).toEqual({ texto: text, recortada: false });
  });

  it('recorta un texto largo y agrega puntos suspensivos', () => {
    const result = truncateDescription(`${'a'.repeat(DESCRIPTION_PREVIEW_LENGTH)}bcd`);
    expect(result.recortada).toBe(true);
    expect(result.texto).toBe(`${'a'.repeat(DESCRIPTION_PREVIEW_LENGTH)}…`);
  });

  it('cuenta en puntos de código, sin partir una letra de dos unidades UTF-16', () => {
    const result = truncateDescription('𝐀'.repeat(DESCRIPTION_PREVIEW_LENGTH + 1));
    expect(result.texto).toBe(`${'𝐀'.repeat(DESCRIPTION_PREVIEW_LENGTH)}…`);
  });
});

describe('authorName (RF-36)', () => {
  it('marca a un autor desactivado', () => {
    expect(authorName({ id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true })).toBe(
      'Sosa, Luis',
    );
    expect(authorName({ id: 1, nombre: 'Luis', apellido: 'Sosa', activo: false })).toBe(
      'Sosa, Luis (desactivado)',
    );
  });
});

describe('formatChangeValue (RF-22)', () => {
  it.each([
    ['fecha', '2024-03-01', '01/03/2024'],
    ['tipo', 'resolucion', 'Resolución'],
    ['visible', true, 'Sí'],
    ['anulado', false, 'No'],
    ['textoCliente', null, '—'],
    ['descripcion', 'Texto\ncon salto.', 'Texto\ncon salto.'],
  ] as const)('%s %j → %j', (campo, valor, expected) => {
    expect(formatChangeValue(campo, valor)).toBe(expected);
  });
});

describe('movementAuditLines (RF-2)', () => {
  const autor = { id: 1, nombre: 'Luis', apellido: 'Sosa', activo: true };

  it('indica quién lo cargó y que no se modificó, en hora de Buenos Aires', () => {
    expect(
      movementAuditLines({
        creadoPor: autor,
        creadoEn: '2026-10-01T13:00:00.000Z',
        modificadoPor: null,
        modificadoEn: null,
      }),
    ).toEqual(['Cargado por Sosa, Luis el 01/10/2026 10:00', 'Sin modificaciones desde la carga']);
  });

  it('indica quién lo modificó por última vez, marcando a un autor desactivado', () => {
    expect(
      movementAuditLines({
        creadoPor: autor,
        creadoEn: '2026-10-01T13:00:00.000Z',
        modificadoPor: { ...autor, id: 2, nombre: 'Marta', apellido: 'Díaz', activo: false },
        modificadoEn: '2026-10-02T21:30:00.000Z',
      })[1],
    ).toBe('Modificado por última vez por Díaz, Marta (desactivado) el 02/10/2026 18:30');
  });
});

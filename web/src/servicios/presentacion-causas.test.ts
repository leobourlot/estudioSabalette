import { describe, expect, it } from 'vitest';
import type { CausaDetalle, CausaResumen, IntegranteResumen, ParteDetalle } from './causas';
import {
  auditLines,
  CASE_STATUS_OPTIONS,
  estadoLabel,
  fueroLabel,
  incidentLabel,
  JURISDICTION_OPTIONS,
  memberName,
  needsResponsableWarning,
  partyDocument,
  partyName,
  PROCEDURAL_ROLE_OPTIONS,
  RESPONSABLE_WARNING,
  rejectionMessages,
  rolProcesalLabel,
} from './presentacion-causas';

const member = (overrides: Partial<IntegranteResumen> = {}): IntegranteResumen => ({
  id: 1,
  nombre: 'Juan',
  apellido: 'Álvarez',
  rol: 'abogado',
  activo: true,
  ...overrides,
});

const party = (overrides: Partial<ParteDetalle> = {}): ParteDetalle => ({
  id: 1,
  rol: 'actor',
  esCliente: false,
  clienteId: null,
  clienteActivo: null,
  tipoPersona: 'fisica',
  nombre: 'Juan',
  apellido: 'Pérez',
  razonSocial: null,
  dni: null,
  cuit: null,
  ...overrides,
});

const causa = (overrides: Partial<CausaResumen> = {}): CausaResumen => ({
  id: 1,
  caratula: 'Pérez c/ Gómez',
  numeroExpediente: null,
  juzgado: null,
  fuero: 'civil',
  estado: 'en_tramite',
  esIncidente: false,
  expedientePrincipal: null,
  activa: true,
  responsable: member(),
  creadoEn: '2026-10-01T13:00:00.000Z',
  modificadoEn: null,
  ...overrides,
});

describe('presentación de causas', () => {
  it.each([
    ['civil', 'Civil'],
    ['penal', 'Penal'],
    ['familia', 'Familia'],
    ['laboral', 'Laboral'],
    ['federal', 'Federal'],
    ['otro', 'Otro'],
  ] as const)('nombra el fuero %s (RF-1)', (fuero, label) => {
    expect(fueroLabel(fuero)).toBe(label);
  });

  it.each([
    ['en_tramite', 'En trámite'],
    ['paralizada', 'Paralizada'],
    ['archivada', 'Archivada'],
    ['finalizada', 'Finalizada'],
  ] as const)('nombra el estado %s (RF-1)', (estado, label) => {
    expect(estadoLabel(estado)).toBe(label);
  });

  it.each([
    ['actor', 'Actor'],
    ['demandado', 'Demandado'],
    ['tercero', 'Tercero'],
    ['otro', 'Otro'],
  ] as const)('nombra el rol procesal %s (RF-13)', (rol, label) => {
    expect(rolProcesalLabel(rol)).toBe(label);
  });

  it('ofrece las listas cerradas en el orden de la spec', () => {
    expect(JURISDICTION_OPTIONS.map(([value]) => value)).toEqual([
      'civil',
      'penal',
      'familia',
      'laboral',
      'federal',
      'otro',
    ]);
    expect(CASE_STATUS_OPTIONS.map(([value]) => value)).toEqual([
      'en_tramite',
      'paralizada',
      'archivada',
      'finalizada',
    ]);
    expect(PROCEDURAL_ROLE_OPTIONS).toEqual([
      ['actor', 'Actor'],
      ['demandado', 'Demandado'],
      ['tercero', 'Tercero'],
      ['otro', 'Otro'],
    ]);
  });

  it('escribe la marca de incidente con el número del expediente principal (RF-1)', () => {
    expect(incidentLabel(causa({ esIncidente: true, expedientePrincipal: '100/2020' }))).toBe(
      'Vinculado al expte. principal Nº 100/2020',
    );
    expect(incidentLabel(causa())).toBeNull();
  });

  describe('partes (RF-12)', () => {
    it('nombra a una persona física por nombre y apellido, y a una jurídica por razón social', () => {
      expect(partyName(party())).toBe('Juan Pérez');
      expect(
        partyName(
          party({
            tipoPersona: 'juridica',
            nombre: null,
            apellido: null,
            razonSocial: 'Gómez S.A.',
          }),
        ),
      ).toBe('Gómez S.A.');
    });

    it('escribe el DNI con puntos y el CUIT con guiones, o nada si no tiene', () => {
      expect(partyDocument(party({ dni: '30123456' }))).toBe('DNI 30.123.456');
      expect(partyDocument(party({ tipoPersona: 'juridica', cuit: '30712345671' }))).toBe(
        'CUIT 30-71234567-1',
      );
      expect(partyDocument(party())).toBeNull();
    });
  });

  it('nombra a un integrante por apellido y nombre, indicando si está desactivado', () => {
    expect(memberName(member())).toBe('Álvarez, Juan');
    expect(memberName(member({ activo: false }))).toBe('Álvarez, Juan (desactivado)');
  });

  describe('aviso de responsable desactivado (RF-33)', () => {
    it('se muestra en una causa activa con el responsable desactivado', () => {
      expect(needsResponsableWarning(causa({ responsable: member({ activo: false }) }))).toBe(true);
      expect(RESPONSABLE_WARNING).toBe(
        'El responsable de esta causa está desactivado. Asigná un nuevo responsable',
      );
    });

    it('no se muestra si el responsable está activo o la causa está desactivada', () => {
      expect(needsResponsableWarning(causa())).toBe(false);
      expect(
        needsResponsableWarning(causa({ activa: false, responsable: member({ activo: false }) })),
      ).toBe(false);
    });
  });

  it('describe cada parte o colaborador que no se guardó en el alta (RF-7)', () => {
    expect(
      rejectionMessages(
        [
          { indiceParte: 1, mensajes: ['El cliente está desactivado'] },
          { indiceParte: 3, mensajes: ['El nombre es obligatorio', 'El apellido es obligatorio'] },
          { colaboradorId: 2, mensajes: ['El integrante está desactivado'] },
          { colaboradorId: 99, mensajes: ['Los colaboradores deben ser integrantes del estudio'] },
        ],
        ['Pedro López', 'Gómez, Ana · DNI 30.123.456'],
        [member({ id: 2, nombre: 'Lucía', apellido: 'Benítez', activo: false })],
      ),
    ).toEqual([
      'Parte 2 (Gómez, Ana · DNI 30.123.456): El cliente está desactivado',
      'Parte 4: El nombre es obligatorio. El apellido es obligatorio',
      'Colaborador Benítez, Lucía: El integrante está desactivado',
      'Colaborador 99: Los colaboradores deben ser integrantes del estudio',
    ]);
  });

  it('describe el registro de la causa en hora de Buenos Aires (RF-2, RF-40, RF-42)', () => {
    const author = { id: 1, nombre: 'Juan', apellido: 'Álvarez' };
    const detail: CausaDetalle = {
      ...causa({ creadoEn: '2026-10-01T13:00:00.000Z', modificadoEn: '2026-10-04T12:15:00.000Z' }),
      colaboradores: [],
      partes: [],
      partesDesvinculadas: [],
      creadoPor: author,
      modificadoPor: author,
      desactivadaPor: author,
      desactivadaEn: '2026-10-02T13:00:00.000Z',
      reactivadaPor: null,
      reactivadaEn: '2026-10-03T13:00:00.000Z',
    };

    expect(auditLines(detail)).toEqual([
      'Creada por Juan Álvarez el 01/10/2026 10:00',
      'Modificada por última vez por Juan Álvarez el 04/10/2026 09:15',
      'Desactivada por Juan Álvarez el 02/10/2026 10:00',
      'Reactivada el 03/10/2026 10:00',
    ]);
  });
});

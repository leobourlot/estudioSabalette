import { describe, expect, it } from 'vitest';
import type { RolProcesal } from '../causas/parte.entity.js';
import type { PartySource } from '../causas/reglas-causas.js';
import {
  caseGroup,
  comparePortalCausas,
  comparePortalParties,
  pageOf,
  type PortalCaseRow,
  portalParty,
} from './reglas-portal.js';

describe('caseGroup (RF-10)', () => {
  it.each([
    ['en_tramite', 'en_curso'],
    ['paralizada', 'en_curso'],
    ['archivada', 'archivadas_y_finalizadas'],
    ['finalizada', 'archivadas_y_finalizadas'],
  ] as const)('%s va en el grupo %s', (estado, grupo) => {
    expect(caseGroup(estado)).toBe(grupo);
  });
});

describe('comparePortalCausas (RF-11)', () => {
  const row = (
    id: number,
    caratula: string,
    fechaUltimoMovimiento: string | null,
    grupo: PortalCaseRow['grupo'] = 'en_curso',
  ): PortalCaseRow => ({ id, caratula, grupo, fechaUltimoMovimiento });
  const order = (rows: PortalCaseRow[]) => [...rows].sort(comparePortalCausas).map((r) => r.id);

  it('pone primero el grupo "en curso", aunque el otro tenga movimientos más recientes', () => {
    expect(
      order([
        row(1, 'A', '2026-10-01', 'archivadas_y_finalizadas'),
        row(2, 'B', '2020-01-01', 'en_curso'),
      ]),
    ).toEqual([2, 1]);
  });

  it('dentro del grupo, ordena por fecha del último movimiento, primero la más reciente', () => {
    expect(
      order([row(1, 'A', '2024-01-01'), row(2, 'B', '2025-06-01'), row(3, 'C', '2024-12-31')]),
    ).toEqual([2, 3, 1]);
  });

  it('las causas sin fecha del último movimiento van al final de su grupo, por carátula', () => {
    expect(
      order([
        row(1, 'Zeta', null),
        row(2, 'Alfa', null),
        row(3, 'Media', '2020-01-01'),
        row(4, 'Otra', null, 'archivadas_y_finalizadas'),
      ]),
    ).toEqual([3, 2, 1, 4]);
  });

  it('a igual fecha, ordena por carátula sin distinguir mayúsculas, minúsculas ni tildes', () => {
    expect(
      order([
        row(1, 'pérez c/ López', '2024-01-01'),
        row(2, 'Álvarez c/ Gómez', '2024-01-01'),
        row(3, 'PEREZ c/ Acosta', '2024-01-01'),
      ]),
    ).toEqual([2, 3, 1]);
  });

  it('ordena la ñ después de la n, como en español', () => {
    expect(order([row(1, 'Ñandú c/ X', null), row(2, 'Nuñez c/ X', null)])).toEqual([2, 1]);
    expect(order([row(1, 'Peña c/ X', null), row(2, 'Penz c/ X', null)])).toEqual([2, 1]);
  });

  it('a igual carátula, primero la última registrada', () => {
    expect(
      order([
        row(4, 'Pérez c/ López', null),
        row(9, 'PEREZ C/ LOPEZ', null),
        row(6, 'Pérez c/ López', null),
      ]),
    ).toEqual([9, 6, 4]);
  });
});

describe('portalParty y comparePortalParties (RF-14, RF-15)', () => {
  const CLIENTE_ID = 50;

  const nonClient = (
    rol: RolProcesal,
    data: { nombre?: string; apellido?: string; razonSocial?: string },
  ): PartySource & { rol: RolProcesal } => ({
    rol,
    clienteId: null,
    tipoPersona: data.razonSocial ? 'juridica' : 'fisica',
    nombre: data.nombre ?? null,
    apellido: data.apellido ?? null,
    razonSocial: data.razonSocial ?? null,
    dni: data.razonSocial ? null : '20111222',
    cuit: data.razonSocial ? '30712345678' : null,
    cliente: null,
  });

  const client = (
    rol: RolProcesal,
    clienteId: number,
    data: { nombre: string; apellido: string; razonSocial?: string },
  ): PartySource & { rol: RolProcesal } => ({
    rol,
    clienteId,
    tipoPersona: null,
    nombre: null,
    apellido: null,
    razonSocial: null,
    dni: null,
    cuit: null,
    cliente: {
      tipoPersona: data.razonSocial ? 'juridica' : 'fisica',
      razonSocial: data.razonSocial ?? null,
      dni: data.razonSocial ? null : '30111222',
      cuit: data.razonSocial ? '30712345678' : null,
      usuario: { nombre: data.nombre, apellido: data.apellido },
    },
  });

  it('una persona física se muestra como "Nombre Apellido"', () => {
    expect(
      portalParty(nonClient('actor', { nombre: 'Ana', apellido: 'Gómez' }), CLIENTE_ID),
    ).toMatchObject({ nombre: 'Ana Gómez', rol: 'actor', esVos: false });
  });

  it('una persona jurídica no cliente se muestra con su razón social', () => {
    expect(
      portalParty(nonClient('demandado', { razonSocial: 'Transportes del Sur SA' }), CLIENTE_ID),
    ).toMatchObject({ nombre: 'Transportes del Sur SA', rol: 'demandado', esVos: false });
  });

  it('un cliente persona jurídica se muestra con su razón social, no con el contacto', () => {
    const party = portalParty(
      client('actor', 77, { nombre: 'Carla', apellido: 'Ríos', razonSocial: 'Ríos Hnos SRL' }),
      CLIENTE_ID,
    );

    expect(party.nombre).toBe('Ríos Hnos SRL');
    expect(JSON.stringify(party)).not.toContain('Carla');
  });

  it('solo la parte del cliente que consulta lleva esVos', () => {
    expect(
      portalParty(client('actor', CLIENTE_ID, { nombre: 'Ana', apellido: 'Gómez' }), CLIENTE_ID)
        .esVos,
    ).toBe(true);
    expect(
      portalParty(client('actor', 77, { nombre: 'Ana', apellido: 'Gómez' }), CLIENTE_ID).esVos,
    ).toBe(false);
    // Un homónimo no cliente no es el cliente que consulta.
    expect(
      portalParty(nonClient('actor', { nombre: 'Ana', apellido: 'Gómez' }), CLIENTE_ID).esVos,
    ).toBe(false);
  });

  it('no revela el tipo de persona, el documento ni si es cliente', () => {
    const party = portalParty(
      client('actor', 77, { nombre: 'Ana', apellido: 'Gómez' }),
      CLIENTE_ID,
    );
    const json = JSON.stringify(party);

    expect(json).not.toContain('30111222');
    expect(json).not.toContain('fisica');
    expect(json).not.toContain('77');
  });

  it('ordena por rol procesal y después por apellido (o razón social) y nombre', () => {
    const parties = [
      nonClient('otro', { nombre: 'Zoe', apellido: 'Abad' }),
      nonClient('demandado', { razonSocial: 'Banco Norte SA' }),
      nonClient('actor', { nombre: 'Bruno', apellido: 'Gómez' }),
      nonClient('demandado', { nombre: 'Ana', apellido: 'Álvarez' }),
      nonClient('actor', { nombre: 'Ana', apellido: 'gomez' }),
      nonClient('tercero', { nombre: 'Luis', apellido: 'Paz' }),
      nonClient('demandado', { nombre: 'Carla', apellido: 'Castro' }),
    ].map((parte) => portalParty(parte, CLIENTE_ID));

    expect(parties.sort(comparePortalParties).map((p) => `${p.rol}: ${p.nombre}`)).toEqual([
      'actor: Ana gomez',
      'actor: Bruno Gómez',
      'demandado: Ana Álvarez',
      'demandado: Banco Norte SA',
      'demandado: Carla Castro',
      'tercero: Luis Paz',
      'otro: Zoe Abad',
    ]);
  });
});

describe('pageOf (RF-24, RF-25)', () => {
  const items = Array.from({ length: 45 }, (_, i) => i + 1);

  it('la primera página trae 20 y avisa que hay siguiente', () => {
    expect(pageOf(items, 1, 20)).toEqual({
      items: items.slice(0, 20),
      pagina: 1,
      haySiguiente: true,
    });
  });

  it('la última página trae el resto y no tiene siguiente', () => {
    expect(pageOf(items, 3, 20)).toEqual({
      items: [41, 42, 43, 44, 45],
      pagina: 3,
      haySiguiente: false,
    });
  });

  it('una página exacta no tiene siguiente', () => {
    expect(pageOf(items.slice(0, 40), 2, 20).haySiguiente).toBe(false);
  });

  it('una página posterior a la última viene vacía y sin siguiente', () => {
    expect(pageOf(items, 4, 20)).toEqual({ items: [], pagina: 4, haySiguiente: false });
  });
});

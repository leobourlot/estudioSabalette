import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Movimiento, MOVEMENT_TYPES } from '../src/movimientos/movimiento.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestClient, createTestUser } from './utilidades/datos-de-prueba.js';
import { clearMovementTables } from './utilidades/movimientos-de-prueba.js';
import { loginAs } from './utilidades/sesion-de-prueba.js';

const CAUSAS = 100;
const MOVEMENTS = 5000;
const BATCH = 250;
const LIMIT_MS = 2000;

/**
 * RNF de rendimiento de la spec 004: con 100 causas vinculadas a un cliente y 5.000 movimientos
 * en una, cada ruta del portal responde en menos de 2 segundos.
 */
describe('rendimiento del portal', () => {
  let app: NestExpressApplication;
  let lawyer: Usuario;
  let client: Usuario;
  let accessToken: string;
  let busyCausaId: number;
  let lastMovementId: number;

  /** Tiempo de respuesta de un pedido del portal, en milisegundos. */
  const timed = async (path: string) => {
    const start = performance.now();
    const response = await request(app.getHttpServer())
      .get(path)
      .set('Cookie', `access_token=${accessToken}`)
      .expect(200);
    return { ms: performance.now() - start, body: response.body };
  };

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);
    await clearMovementTables(app);
    lawyer = await createTestUser(app, { email: 'abogado@estudio.com' });
    client = await createTestClient(app);

    const causaIds: number[] = [];
    for (let i = 0; i < CAUSAS; i++) {
      const causa = await createTestCausa(app, {
        caratula: `Cliente c/ Demandado ${i} s/ daños`,
        estado: i % 4 === 0 ? 'archivada' : 'en_tramite',
        responsableId: lawyer.id,
        creadoPorId: lawyer.id,
        partes: [
          { clienteId: client.id },
          { rol: 'demandado', nombre: 'Pedro', apellido: `López ${i}` },
        ],
      });
      causaIds.push(causa.id);
    }
    busyCausaId = causaIds[0];

    // 5.000 movimientos en una causa (con textos largos, la mitad visibles) y uno visible en
    // cada una de las demás, para que la fecha del último movimiento se calcule en todas.
    const filler = 'Se agrega a autos la documental acompañada por la parte actora. '.repeat(30);
    const repository = app.get(DataSource).getRepository(Movimiento);
    const creadoEn = new Date();
    for (let start = 0; start < MOVEMENTS; start += BATCH) {
      const rows = Array.from({ length: BATCH }, (_, offset) => {
        const index = start + offset;
        const day = String((index % 28) + 1).padStart(2, '0');
        const month = String((index % 12) + 1).padStart(2, '0');
        return {
          causaId: busyCausaId,
          fecha: `${2000 + (index % 25)}-${month}-${day}`,
          tipo: MOVEMENT_TYPES[index % MOVEMENT_TYPES.length],
          descripcion: `${filler} Movimiento número ${index}.`,
          textoCliente: index % 2 === 0 ? `Texto para el cliente del movimiento ${index}.` : null,
          visible: index % 2 === 0,
          anulado: index % 10 === 0,
          creadoPorId: lawyer.id,
          creadoEn,
        };
      });
      await repository.insert(rows);
    }
    await repository.insert(
      causaIds.slice(1).map((causaId, index) => ({
        causaId,
        fecha: `2024-01-${String((index % 28) + 1).padStart(2, '0')}`,
        tipo: 'providencia' as const,
        descripcion: 'Se provee lo solicitado.',
        textoCliente: null,
        visible: true,
        anulado: false,
        creadoPorId: lawyer.id,
        creadoEn,
      })),
    );
    const last = await repository.findOneOrFail({
      where: { causaId: busyCausaId, visible: true },
      order: { id: 'DESC' },
    });
    lastMovementId = last.id;

    ({ accessToken } = await loginAs(app, client.email!));
  }, 300_000);

  afterAll(async () => {
    await clearMovementTables(app);
    await app?.close();
  });

  it('la lista de causas responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed('/api/portal/causas');

    expect(body.items).toHaveLength(20);
    expect(body.haySiguiente).toBe(true);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('la última página de la lista de causas responde en menos de 2 segundos', async () => {
    const { ms, body } = await timed('/api/portal/causas?pagina=5');

    expect(body.items).toHaveLength(20);
    expect(body.haySiguiente).toBe(false);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('el detalle de la causa con 5.000 movimientos responde en menos de 2 segundos', async () => {
    const { ms } = await timed(`/api/portal/causas/${busyCausaId}`);

    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('la primera y la última página de sus movimientos responden en menos de 2 segundos', async () => {
    const first = await timed(`/api/portal/causas/${busyCausaId}/movimientos`);
    const last = await timed(`/api/portal/causas/${busyCausaId}/movimientos?pagina=125`);

    expect(first.body.items).toHaveLength(20);
    expect(last.body.items).toHaveLength(20);
    expect(last.body.haySiguiente).toBe(false);
    expect(first.ms).toBeLessThan(LIMIT_MS);
    expect(last.ms).toBeLessThan(LIMIT_MS);
  });

  it('un movimiento responde en menos de 2 segundos', async () => {
    const { ms } = await timed(`/api/portal/causas/${busyCausaId}/movimientos/${lastMovementId}`);

    expect(ms).toBeLessThan(LIMIT_MS);
  });
});

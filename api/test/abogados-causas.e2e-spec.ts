import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Causa } from '../src/causas/causa.entity.js';
import type { Usuario } from '../src/usuarios/usuario.entity.js';
import { clearTables, createTestApp } from './utilidades/aplicacion-de-tests.js';
import { createTestCausa, createTestUser } from './utilidades/datos-de-prueba.js';
import { loginAs, type TestSession } from './utilidades/sesion-de-prueba.js';

const CAUSAS = '/api/panel/causas';

/** RF-2, RF-29 a RF-34, RF-41: responsable y colaboradores de una causa. */
describe('PUT /api/panel/causas/:id/abogados', () => {
  let app: NestExpressApplication;
  let admin: Usuario;
  let lawyer: Usuario;
  let colleague: Usuario;
  let other: Usuario;
  let client: Usuario;
  let session: TestSession;

  const withSession = (call: request.Test) =>
    call.set('Cookie', `access_token=${session.accessToken}`);
  const putLawyers = (id: number | string, body: object) =>
    withSession(request(app.getHttpServer()).put(`${CAUSAS}/${id}/abogados`)).send(body);
  const getCausa = (id: number) => withSession(request(app.getHttpServer()).get(`${CAUSAS}/${id}`));
  const setActive = (userId: number, activo: boolean) =>
    app.get(DataSource).query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, userId]);

  const freshCausa = (changes: Partial<Causa> & { colaboradorIds?: number[] } = {}) =>
    createTestCausa(app, {
      responsableId: lawyer.id,
      creadoPorId: admin.id,
      colaboradorIds: [colleague.id],
      ...changes,
    });

  const lawyerNamed = async (email: string, apellido: string, activo = true) =>
    createTestUser(app, { email, nombre: 'Abogado', apellido, activo });

  beforeAll(async () => {
    app = await createTestApp();
    await clearTables(app);

    admin = await createTestUser(app, {
      rol: 'admin',
      email: 'carla@estudio.com',
      nombre: 'Carla',
      apellido: 'Sabalette',
    });
    lawyer = await lawyerNamed('juan@estudio.com', 'Álvarez');
    colleague = await lawyerNamed('lucia@estudio.com', 'Benítez');
    other = await lawyerNamed('pablo@estudio.com', 'Castro');
    client = await createTestUser(app, {
      rol: 'cliente',
      email: 'ana@correo.com',
      nombre: 'Ana',
      apellido: 'Gómez',
      cliente: { tipoPersona: 'fisica', dni: '30123456' },
    });
    session = await loginAs(app, 'carla@estudio.com');
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reemplaza al responsable y a los colaboradores, y registra la modificación (RF-29, RF-34)', async () => {
    const causa = await freshCausa();

    const response = await putLawyers(causa.id, {
      responsableId: other.id,
      colaboradorIds: [admin.id, lawyer.id],
    }).expect(200);

    expect(response.body.responsable).toMatchObject({ id: other.id, apellido: 'Castro' });
    expect(response.body.colaboradores.map((member: { id: number }) => member.id)).toEqual([
      lawyer.id,
      admin.id,
    ]);
    expect(response.body.modificadoPor).toMatchObject({ id: admin.id });
    const rows: { usuarioId: number }[] = await app
      .get(DataSource)
      .query('SELECT usuarioId FROM causa_colaboradores WHERE causaId = ? ORDER BY usuarioId', [
        causa.id,
      ]);
    expect(rows.map((row) => row.usuarioId)).toEqual([admin.id, lawyer.id].sort((a, b) => a - b));
  });

  it('acepta una causa sin colaboradores', async () => {
    const causa = await freshCausa();

    const response = await putLawyers(causa.id, {
      responsableId: lawyer.id,
      colaboradorIds: [],
    }).expect(200);

    expect(response.body.colaboradores).toEqual([]);
  });

  it.each<[string, (inactive: Usuario) => object]>([
    [
      'como colaborador',
      (inactive) => ({ responsableId: lawyer.id, colaboradorIds: [colleague.id, inactive.id] }),
    ],
    [
      'como responsable',
      (inactive) => ({ responsableId: inactive.id, colaboradorIds: [colleague.id] }),
    ],
  ])('rechaza asignar a un integrante desactivado nuevo %s (RF-30)', async (_case, body) => {
    const inactive = await lawyerNamed(`inactivo-${Date.now()}@estudio.com`, 'Inactivo', false);
    const causa = await freshCausa();

    const response = await putLawyers(causa.id, body(inactive)).expect(409);

    expect(response.body.message).toBe('El integrante está desactivado');
  });

  it('conserva a los desactivados que ya ocupaban su lugar y los muestra como tales (RF-32)', async () => {
    const leaving = await lawyerNamed('se-va@estudio.com', 'Duarte');
    const leavingToo = await lawyerNamed('tambien@estudio.com', 'Espinoza');
    const causa = await freshCausa({ responsableId: leaving.id, colaboradorIds: [leavingToo.id] });
    await setActive(leaving.id, false);
    await setActive(leavingToo.id, false);

    const response = await putLawyers(causa.id, {
      responsableId: leaving.id,
      colaboradorIds: [leavingToo.id, colleague.id],
    }).expect(200);

    expect(response.body.responsable).toMatchObject({ id: leaving.id, activo: false });
    expect(response.body.colaboradores).toEqual([
      expect.objectContaining({ id: colleague.id, activo: true }),
      expect.objectContaining({ id: leavingToo.id, activo: false }),
    ]);
  });

  it('rechaza que un colaborador desactivado pase a ser el responsable (RF-30)', async () => {
    const leaving = await lawyerNamed('otro-se-va@estudio.com', 'Fernández');
    const causa = await freshCausa({ colaboradorIds: [leaving.id] });
    await setActive(leaving.id, false);

    await putLawyers(causa.id, { responsableId: leaving.id, colaboradorIds: [] }).expect(409);
  });

  it.each([
    [
      'un colaborador repetido',
      () => ({ responsableId: lawyer.id, colaboradorIds: [colleague.id, colleague.id] }),
    ],
    [
      'el responsable como colaborador',
      () => ({ responsableId: lawyer.id, colaboradorIds: [lawyer.id] }),
    ],
  ])('rechaza %s (RF-31)', async (_case, body) => {
    const causa = await freshCausa();

    const response = await putLawyers(causa.id, body()).expect(409);

    expect(response.body.message).toBe('Ese integrante ya interviene en la causa');
  });

  it('rechaza a un cliente como responsable o colaborador', async () => {
    const causa = await freshCausa();

    const asResponsible = await putLawyers(causa.id, {
      responsableId: client.id,
      colaboradorIds: [],
    }).expect(400);
    const asCollaborator = await putLawyers(causa.id, {
      responsableId: lawyer.id,
      colaboradorIds: [client.id],
    }).expect(400);

    expect(asResponsible.body.message).toBe('El responsable debe ser un integrante del estudio');
    expect(asCollaborator.body.message).toBe('Los colaboradores deben ser integrantes del estudio');
  });

  it('una cuenta desactivada después de asignada sigue figurando con activo en false (RF-32)', async () => {
    const later = await lawyerNamed('despues@estudio.com', 'Gutiérrez');
    const causa = await freshCausa({ responsableId: later.id });
    await setActive(later.id, false);

    const response = await getCausa(causa.id).expect(200);

    expect(response.body.responsable).toMatchObject({ id: later.id, activo: false });
  });

  it('valida el cuerpo', async () => {
    const causa = await freshCausa();

    const response = await putLawyers(causa.id, { responsableId: 'x', extra: 1 }).expect(400);

    expect(response.body.message).toEqual([
      'El campo extra no está permitido',
      'El responsable es obligatorio y debe ser el id de un integrante',
      'Los colaboradores deben ser una lista de ids de integrantes',
    ]);
  });

  it('rechaza cambiar los abogados de una causa desactivada (RF-41)', async () => {
    const causa = await freshCausa({ activa: false });

    const response = await putLawyers(causa.id, {
      responsableId: other.id,
      colaboradorIds: [],
    }).expect(409);

    expect(response.body.message).toBe('La causa está desactivada. Reactivala para modificarla');
  });

  it('responde 404 a una causa inexistente', async () => {
    await putLawyers(99999, { responsableId: lawyer.id, colaboradorIds: [] }).expect(404);
  });
});

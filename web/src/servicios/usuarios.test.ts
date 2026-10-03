import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient } from './cliente-http';
import { createUsersService } from './usuarios';

const BASE_URL = 'https://api.estudio.com';
const USERS = `${BASE_URL}/api/panel/usuarios`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

describe('servicio de usuarios (RF-21 a RF-34)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let users: ReturnType<typeof createUsersService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    users = createUsersService(createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock }));
  });

  /** URL, método y cuerpo (ya parseado) de la única llamada hecha. */
  function lastCall() {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return {
      url,
      method: init?.method,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
  }

  describe('listado y consulta', () => {
    it('lista con los parámetros indicados, sin enviar los vacíos', async () => {
      const page = { items: [], total: 0, pagina: 2, porPagina: 20 };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      const result = await users.listUsers({
        pagina: 2,
        buscar: 'pérez 30.123',
        rol: 'cliente',
        activo: undefined,
      });

      expect(result).toEqual(page);
      expect(lastCall()).toEqual({
        url: `${USERS}?pagina=2&buscar=p%C3%A9rez+30.123&rol=cliente`,
        method: 'GET',
        body: undefined,
      });
    });

    it('envía el filtro activo=false', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { items: [], total: 0, pagina: 1, porPagina: 20 }),
      );

      await users.listUsers({ activo: false, buscar: '  ' });

      expect(lastCall().url).toBe(`${USERS}?activo=false`);
    });

    it('lista sin parámetros', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { items: [], total: 0, pagina: 1, porPagina: 20 }),
      );

      await users.listUsers();

      expect(lastCall().url).toBe(USERS);
    });

    it('consulta una cuenta', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await expect(users.getUser(7)).resolves.toEqual({ id: 7 });
      expect(lastCall()).toEqual({ url: `${USERS}/7`, method: 'GET', body: undefined });
    });
  });

  describe('alta y modificación', () => {
    it('crea una cuenta', async () => {
      const data = {
        rol: 'cliente' as const,
        email: 'ana@correo.com',
        nombre: 'Ana',
        apellido: 'Gómez',
        contrasenaTemporal: 'clave temporal 2026',
        cliente: { tipoPersona: 'fisica' as const, dni: '30.123.456' },
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 9 }));

      await expect(users.createUser(data)).resolves.toEqual({ id: 9 });
      expect(lastCall()).toEqual({ url: USERS, method: 'POST', body: data });
    });

    it('modifica una cuenta con PATCH, enviando solo los cambios', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await users.updateUser(7, { nombre: 'Juana', cliente: { telefono: null } });

      expect(lastCall()).toEqual({
        url: `${USERS}/7`,
        method: 'PATCH',
        body: { nombre: 'Juana', cliente: { telefono: null } },
      });
    });
  });

  describe('acciones', () => {
    it.each([
      ['desactiva', (id: number) => users.deactivateUser(id), 'desactivar', undefined],
      [
        'reactiva',
        (id: number) => users.reactivateUser(id, 'clave temporal 2026'),
        'reactivar',
        { contrasenaTemporal: 'clave temporal 2026' },
      ],
      [
        'restablece la contraseña',
        (id: number) => users.resetPassword(id, 'clave temporal 2026'),
        'restablecer-contrasena',
        { contrasenaTemporal: 'clave temporal 2026' },
      ],
      ['libera el email', (id: number) => users.releaseEmail(id), 'liberar-email', undefined],
      [
        'transfiere el principal',
        (id: number) => users.transferPrincipal(id),
        'transferir-principal',
        undefined,
      ],
    ])('%s con POST', async (_case, action, path, body) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await expect(action(7)).resolves.toBeUndefined();
      expect(lastCall()).toEqual({ url: `${USERS}/7/${path}`, method: 'POST', body });
    });
  });

  describe('errores de la API', () => {
    it.each([
      'Ya existe una cuenta con ese email',
      'Ese email pertenece a una cuenta desactivada',
      'Ya existe un cliente con ese DNI o CUIT. Está desactivado: reactivalo en lugar de crear uno nuevo',
      'No se puede modificar al administrador principal',
    ])('traslada el mensaje del 409: %s', async (message) => {
      fetchMock.mockResolvedValueOnce(jsonResponse(409, { statusCode: 409, message }));

      const error = await users
        .createUser({
          rol: 'abogado',
          email: 'x@estudio.com',
          nombre: 'X',
          apellido: 'Y',
          contrasenaTemporal: 'clave temporal 2026',
        })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 409, message });
    });

    it('traslada todos los mensajes de un 400 de validación', async () => {
      const messages = ['El DNI es obligatorio para personas físicas', 'El nombre es obligatorio'];
      fetchMock.mockResolvedValueOnce(jsonResponse(400, { statusCode: 400, message: messages }));

      await expect(users.updateUser(7, { nombre: '' })).rejects.toMatchObject({
        status: 400,
        messages,
      });
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCausasService } from './causas';
import { ApiError, createHttpClient } from './cliente-http';

const BASE_URL = 'https://api.estudio.com';
const CAUSAS = `${BASE_URL}/api/panel/causas`;

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
  });
}

describe('servicio de causas (spec 002)', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let causas: ReturnType<typeof createCausasService>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    causas = createCausasService(createHttpClient({ baseUrl: BASE_URL, fetch: fetchMock }));
  });

  /** URL, método y cuerpo (ya parseado) de la última llamada. */
  function lastCall() {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return {
      url,
      method: init?.method,
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    };
  }

  describe('listado (RF-36 a RF-39)', () => {
    const page = { items: [], total: 0, pagina: 1, porPagina: 20 };

    it('envía todos los filtros indicados', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      const result = await causas.listCausas({
        pagina: 2,
        buscar: ' pérez 1234/2024 ',
        fuero: 'civil',
        estado: 'en_tramite',
        responsableId: 4,
        mias: true,
        responsableDesactivado: true,
        incluirDesactivadas: true,
      });

      expect(result).toEqual(page);
      expect(lastCall()).toEqual({
        url: `${CAUSAS}?pagina=2&buscar=p%C3%A9rez+1234%2F2024&fuero=civil&estado=en_tramite&responsableId=4&mias=true&responsableDesactivado=true&incluirDesactivadas=true`,
        method: 'GET',
        body: undefined,
      });
    });

    it('no envía los filtros vacíos ni las casillas desmarcadas', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page));

      await causas.listCausas({
        buscar: '   ',
        mias: false,
        responsableDesactivado: false,
        incluirDesactivadas: false,
      });

      expect(lastCall().url).toBe(CAUSAS);
    });

    it('lista los integrantes', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, []));

      await causas.listMembers();

      expect(lastCall()).toEqual({ url: `${CAUSAS}/integrantes`, method: 'GET', body: undefined });
    });
  });

  describe('causa', () => {
    it('consulta una causa (RF-12)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await expect(causas.getCausa(7)).resolves.toEqual({ id: 7 });
      expect(lastCall()).toMatchObject({ url: `${CAUSAS}/7`, method: 'GET' });
    });

    it('da de alta una causa con sus partes y devuelve rechazos y avisos (RF-6, RF-7, RF-20)', async () => {
      const result = { causa: { id: 9 }, rechazos: [], causasComoNoCliente: [] };
      fetchMock.mockResolvedValueOnce(jsonResponse(201, result));
      const data = {
        caratula: 'Pérez c/ Gómez',
        fuero: 'civil' as const,
        responsableId: 1,
        colaboradorIds: [2],
        partes: [
          { rol: 'actor' as const, clienteId: 5 },
          {
            rol: 'demandado' as const,
            tipoPersona: 'fisica' as const,
            nombre: 'Juan',
            apellido: 'López',
          },
        ],
      };

      await expect(causas.createCausa(data)).resolves.toEqual(result);
      expect(lastCall()).toEqual({ url: CAUSAS, method: 'POST', body: data });
    });

    it('modifica los datos de una causa (RF-11)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await causas.updateCausa(7, { estado: 'finalizada', juzgado: null });

      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7`,
        method: 'PATCH',
        body: { estado: 'finalizada', juzgado: null },
      });
    });

    it('reemplaza los abogados (RF-29 a RF-34)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));

      await causas.updateLawyers(7, { responsableId: 1, colaboradorIds: [2, 3] });

      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7/abogados`,
        method: 'PUT',
        body: { responsableId: 1, colaboradorIds: [2, 3] },
      });
    });

    it('desactiva y reactiva, con la respuesta a la pregunta de expediente (RF-40 a RF-43)', async () => {
      fetchMock.mockResolvedValue(jsonResponse(204));

      await causas.deactivateCausa(7);
      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7/desactivar`,
        method: 'POST',
        body: undefined,
      });

      await causas.reactivateCausa(7);
      expect(lastCall()).toEqual({ url: `${CAUSAS}/7/reactivar`, method: 'POST', body: {} });

      await causas.reactivateCausa(7, true);
      expect(lastCall().body).toEqual({ confirmarExpedienteRepetido: true });
    });
  });

  describe('partes (RF-13 a RF-25)', () => {
    const result = { causa: { id: 7 }, causasComoNoCliente: [] };

    it('agrega una parte', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(201, result));
      const parte = { rol: 'tercero' as const, clienteId: 5, confirmarNombreRepetido: true };

      await expect(causas.addParty(7, parte)).resolves.toEqual(result);
      expect(lastCall()).toEqual({ url: `${CAUSAS}/7/partes`, method: 'POST', body: parte });
    });

    it('modifica una parte', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, result));

      await causas.updateParty(7, 3, { rol: 'otro' });

      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7/partes/3`,
        method: 'PUT',
        body: { rol: 'otro' },
      });
    });

    it('desvincula y vuelve a vincular una parte', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7 }));
      await causas.unlinkParty(7, 3);
      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7/partes/3/desvincular`,
        method: 'POST',
        body: undefined,
      });

      fetchMock.mockResolvedValueOnce(jsonResponse(200, result));
      await causas.relinkParty(7, 3);
      expect(lastCall()).toEqual({
        url: `${CAUSAS}/7/partes/3/revincular`,
        method: 'POST',
        body: undefined,
      });
    });
  });

  it('traslada los errores de la API, con los datos de las preguntas', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        statusCode: 409,
        message: 'Ya existe otra causa con ese número de expediente',
        codigo: 'EXPEDIENTE_REPETIDO',
      }),
    );

    const error = await causas
      .updateCausa(7, { numeroExpediente: '1/2024' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: 'Ya existe otra causa con ese número de expediente',
      details: { codigo: 'EXPEDIENTE_REPETIDO' },
    });
  });
});

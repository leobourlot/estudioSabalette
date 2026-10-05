import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeUsersService, testAccount } from '../pruebas/aplicacion-de-prueba';
import {
  currentPath,
  fakeCausasService,
  renderCausaPages,
  testCausaDetalle,
  testMember,
} from '../pruebas/causas-de-prueba';
import type { CreateCausaData, ResultadoAlta } from '../servicios/causas';
import { ApiError } from '../servicios/cliente-http';

const ana = testAccount({
  id: 12,
  rol: 'cliente',
  nombre: 'Ana',
  apellido: 'Gómez',
  cliente: {
    tipoPersona: 'fisica',
    dni: '30123456',
    cuit: null,
    razonSocial: null,
    telefono: null,
    domicilio: null,
  },
});

const members = [
  testMember({ id: 1, nombre: 'Juan', apellido: 'Álvarez' }),
  testMember({ id: 2, nombre: 'Lucía', apellido: 'Benítez' }),
];

const created = (overrides: Partial<ResultadoAlta> = {}): ResultadoAlta => ({
  causa: testCausaDetalle({ id: 9 }),
  rechazos: [],
  causasComoNoCliente: [],
  ...overrides,
});

const question = (message: string, details: Record<string, unknown>) =>
  new ApiError(409, [message], details);

function openNew(createCausa = vi.fn().mockResolvedValue(created())) {
  const causas = fakeCausasService({
    listMembers: vi.fn().mockResolvedValue(members),
    createCausa,
  });
  const users = fakeUsersService({
    listUsers: vi.fn().mockResolvedValue({ items: [ana], total: 1, pagina: 1, porPagina: 20 }),
  });
  const view = renderCausaPages('/panel/causas/nueva', causas, users);
  return { causas, view, user: userEvent.setup() };
}

type User = ReturnType<typeof userEvent.setup>;

async function fillCausa(user: User) {
  await user.type(screen.getByLabelText('Carátula'), 'López c/ Gómez s/ daños');
  await user.selectOptions(screen.getByLabelText('Fuero'), 'civil');
  await user.selectOptions(await screen.findByLabelText('Responsable'), '1');
}

async function addNonClient(user: User, nombre = 'Pedro', apellido = 'López') {
  await user.click(screen.getByLabelText('No es cliente'));
  await user.type(screen.getByLabelText('Nombre'), nombre);
  await user.type(screen.getByLabelText('Apellido'), apellido);
  await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
}

async function addAna(user: User) {
  await user.click(screen.getByLabelText('Cliente del estudio'));
  await user.click(screen.getByRole('button', { name: 'Buscar' }));
  await user.click(await screen.findByRole('button', { name: 'Gómez, Ana · DNI 30.123.456' }));
  await user.selectOptions(screen.getByLabelText('Rol procesal'), 'demandado');
  await user.click(screen.getByRole('button', { name: 'Agregar parte' }));
}

const partiesList = () =>
  within(screen.getByRole('list', { name: 'Partes cargadas' }))
    .getAllByRole('listitem')
    .map((item) => item.firstChild?.textContent);

const sentData = (createCausa: ReturnType<typeof vi.fn>, call = -1): CreateCausaData =>
  createCausa.mock.calls.at(call)![0];

describe('PanelCausaNueva (RF-6, RF-7)', () => {
  it('muestra los datos, los abogados y las partes', async () => {
    openNew();

    expect(await screen.findByRole('heading', { name: 'Nueva causa', level: 1 })).toBeTruthy();
    expect(screen.getByLabelText('Carátula')).toBeTruthy();
    expect(await screen.findByLabelText('Responsable')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Partes' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crear causa' })).toBeTruthy();
  });

  it('pide el responsable y al menos una parte antes de enviar', async () => {
    const { causas, user } = openNew();
    await screen.findByLabelText('Responsable');

    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    const messages = [...screen.getAllByRole('alert')[0].querySelectorAll('li')].map(
      (item) => item.textContent,
    );
    expect(messages).toEqual([
      'La carátula es obligatoria',
      'El fuero debe ser civil, penal, familia, laboral, federal u otro',
      'Elegí el responsable',
      'Agregá al menos una parte',
    ]);
    expect(causas.createCausa).not.toHaveBeenCalled();
  });

  it('agrega partes a la lista y las puede quitar', async () => {
    const { user } = openNew();
    await screen.findByLabelText('Responsable');

    await addNonClient(user);
    await addAna(user);
    expect(partiesList()).toEqual([
      'Pedro López · Actor',
      'Gómez, Ana · DNI 30.123.456 · Demandado',
    ]);

    await user.click(screen.getAllByRole('button', { name: 'Quitar' })[0]);
    expect(partiesList()).toEqual(['Gómez, Ana · DNI 30.123.456 · Demandado']);
  });

  it('crea la causa con sus datos, abogados y partes, y lleva al detalle', async () => {
    const createCausa = vi.fn().mockResolvedValue(created());
    const { view, user } = openNew(createCausa);
    await fillCausa(user);
    await user.click(screen.getByLabelText('Benítez, Lucía'));
    await addNonClient(user);
    await addAna(user);

    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    expect(sentData(createCausa)).toEqual({
      caratula: 'López c/ Gómez s/ daños',
      fuero: 'civil',
      estado: 'en_tramite',
      esIncidente: false,
      responsableId: 1,
      colaboradorIds: [2],
      partes: [
        { rol: 'actor', tipoPersona: 'fisica', nombre: 'Pedro', apellido: 'López' },
        { rol: 'demandado', clienteId: 12 },
      ],
    });
    expect(currentPath(view.container)).toBe('/panel/causas/9');
  });

  it('en el detalle informa lo que no se guardó y las causas donde el cliente figura como no cliente (RF-7, RF-20)', async () => {
    const createCausa = vi.fn().mockResolvedValue(
      created({
        rechazos: [
          { indiceParte: 1, mensajes: ['El cliente está desactivado'] },
          { colaboradorId: 2, mensajes: ['El integrante está desactivado'] },
        ],
        causasComoNoCliente: [
          { id: 3, caratula: 'López c/ Gómez s/ desalojo', numeroExpediente: '10/2023' },
        ],
      }),
    );
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await user.click(screen.getByLabelText('Benítez, Lucía'));
    await addNonClient(user);
    await addAna(user);

    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    const notSaved = await screen.findByRole('status', { name: 'No se guardaron' });
    expect([...notSaved.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Parte 2 (Gómez, Ana · DNI 30.123.456): El cliente está desactivado',
      'Colaborador Benítez, Lucía: El integrante está desactivado',
    ]);
    const asNonClient = screen.getByRole('status', { name: 'Causas como no cliente' });
    expect(
      within(asNonClient)
        .getByRole('link', { name: 'López c/ Gómez s/ desalojo (10/2023)' })
        .getAttribute('href'),
    ).toBe('/panel/causas/3');
  });

  it('pregunta por el expediente repetido y guarda al confirmar (RF-9)', async () => {
    const createCausa = vi
      .fn()
      .mockRejectedValueOnce(
        question('Ya existe otra causa con ese número de expediente', {
          codigo: 'EXPEDIENTE_REPETIDO',
        }),
      )
      .mockResolvedValueOnce(created());
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user);
    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

    expect(sentData(createCausa)).toMatchObject({ confirmarExpedienteRepetido: true });
  });

  it('si el DNI es de un cliente y se elige agregarlo como cliente, reenvía la parte como cliente (RF-16)', async () => {
    const createCausa = vi
      .fn()
      .mockRejectedValueOnce(
        question('Ese DNI o CUIT pertenece a un cliente del estudio', {
          codigo: 'DOCUMENTO_DE_CLIENTE',
          clienteId: 12,
          clienteActivo: true,
          indiceParte: 0,
        }),
      )
      .mockResolvedValueOnce(created());
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user, 'Ana', 'Gómez');
    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    expect(await screen.findByText('Parte 1: Ana Gómez')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Agregar como cliente' }));

    expect(sentData(createCausa).partes).toEqual([{ rol: 'actor', clienteId: 12 }]);
  });

  it('si es la misma persona, quita la parte y reenvía (RF-19)', async () => {
    const createCausa = vi
      .fn()
      .mockRejectedValueOnce(
        question('Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?', {
          codigo: 'NOMBRE_REPETIDO',
          indiceParte: 1,
        }),
      )
      .mockResolvedValueOnce(created());
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user);
    await addNonClient(user);
    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    await user.click(await screen.findByRole('button', { name: 'Es la misma persona' }));

    expect(sentData(createCausa).partes).toHaveLength(1);
    expect(sentData(createCausa, 0).partes).toHaveLength(2);
  });

  it('las respuestas se acumulan: una segunda pregunta conserva la primera respuesta', async () => {
    const createCausa = vi
      .fn()
      .mockRejectedValueOnce(
        question('Ya existe otra causa con ese número de expediente', {
          codigo: 'EXPEDIENTE_REPETIDO',
        }),
      )
      .mockRejectedValueOnce(
        question('Ya hay una parte con ese nombre en la causa. ¿Es la misma persona?', {
          codigo: 'NOMBRE_REPETIDO',
          indiceParte: 0,
        }),
      )
      .mockResolvedValueOnce(created());
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user);
    await user.click(screen.getByRole('button', { name: 'Crear causa' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar igual' }));

    await user.click(await screen.findByRole('button', { name: 'Es otra persona' }));

    expect(sentData(createCausa)).toMatchObject({
      confirmarExpedienteRepetido: true,
      partes: [expect.objectContaining({ confirmarNombreRepetido: true })],
    });
  });

  it('cancelar la pregunta no reenvía', async () => {
    const createCausa = vi.fn().mockRejectedValueOnce(
      question('Ya existe otra causa con ese número de expediente', {
        codigo: 'EXPEDIENTE_REPETIDO',
      }),
    );
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user);
    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(createCausa).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('muestra los errores de la API', async () => {
    const createCausa = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError(400, ['Parte 1: El cliente está desactivado'], { rechazos: [] }),
      );
    const { user } = openNew(createCausa);
    await fillCausa(user);
    await addNonClient(user);

    await user.click(screen.getByRole('button', { name: 'Crear causa' }));

    expect((await screen.findAllByRole('alert'))[0].textContent).toContain(
      'Parte 1: El cliente está desactivado',
    );
  });
});

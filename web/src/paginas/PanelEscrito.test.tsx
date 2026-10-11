import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fakeCausasService, testCausaDetalle } from '../pruebas/causas-de-prueba';
import {
  currentLocationState,
  currentPath,
  fakeModelosService,
  lawyerSession,
  modeloPage,
  renderModelsApp,
  testEscrito,
  testModeloResumen,
} from '../pruebas/modelos-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { EscritoCompletado } from '../servicios/modelos-escritos';

const LIST_STATE = {
  listaDeModelos: {
    filtros: { buscar: 'oficio', tipo: 'oficio', fuero: 'laboral', incluirDesactivados: false },
    pagina: 2,
  },
};

async function openEscrito(
  escrito: EscritoCompletado = testEscrito(),
  options: { state?: unknown } = {},
) {
  const modelos = fakeModelosService({
    completeModel: vi.fn().mockResolvedValue(escrito),
    listModels: vi.fn().mockResolvedValue(modeloPage([testModeloResumen()], { pagina: 2 })),
  });
  const causas = fakeCausasService({
    getCausa: vi.fn().mockResolvedValue(testCausaDetalle({ id: 5 })),
  });
  renderModelsApp('/panel/causas/5/modelos/8', {
    session: lawyerSession(),
    modelos,
    causas,
    state: options.state,
  });
  await screen.findByRole('region', { name: 'Escrito completado' });
  return { modelos, causas };
}

const escritoRegion = () => within(screen.getByRole('region', { name: 'Escrito completado' }));

describe('PanelEscrito: texto (RF-32, RF-33)', () => {
  it('pide el escrito del modelo y la causa de la dirección', async () => {
    const { modelos } = await openEscrito();

    expect(modelos.completeModel).toHaveBeenCalledExactlyOnceWith(5, 8);
  });

  it('muestra la carátula de la causa y el título del modelo', async () => {
    await openEscrito();

    expect(screen.getByRole('heading', { name: 'Escrito', level: 1 })).toBeTruthy();
    expect(screen.getByText('Gómez, Luis c/ Acme S.A. s/ daños')).toBeTruthy();
    expect(screen.getByText('Oficio al Registro de la Propiedad')).toBeTruthy();
  });

  it('muestra el texto completo como texto literal, con sus saltos de línea', async () => {
    const texto = 'Señor Juez:\n\n<b>Luis Gómez</b> & "Acme S.A.",\n(FALTA JUZGADO).';
    await openEscrito(testEscrito({ texto }));

    const paragraph = escritoRegion().getByText(/Señor Juez:/);
    expect(paragraph.textContent).toBe(texto);
    expect(paragraph.querySelector('b')).toBeNull();
    expect(paragraph.className).toContain('whitespace-pre-wrap');
  });

  it('un email del escrito se muestra como texto, no como enlace', async () => {
    await openEscrito(testEscrito({ texto: 'Domicilio electrónico: estudio@ejemplo.com' }));

    expect(escritoRegion().getByText(/estudio@ejemplo.com/)).toBeTruthy();
    expect(escritoRegion().queryByRole('link')).toBeNull();
  });

  it('el texto se puede seleccionar a mano (RF-45)', async () => {
    await openEscrito();

    const paragraph = escritoRegion().getByText(/Señor Director:/);
    expect(paragraph.className).not.toContain('select-none');
  });
});

describe('PanelEscrito: avisos (RF-39, RF-40)', () => {
  it('sin faltantes ni desactivados no muestra ningún aviso', async () => {
    await openEscrito();

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('avisa los datos que le faltan a la causa, cada uno una vez', async () => {
    await openEscrito(
      testEscrito({ faltantes: ['número de expediente', 'juzgado', 'DNI de Luis Gómez'] }),
    );

    const notice = within(screen.getByRole('status'));
    expect(notice.getByText('A esta causa le faltan datos que el modelo usa')).toBeTruthy();
    expect(notice.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'número de expediente',
      'juzgado',
      'DNI de Luis Gómez',
    ]);
  });

  it('avisa los clientes con la cuenta desactivada, con sus nombres', async () => {
    await openEscrito(testEscrito({ clientesDesactivados: ['Acme S.A.', 'María López'] }));

    const notice = within(screen.getByRole('status'));
    expect(notice.getByText('Hay clientes con la cuenta desactivada')).toBeTruthy();
    expect(notice.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Acme S.A.',
      'María López',
    ]);
  });

  it('avisa el responsable desactivado', async () => {
    await openEscrito(testEscrito({ responsableDesactivado: true }));

    expect(screen.getByRole('status').textContent).toBe(
      'El responsable de esta causa está desactivado',
    );
  });

  it('con los tres avisos, van arriba del escrito y en orden', async () => {
    await openEscrito(
      testEscrito({
        faltantes: ['juzgado'],
        clientesDesactivados: ['María López'],
        responsableDesactivado: true,
      }),
    );

    const notices = screen.getAllByRole('status');
    expect(notices).toHaveLength(3);
    const region = screen.getByRole('region', { name: 'Escrito completado' });
    for (const notice of notices) {
      expect(
        notice.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      // Los avisos no son parte del escrito.
      expect(region.contains(notice)).toBe(false);
    }
  });
});

describe('PanelEscrito: volver (RF-32)', () => {
  it('"Volver a la causa" lleva a la causa', async () => {
    await openEscrito();

    expect(screen.getByRole('link', { name: 'Volver a la causa' }).getAttribute('href')).toBe(
      '/panel/causas/5',
    );
  });

  it('"Volver a la lista de modelos" llega a la lista con la página, la búsqueda y los filtros que tenía', async () => {
    const { modelos } = await openEscrito(testEscrito(), { state: LIST_STATE });

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Volver a la lista de modelos' }));

    expect(
      await screen.findByRole('heading', { name: 'Completar un modelo', level: 1 }),
    ).toBeTruthy();
    expect(currentPath()).toBe('/panel/causas/5/modelos');
    expect(currentLocationState()).toEqual(LIST_STATE);
    await screen.findByRole('list', { name: 'Lista de modelos' });
    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({
      pagina: 2,
      buscar: 'oficio',
      tipo: 'oficio',
      fuero: 'laboral',
    });
    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('oficio');
  });

  it('si se llegó directo por la dirección, vuelve a la lista sin filtros', async () => {
    const { modelos } = await openEscrito();

    await userEvent
      .setup()
      .click(screen.getByRole('link', { name: 'Volver a la lista de modelos' }));

    await screen.findByRole('list', { name: 'Lista de modelos' });
    expect(currentLocationState()).toBeNull();
    expect(modelos.listModels).toHaveBeenCalledExactlyOnceWith({ pagina: 1 });
  });
});

describe('PanelEscrito: rechazos de la API (RF-26, RF-41, RF-49)', () => {
  it.each([
    'La causa está desactivada',
    'El modelo está desactivado',
    'No existe esa causa',
    'No existe ese modelo',
  ])('muestra "%s" y cómo volver, sin ningún escrito', async (message) => {
    const modelos = fakeModelosService({
      completeModel: vi.fn().mockRejectedValue(new ApiError(409, [message])),
    });
    renderModelsApp('/panel/causas/5/modelos/8', { session: lawyerSession(), modelos });

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.queryByRole('region', { name: 'Escrito completado' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Volver a la causa' }).getAttribute('href')).toBe(
      '/panel/causas/5',
    );
  });
});

describe('PanelEscrito: lo que no ofrece (RF-47)', () => {
  it('no hay opciones para descargar, imprimir, exportar, enviar, guardar ni modificar el escrito', async () => {
    await openEscrito();

    for (const role of ['button', 'link'] as const) {
      for (const element of screen.getAllByRole(role)) {
        expect(element.textContent).not.toMatch(
          /descargar|imprimir|exportar|enviar|guardar|editar|modificar|word|pdf/i,
        );
      }
    }
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();
    expect(document.querySelector('a[download]')).toBeNull();
  });
});

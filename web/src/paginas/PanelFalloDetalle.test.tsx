import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSessionService, testUser } from '../pruebas/aplicacion-de-prueba';
import {
  fakeJurisprudenciaService,
  renderRulingsApp,
  testFalloDetalle,
} from '../pruebas/jurisprudencia-de-prueba';
import { ApiError } from '../servicios/cliente-http';
import type { FalloDetalle, JurisprudenciaService } from '../servicios/jurisprudencia';

const REPEATED = {
  id: 3,
  caratula: 'Muñoz c/ Clínica del Sur',
  tribunal: 'Cámara Civil, Sala B',
  fecha: '2020-08-14',
  numero: '5678/2019',
};

const repeatedQuestion = () =>
  new ApiError(409, ['Ya existe un fallo con ese número en ese tribunal'], {
    codigo: 'FALLO_REPETIDO',
    fallo: REPEATED,
  });

async function openDetail(
  fallo: FalloDetalle = testFalloDetalle(),
  overrides: Partial<JurisprudenciaService> = {},
) {
  const service = fakeJurisprudenciaService({
    getRuling: vi.fn().mockResolvedValue(fallo),
    ...overrides,
  });
  renderRulingsApp(
    `/panel/jurisprudencia/${fallo.id}`,
    fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) }),
    service,
  );
  await screen.findByRole('region', { name: 'Datos del fallo' });
  return service;
}

const data = () => within(screen.getByRole('region', { name: 'Datos del fallo' }));
const change = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('PanelFalloDetalle (RF-17, RF-19, RF-29 a RF-32)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ficha (RF-19)', () => {
    it('pide el fallo de la dirección y muestra sus datos', async () => {
      const service = await openDetail();

      expect(service.getRuling).toHaveBeenCalledWith(5);
      expect(screen.getByRole('heading', { name: 'Fallo', level: 1 })).toBeTruthy();
      expect(data().getByText('Pérez c/ López s/ daños')).toBeTruthy();
      expect(data().getByText('CNCiv., Sala A')).toBeTruthy();
      expect(data().getByText('Civil')).toBeTruthy();
      expect(data().getByText('03/05/2019')).toBeTruthy();
      expect(data().getByText('1234/2018')).toBeTruthy();
      const keywords = within(data().getByRole('list', { name: 'Palabras clave del fallo' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent);
      expect(keywords).toEqual(['accidente de tránsito', 'daño moral']);
    });

    it('muestra el sumario completo como texto literal, con sus saltos de línea', async () => {
      // Más de 300 caracteres: en la ficha no se recorta.
      const sumario = `Primer párrafo con <b>etiquetas</b>.

${'Segundo párrafo.'.repeat(40)}`;
      await openDetail(testFalloDetalle({ sumario }));

      const text = data().getByText(/Primer párrafo/);
      expect(text.textContent).toBe(sumario);
      expect(text.querySelector('b')).toBeNull();
      expect(text.className).toContain('whitespace-pre-wrap');
    });

    it('muestra el enlace con su dominio destacado, que abre en otra pestaña sin referrer', async () => {
      await openDetail();

      const link = data().getByRole('link', { name: 'https://www.csjn.gov.ar/fallos/1234' });
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
      expect(data().getByLabelText('Sitio: www.csjn.gov.ar')).toBeTruthy();
    });

    it('un fallo sin número ni enlace muestra el dato vacío', async () => {
      await openDetail(testFalloDetalle({ numero: null, enlace: null }));

      expect(data().queryByRole('link')).toBeNull();
      expect(data().getAllByText('—')).toHaveLength(2);
    });

    it('muestra quién lo cargó y que no tiene modificaciones (RF-2)', async () => {
      await openDetail();

      const registro = within(screen.getByRole('region', { name: 'Registro' }));
      expect(registro.getByText(/^Cargado por Sosa, Luis el /)).toBeTruthy();
      expect(registro.getByText('Sin modificaciones desde la carga')).toBeTruthy();
    });

    it('marca a un autor que dejó el estudio como desactivado (RF-35)', async () => {
      await openDetail(
        testFalloDetalle({
          modificadoPor: { id: 2, nombre: 'Marta', apellido: 'Díaz', activo: false },
          modificadoEn: '2026-10-05T15:00:00.000Z',
        }),
      );

      const registro = within(screen.getByRole('region', { name: 'Registro' }));
      expect(
        registro.getByText(/^Modificado por última vez por Díaz, Marta \(desactivado\) el /),
      ).toBeTruthy();
    });

    it('si el fallo no existe, muestra el mensaje de la API y cómo volver (RF-33)', async () => {
      const service = fakeJurisprudenciaService({
        getRuling: vi.fn().mockRejectedValue(new ApiError(404, ['No existe ese fallo'])),
      });
      renderRulingsApp(
        '/panel/jurisprudencia/999',
        fakeSessionService({ fetchOwnUser: vi.fn().mockResolvedValue(testUser('abogado')) }),
        service,
      );

      expect((await screen.findByRole('alert')).textContent).toBe('No existe ese fallo');
      expect(
        screen.getByRole('link', { name: 'Volver a la jurisprudencia' }).getAttribute('href'),
      ).toBe('/panel/jurisprudencia');
    });
  });

  describe('modificación (RF-17, RF-18)', () => {
    it('abre el formulario con los datos del fallo y guarda solo lo que cambió', async () => {
      const updated = testFalloDetalle({
        tribunal: 'CNCiv., Sala B',
        modificadoPor: { id: 1, nombre: 'Ana', apellido: 'Gómez', activo: true },
        modificadoEn: '2026-10-09T15:00:00.000Z',
      });
      const service = await openDetail(testFalloDetalle(), {
        updateRuling: vi.fn().mockResolvedValue(updated),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      expect((screen.getByLabelText('Carátula') as HTMLInputElement).value).toBe(
        'Pérez c/ López s/ daños',
      );
      expect((screen.getByLabelText('Sumario') as HTMLTextAreaElement).value).toBe(
        'La responsabilidad del dueño de la cosa es objetiva.',
      );
      change('Tribunal', 'CNCiv., Sala B');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await data().findByText('CNCiv., Sala B')).toBeTruthy();
      expect(service.updateRuling).toHaveBeenCalledWith(5, { tribunal: 'CNCiv., Sala B' });
      expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
      expect(
        within(screen.getByRole('region', { name: 'Registro' })).getByText(
          /^Modificado por última vez por Gómez, Ana el /,
        ),
      ).toBeTruthy();
    });

    it('agregar una palabra clave envía la lista completa', async () => {
      const service = await openDetail(testFalloDetalle(), {
        updateRuling: vi.fn().mockResolvedValue(testFalloDetalle()),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      await user.type(screen.getByLabelText('Palabras clave'), 'culpa{Enter}');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await vi.waitFor(() =>
        expect(service.updateRuling).toHaveBeenCalledWith(5, {
          palabrasClave: ['accidente de tránsito', 'daño moral', 'culpa'],
        }),
      );
    });

    it('con datos inválidos muestra el error y no llama al servicio', async () => {
      const service = await openDetail();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      change('Carátula', '   ');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(screen.getByRole('alert').textContent).toContain('La carátula es obligatoria');
      expect(service.updateRuling).not.toHaveBeenCalled();
    });

    it('"Cancelar" cierra el formulario sin guardar', async () => {
      const service = await openDetail();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      change('Tribunal', 'Otro tribunal');
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(data().getByText('CNCiv., Sala A')).toBeTruthy();
      expect(service.updateRuling).not.toHaveBeenCalled();
    });

    it('ante un fallo repetido pregunta, y "Guardar igual" repite con la confirmación', async () => {
      const updateRuling = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testFalloDetalle({ numero: '5678/2019' }));
      const service = await openDetail(testFalloDetalle(), { updateRuling });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      change(/^Número/, '5678/2019');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(
        within(dialog).getByText('Ya existe un fallo con ese número en ese tribunal'),
      ).toBeTruthy();
      expect(
        within(screen.getByLabelText('Fallo con el que coincide')).getByRole('link', {
          name: 'Muñoz c/ Clínica del Sur',
        }),
      ).toBeTruthy();

      await user.click(within(dialog).getByRole('button', { name: 'Guardar igual' }));

      expect(await data().findByText('5678/2019')).toBeTruthy();
      expect(service.updateRuling).toHaveBeenNthCalledWith(1, 5, { numero: '5678/2019' });
      expect(service.updateRuling).toHaveBeenNthCalledWith(2, 5, {
        numero: '5678/2019',
        confirmarRepetido: true,
      });
    });

    it('"Cancelar" en la pregunta no guarda y deja el formulario abierto', async () => {
      const service = await openDetail(testFalloDetalle(), {
        updateRuling: vi.fn().mockRejectedValue(repeatedQuestion()),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      change(/^Número/, '5678/2019');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(service.updateRuling).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText(/^Número/) as HTMLInputElement).value).toBe('5678/2019');
    });

    it('muestra el rechazo de la API en el formulario (RF-30)', async () => {
      await openDetail(testFalloDetalle(), {
        updateRuling: vi
          .fn()
          .mockRejectedValue(
            new ApiError(409, ['El fallo está desactivado. Reactivalo para modificarlo']),
          ),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Editar' }));
      change('Tribunal', 'CNCiv., Sala B');
      await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect((await screen.findByRole('alert')).textContent).toContain(
        'El fallo está desactivado. Reactivalo para modificarlo',
      );
    });

    it('escribir en la edición mantiene la sesión (RF-20)', async () => {
      let now = 1_700_000_000_000;
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const service = await openDetail();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Editar' }));

      now += 5 * 60_000;
      change('Sumario', 'Sumario corregido.');

      await vi.waitFor(() => expect(service.keepSessionAlive).toHaveBeenCalledTimes(1));
    });
  });

  describe('desactivación y reactivación (RF-29 a RF-32)', () => {
    it('desactivar pide confirmación y deja el fallo solo para consultar y reactivar', async () => {
      const service = await openDetail(testFalloDetalle(), {
        deactivateRuling: vi.fn().mockResolvedValue(testFalloDetalle({ activo: false })),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      const dialog = screen.getByRole('alertdialog');
      expect(within(dialog).getByText('¿Desactivar este fallo?')).toBeTruthy();
      expect(service.deactivateRuling).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Sí, desactivar' }));

      expect(await screen.findByText('Desactivado')).toBeTruthy();
      expect(service.deactivateRuling).toHaveBeenCalledWith(5);
      expect(screen.getByRole('button', { name: 'Reactivar' })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    });

    it('cancelar la confirmación no desactiva', async () => {
      const service = await openDetail();
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Desactivar' }));
      await user.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
      );

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(service.deactivateRuling).not.toHaveBeenCalled();
    });

    it('un fallo desactivado se muestra como tal, sin acciones de edición (RF-30)', async () => {
      await openDetail(testFalloDetalle({ activo: false }));

      expect(screen.getByText('Desactivado')).toBeTruthy();
      expect(
        screen.getByText('Este fallo está desactivado: solo se puede consultar y reactivar.'),
      ).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
      expect(data().getByText('Pérez c/ López s/ daños')).toBeTruthy();
    });

    it('reactivar vuelve a mostrar las acciones de edición (RF-31)', async () => {
      const service = await openDetail(testFalloDetalle({ activo: false }), {
        reactivateRuling: vi.fn().mockResolvedValue(testFalloDetalle({ activo: true })),
      });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Reactivar' }));

      expect(await screen.findByRole('button', { name: 'Editar' })).toBeTruthy();
      expect(service.reactivateRuling).toHaveBeenCalledWith(5, false);
      expect(screen.queryByText('Desactivado')).toBeNull();
    });

    it('si al reactivar coincide con otro fallo, pregunta y "Guardar igual" lo reactiva (RF-31)', async () => {
      const reactivateRuling = vi
        .fn()
        .mockRejectedValueOnce(repeatedQuestion())
        .mockResolvedValueOnce(testFalloDetalle({ activo: true }));
      const service = await openDetail(testFalloDetalle({ activo: false }), { reactivateRuling });
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Reactivar' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(screen.getByText('Desactivado')).toBeTruthy();

      await user.click(within(dialog).getByRole('button', { name: 'Guardar igual' }));

      expect(await screen.findByRole('button', { name: 'Editar' })).toBeTruthy();
      expect(service.reactivateRuling).toHaveBeenNthCalledWith(1, 5, false);
      expect(service.reactivateRuling).toHaveBeenNthCalledWith(2, 5, true);
    });

    it.each([
      ['desactivar', 'El fallo ya está desactivado'],
      ['reactivar', 'El fallo ya está activo'],
    ])('muestra el rechazo de la API al %s (RF-32)', async (action, message) => {
      const rejected = vi.fn().mockRejectedValue(new ApiError(409, [message]));
      await openDetail(testFalloDetalle({ activo: action === 'desactivar' }), {
        deactivateRuling: rejected,
        reactivateRuling: rejected,
      });
      const user = userEvent.setup();

      if (action === 'desactivar') {
        await user.click(screen.getByRole('button', { name: 'Desactivar' }));
        await user.click(screen.getByRole('button', { name: 'Sí, desactivar' }));
      } else {
        await user.click(screen.getByRole('button', { name: 'Reactivar' }));
      }

      expect((await screen.findByRole('alert')).textContent).toContain(message);
    });
  });
});

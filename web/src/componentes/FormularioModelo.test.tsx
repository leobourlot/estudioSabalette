import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_MODEL_FORM, type ModelForm } from '../servicios/formulario-modelo';
import { VARIABLES } from '../servicios/texto-modelo';
import { FormularioModelo } from './FormularioModelo';

const VALID: ModelForm = {
  titulo: 'Oficio al Registro',
  tipo: 'oficio',
  fuero: 'civil',
  descripcion: 'Para pedir informes',
  texto: 'Señor Director:\n\nAutos "#CARATULA#".',
};

function renderForm(initial: ModelForm = EMPTY_MODEL_FORM, apiProblems: string[] = []) {
  const onSubmit = vi.fn();
  const onTyping = vi.fn();
  const onCancel = vi.fn();
  let current = initial;

  function Wrapper() {
    const [form, setForm] = useState(initial);
    current = form;
    return (
      <FormularioModelo
        value={form}
        onChange={setForm}
        submitLabel="Guardar modelo"
        onSubmit={onSubmit}
        onCancel={onCancel}
        apiProblems={apiProblems}
        onTyping={onTyping}
      />
    );
  }

  render(<Wrapper />);
  return { onSubmit, onTyping, onCancel, form: () => current };
}

const textArea = () => screen.getByLabelText('Texto del modelo') as HTMLTextAreaElement;

describe('FormularioModelo: campos (RF-1)', () => {
  it('muestra el título, el tipo, el fuero, la descripción y el texto', () => {
    renderForm();

    expect(screen.getByLabelText('Título')).toBeTruthy();
    expect(screen.getByLabelText('Tipo de escrito')).toBeTruthy();
    expect(screen.getByLabelText('Fuero')).toBeTruthy();
    expect(screen.getByLabelText('Descripción (opcional)')).toBeTruthy();
    expect(textArea()).toBeTruthy();
  });

  it('el fuero nace en "Otro" y no tiene una opción vacía', () => {
    renderForm();

    const fuero = screen.getByLabelText('Fuero') as HTMLSelectElement;
    expect(fuero.value).toBe('otro');
    expect([...fuero.options].map((option) => option.textContent)).toEqual([
      'Civil',
      'Penal',
      'Familia',
      'Laboral',
      'Federal',
      'Otro (sirve para cualquier fuero)',
    ]);
  });

  it('el tipo de escrito ofrece los siete tipos, sin ninguno elegido', () => {
    renderForm();

    const tipo = screen.getByLabelText('Tipo de escrito') as HTMLSelectElement;
    expect(tipo.value).toBe('');
    expect([...tipo.options].map((option) => option.textContent)).toEqual([
      'Elegí un tipo',
      'Demanda',
      'Contestación de demanda',
      'Escrito de trámite',
      'Recurso',
      'Oficio',
      'Cédula',
      'Otro',
    ]);
  });

  it('el contador cuenta el texto ya convertido, sobre 50.000', async () => {
    renderForm();
    expect(screen.getByText('0/50.000')).toBeTruthy();

    // La sangría y los espacios de más no cuentan; "…" cuenta como tres puntos.
    fireEvent.change(textArea(), { target: { value: '    uno   dos…  ' } });

    expect(screen.getByText('10/50.000')).toBeTruthy();
  });

  it('con los datos de un modelo, los muestra para modificarlos', () => {
    renderForm(VALID);

    expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Oficio al Registro');
    expect((screen.getByLabelText('Tipo de escrito') as HTMLSelectElement).value).toBe('oficio');
    expect((screen.getByLabelText('Fuero') as HTMLSelectElement).value).toBe('civil');
    expect(textArea().value).toBe(VALID.texto);
  });
});

describe('FormularioModelo: catálogo de variables (RF-11)', () => {
  it('muestra cada variable del catálogo con lo que pone', () => {
    renderForm();

    const catalog = within(screen.getByRole('region', { name: 'Variables' }));
    for (const variable of VARIABLES) {
      const button = catalog.getByRole('button', { name: `#${variable.nombre}#` });
      expect(button).toBeTruthy();
      expect(catalog.getByText(variable.descripcion)).toBeTruthy();
    }
    expect(catalog.getAllByRole('button')).toHaveLength(VARIABLES.length);
  });

  it('agrupa las variables por lo que usan', () => {
    renderForm();

    const catalog = within(screen.getByRole('region', { name: 'Variables' }));
    expect(catalog.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Datos de la causa',
      'Partes por rol',
      'Clientes de la causa',
      'Abogados',
      'Fecha del día',
    ]);
  });

  it('elegir una variable la inserta donde está el cursor', async () => {
    const { form } = renderForm({ ...VALID, texto: 'Autos "", digo:' });
    const user = userEvent.setup();

    textArea().setSelectionRange(7, 7);
    await user.click(screen.getByRole('button', { name: '#CARATULA#' }));

    expect(form().texto).toBe('Autos "#CARATULA#", digo:');
    expect(textArea().value).toBe('Autos "#CARATULA#", digo:');
  });

  it('elegir una variable reemplaza el texto seleccionado y deja el cursor después de la marca', async () => {
    const { form } = renderForm({ ...VALID, texto: 'Ante el juzgado, digo:' });
    const user = userEvent.setup();

    textArea().setSelectionRange(5, 15);
    await user.click(screen.getByRole('button', { name: '#JUZGADO#' }));

    expect(form().texto).toBe('Ante #JUZGADO#, digo:');
    expect(textArea().selectionStart).toBe(14);
    expect(textArea().selectionEnd).toBe(14);
    expect(document.activeElement).toBe(textArea());
  });

  it('insertar una variable cuenta como escritura', async () => {
    const { onTyping } = renderForm(VALID);

    await userEvent.setup().click(screen.getByRole('button', { name: '#FECHA#' }));

    expect(onTyping).toHaveBeenCalled();
  });
});

describe('FormularioModelo: validación (RF-6, RF-7, RF-10)', () => {
  it('con el formulario vacío muestra lo que falta y no envía', async () => {
    const { onSubmit } = renderForm();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar modelo' }));

    const alert = within(screen.getByRole('alert'));
    expect(alert.getByText('Indicá el título del modelo')).toBeTruthy();
    expect(alert.getByText('Indicá el tipo de escrito')).toBeTruthy();
    expect(alert.getByText('Indicá el texto del modelo')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con una variable que no existe muestra el mensaje y, debajo del texto, cuáles son', async () => {
    const { onSubmit } = renderForm({
      ...VALID,
      texto: 'Autos #Caratual# de #demandado#, del #fecha#.',
    });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar modelo' }));

    expect(
      within(screen.getByRole('alert')).getByText('El texto tiene variables que no existen'),
    ).toBeTruthy();
    expect(screen.getByText('Variables que no existen: #Caratual#, #demandado#')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('señala las variables que no existen mientras se escribe, antes de enviar', () => {
    renderForm(VALID);
    expect(screen.queryByText(/Variables que no existen/)).toBeNull();

    fireEvent.change(textArea(), { target: { value: 'Autos #CARATUAL#.' } });

    expect(screen.getByText('Variables que no existen: #CARATUAL#')).toBeTruthy();
  });

  it('con variables pegadas muestra el mensaje y no envía', async () => {
    const { onSubmit } = renderForm({ ...VALID, texto: 'Entre #ACTORES##DEMANDADOS#.' });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar modelo' }));

    expect(
      within(screen.getByRole('alert')).getByText('Las variables tienen que estar separadas'),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con un formulario válido, envía', async () => {
    const { onSubmit } = renderForm(VALID);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar modelo' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('muestra los mensajes que devolvió la API', () => {
    renderForm(VALID, ['El modelo está desactivado. Reactivalo para modificarlo']);

    expect(
      within(screen.getByRole('alert')).getByText(
        'El modelo está desactivado. Reactivalo para modificarlo',
      ),
    ).toBeTruthy();
  });
});

describe('FormularioModelo: escritura y acciones (RF-17)', () => {
  it('avisa cada cambio de un campo, para mantener la sesión mientras se escribe', async () => {
    const { onTyping, form } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Título'), 'Of');
    expect(onTyping).toHaveBeenCalledTimes(2);

    await user.selectOptions(screen.getByLabelText('Tipo de escrito'), 'cedula');
    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    await user.type(screen.getByLabelText('Descripción (opcional)'), 'x');
    fireEvent.change(textArea(), { target: { value: 'Texto' } });

    expect(onTyping).toHaveBeenCalledTimes(6);
    expect(form()).toEqual({
      titulo: 'Of',
      tipo: 'cedula',
      fuero: 'laboral',
      descripcion: 'x',
      texto: 'Texto',
    });
  });

  it('"Cancelar" no envía', async () => {
    const { onSubmit, onCancel } = renderForm(VALID);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mientras se envía, el botón de guardar queda deshabilitado', () => {
    render(
      <FormularioModelo
        value={VALID}
        onChange={() => {}}
        submitLabel="Guardar modelo"
        onSubmit={() => {}}
        enviando
      />,
    );

    expect(
      (screen.getByRole('button', { name: 'Guardar modelo' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

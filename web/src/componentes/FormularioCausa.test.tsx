import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { type CausaForm, EMPTY_CAUSA_FORM } from '../servicios/formulario-causa';
import { FormularioCausa } from './FormularioCausa';

/** Formulario controlado con su propio estado, como lo usan las páginas. */
function Harness({
  initial = EMPTY_CAUSA_FORM,
  onSubmit,
  extraProblems,
  apiProblems = [],
}: {
  initial?: CausaForm;
  onSubmit: (form: CausaForm) => void;
  extraProblems?: () => string[];
  apiProblems?: string[];
}) {
  const [form, setForm] = useState(initial);
  return (
    <FormularioCausa
      value={form}
      onChange={setForm}
      submitLabel="Guardar"
      onSubmit={() => onSubmit(form)}
      extraProblems={extraProblems}
      apiProblems={apiProblems}
    >
      <p>Sección extra</p>
    </FormularioCausa>
  );
}

describe('FormularioCausa (RF-1, RF-4, RF-5, RF-10)', () => {
  it('muestra los datos de la causa y las secciones extra', () => {
    render(<Harness onSubmit={vi.fn()} />);

    for (const label of [
      'Carátula',
      'Número de expediente',
      'Juzgado',
      'Fuero',
      'Estado',
      'Es incidente',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByText('Sección extra')).toBeTruthy();
    expect(screen.getByLabelText<HTMLSelectElement>('Estado').value).toBe('en_tramite');
  });

  it('el número del expediente principal aparece solo con la casilla "Es incidente" marcada', async () => {
    render(<Harness onSubmit={vi.fn()} />);
    const user = userEvent.setup();
    expect(screen.queryByLabelText('Número del expediente principal')).toBeNull();

    await user.click(screen.getByLabelText('Es incidente'));
    expect(screen.getByLabelText('Número del expediente principal')).toBeTruthy();

    await user.click(screen.getByLabelText('Es incidente'));
    expect(screen.queryByLabelText('Número del expediente principal')).toBeNull();
  });

  it('muestra los errores antes de enviar y no envía', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} extraProblems={() => ['Elegí el responsable']} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Es incidente'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const alert = screen.getByRole('alert');
    expect([...alert.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'La carátula es obligatoria',
      'El fuero debe ser civil, penal, familia, laboral, federal u otro',
      'Indicá el número del expediente principal',
      'Elegí el responsable',
    ]);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía los datos cargados cuando son válidos', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Carátula'), 'Pérez c/ Gómez');
    await user.type(screen.getByLabelText('Número de expediente'), '1234/2024');
    await user.selectOptions(screen.getByLabelText('Fuero'), 'laboral');
    await user.selectOptions(screen.getByLabelText('Estado'), 'paralizada');
    await user.click(screen.getByLabelText('Es incidente'));
    await user.type(screen.getByLabelText('Número del expediente principal'), '1000/2023');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith({
      caratula: 'Pérez c/ Gómez',
      numeroExpediente: '1234/2024',
      juzgado: '',
      fuero: 'laboral',
      estado: 'paralizada',
      esIncidente: true,
      expedientePrincipal: '1000/2023',
    });
  });

  it('muestra los errores que devolvió la API', () => {
    render(
      <Harness
        onSubmit={vi.fn()}
        apiProblems={['La carátula no puede tener más de 255 caracteres']}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'La carátula no puede tener más de 255 caracteres',
    );
  });
});

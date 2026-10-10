import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type FakeJurisprudenciaService,
  fakeJurisprudenciaService,
  testSuggestion,
} from '../pruebas/jurisprudencia-de-prueba';
import type { PalabraClave } from '../servicios/jurisprudencia';
import { ProveedorServicios } from './ProveedorServicios';
import { SelectorPalabrasClave } from './SelectorPalabrasClave';

const SUGGESTIONS = [testSuggestion(1, 'daño moral', 12), testSuggestion(2, 'daño emergente', 3)];

const serviceWith = (suggestions = SUGGESTIONS) =>
  fakeJurisprudenciaService({ suggestKeywords: vi.fn().mockResolvedValue(suggestions) });

/** Selector para la carga, con el estado que tendría el formulario. */
function LoadSelector({
  initial,
  onChange,
  onTyping,
}: {
  initial: string[];
  onChange: (value: string[]) => void;
  onTyping?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SelectorPalabrasClave
      modo="carga"
      value={value}
      onTyping={onTyping}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function FilterSelector({
  initial,
  onChange,
}: {
  initial: PalabraClave[];
  onChange: (value: PalabraClave[]) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SelectorPalabrasClave
      modo="filtro"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

function renderLoad(
  initial: string[] = [],
  jurisprudencia: FakeJurisprudenciaService = serviceWith(),
  onTyping?: () => void,
) {
  const onChange = vi.fn();
  render(
    <ProveedorServicios services={{ jurisprudencia }}>
      <LoadSelector initial={initial} onChange={onChange} onTyping={onTyping} />
    </ProveedorServicios>,
  );
  return { jurisprudencia, onChange, user: userEvent.setup() };
}

function renderFilter(
  initial: PalabraClave[] = [],
  jurisprudencia: FakeJurisprudenciaService = serviceWith(),
) {
  const onChange = vi.fn();
  render(
    <ProveedorServicios services={{ jurisprudencia }}>
      <FilterSelector initial={initial} onChange={onChange} />
    </ProveedorServicios>,
  );
  return { jurisprudencia, onChange, user: userEvent.setup() };
}

const input = () => screen.getByLabelText('Palabras clave');
const chosen = () =>
  within(screen.getByRole('list', { name: 'Palabras clave elegidas' }))
    .getAllByRole('listitem')
    .map((item) => item.firstChild?.textContent);

describe('SelectorPalabrasClave para la carga (RF-12 a RF-14)', () => {
  it('con un solo carácter no pide sugerencias', async () => {
    const { jurisprudencia, user } = renderLoad();

    await user.type(input(), 'd');
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(jurisprudencia.suggestKeywords).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Sugerencias' })).toBeNull();
  });

  it('desde 2 caracteres pide sugerencias para la carga y las muestra con su cantidad', async () => {
    const { jurisprudencia, user } = renderLoad();

    await user.type(input(), 'da');

    expect(await screen.findByRole('button', { name: 'daño moral (12)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'daño emergente (3)' })).toBeTruthy();
    expect(jurisprudencia.suggestKeywords).toHaveBeenCalledWith('da', 'carga');
  });

  it('espera a que se deje de escribir: no consulta en cada tecla', async () => {
    const { jurisprudencia, user } = renderLoad();

    await user.type(input(), 'daño mo');
    await screen.findByRole('button', { name: 'daño moral (12)' });

    expect(jurisprudencia.suggestKeywords).toHaveBeenCalledTimes(1);
    expect(jurisprudencia.suggestKeywords).toHaveBeenCalledWith('daño mo', 'carga');
  });

  it('elegir una sugerencia agrega el texto exacto del catálogo y limpia el campo', async () => {
    const { onChange, user } = renderLoad();

    await user.type(input(), 'DA');
    await user.click(await screen.findByRole('button', { name: 'daño moral (12)' }));

    expect(onChange).toHaveBeenLastCalledWith(['daño moral']);
    expect(chosen()).toEqual(['daño moral']);
    expect((input() as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('list', { name: 'Sugerencias' })).toBeNull();
  });

  it('no sugiere una palabra que ya está elegida', async () => {
    const { user } = renderLoad(['Daño Moral']);

    await user.type(input(), 'da');

    expect(await screen.findByRole('button', { name: 'daño emergente (3)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'daño moral (12)' })).toBeNull();
  });

  it('Enter agrega lo escrito, convertido, sin enviar el formulario que lo contiene', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const onChange = vi.fn();
    render(
      <ProveedorServicios services={{ jurisprudencia: serviceWith([]) }}>
        <form onSubmit={(event) => submit(event.nativeEvent)}>
          <LoadSelector initial={[]} onChange={onChange} />
        </form>
      </ProveedorServicios>,
    );
    const user = userEvent.setup();

    await user.type(input(), '  mala   praxis {Enter}');

    expect(onChange).toHaveBeenLastCalledWith(['mala praxis']);
    expect(submit).not.toHaveBeenCalled();
    expect((input() as HTMLInputElement).value).toBe('');
  });

  it('la coma también agrega lo escrito', async () => {
    const { onChange, user } = renderLoad(['daño moral']);

    await user.type(input(), 'culpa,');

    expect(onChange).toHaveBeenLastCalledWith(['daño moral', 'culpa']);
    expect(chosen()).toEqual(['daño moral', 'culpa']);
  });

  it('no repite una palabra igual por comparación flexible', async () => {
    const { user } = renderLoad(['daño moral']);

    await user.type(input(), 'DANO MORAL{Enter}');

    expect(chosen()).toEqual(['daño moral']);
  });

  it('Enter con el campo vacío no agrega nada', async () => {
    const { onChange, user } = renderLoad(['daño moral']);

    await user.type(input(), '   {Enter}');

    expect(onChange).toHaveBeenLastCalledWith(['daño moral']);
    expect(chosen()).toEqual(['daño moral']);
  });

  it('× quita la palabra', async () => {
    const { onChange, user } = renderLoad(['daño moral', 'culpa']);

    await user.click(screen.getByRole('button', { name: 'Quitar daño moral' }));

    expect(onChange).toHaveBeenLastCalledWith(['culpa']);
    expect(chosen()).toEqual(['culpa']);
  });

  it('avisa cada tecla, para mantener la sesión mientras se escribe (RF-20)', async () => {
    const onTyping = vi.fn();
    const { user } = renderLoad([], serviceWith([]), onTyping);

    await user.type(input(), 'dañ');

    expect(onTyping).toHaveBeenCalledTimes(3);
  });

  it('muestra el error si no se pueden pedir las sugerencias', async () => {
    const jurisprudencia = fakeJurisprudenciaService({
      suggestKeywords: vi.fn().mockRejectedValue(new Error('sin conexión')),
    });
    const { user } = renderLoad([], jurisprudencia);

    await user.type(input(), 'da');

    expect((await screen.findByRole('alert')).textContent).not.toBe('');
  });
});

describe('SelectorPalabrasClave para el filtro (RF-25)', () => {
  it('pide las sugerencias para el filtro', async () => {
    const { jurisprudencia, user } = renderFilter();

    await user.type(input(), 'da');
    await screen.findByRole('button', { name: 'daño moral (12)' });

    expect(jurisprudencia.suggestKeywords).toHaveBeenCalledWith('da', 'filtro');
  });

  it('elegir una sugerencia agrega la palabra con su id', async () => {
    const { onChange, user } = renderFilter([{ id: 9, texto: 'culpa' }]);

    await user.type(input(), 'da');
    await user.click(await screen.findByRole('button', { name: 'daño emergente (3)' }));

    expect(onChange).toHaveBeenLastCalledWith([
      { id: 9, texto: 'culpa' },
      { id: 2, texto: 'daño emergente' },
    ]);
  });

  it('solo se pueden elegir sugerencias: Enter y la coma no agregan lo escrito', async () => {
    const { onChange, user } = renderFilter();

    await user.type(input(), 'palabra nueva{Enter}');
    await user.type(input(), ',');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: 'Palabras clave elegidas' })).toBeNull();
  });

  it('× quita la palabra del filtro', async () => {
    const { onChange, user } = renderFilter([
      { id: 9, texto: 'culpa' },
      { id: 1, texto: 'daño moral' },
    ]);

    await user.click(screen.getByRole('button', { name: 'Quitar culpa' }));

    expect(onChange).toHaveBeenLastCalledWith([{ id: 1, texto: 'daño moral' }]);
  });
});

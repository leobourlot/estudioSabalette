import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABOGADAS, type Abogada, TITULO_PROFESIONAL } from '../servicios/contenido-sitio';
import { FotoAbogada } from './FotoAbogada';
import { TarjetaAbogada } from './TarjetaAbogada';

const carolina = ABOGADAS[0];
const vanesa = ABOGADAS[1];
const withPhoto: Abogada = { ...vanesa, foto: '/fotos/vanesa-sabalette-rabello.jpg' };
const withoutPhoto: Abogada = { ...vanesa, foto: null };
/** Una integrante que se suma sin sus textos (RF-20). */
const withoutTexts: Abogada = {
  slug: 'nueva-integrante',
  nombre: 'Nueva Integrante',
  titulo: TITULO_PROFESIONAL,
  foto: null,
  resumen: null,
  texto: null,
};

const initials = (text: string) => screen.getByText(text);
const photo = () => screen.queryByRole('img', { name: 'Foto de la Dra. Vanesa Sabalette Rabello' });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FotoAbogada (spec 007, RF-21)', () => {
  it('sin foto muestra las iniciales, que no se anuncian', () => {
    render(<FotoAbogada abogada={withoutPhoto} tamano="mediana" />);

    expect(initials('VSR').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('mientras la foto carga, las iniciales se ven y la foto todavía no', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(initials('VSR')).toBeTruthy();
    expect(photo()!.className).toContain('opacity-0');
  });

  it('al cargar, la foto se muestra encima, con tamaño fijo y su texto alternativo', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="grande" />);

    fireEvent.load(photo()!);

    expect(photo()!.className).toContain('opacity-100');
    expect(photo()!.getAttribute('width')).toBe('192');
    expect(photo()!.getAttribute('height')).toBe('192');
    expect(photo()!.getAttribute('src')).toBe('/fotos/vanesa-sabalette-rabello.jpg');
  });

  it('si la foto no carga, la quita y quedan las iniciales', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    fireEvent.error(photo()!);

    expect(photo()).toBeNull();
    expect(initials('VSR')).toBeTruthy();
  });

  it('si la foto ya estaba rota al montarse, la quita', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);

    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(photo()).toBeNull();
  });

  it('si la foto ya estaba cargada al montarse, la muestra', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(600);

    render(<FotoAbogada abogada={withPhoto} tamano="mediana" />);

    expect(photo()!.className).toContain('opacity-100');
  });

  it('en las tarjetas carga la foto diferida', () => {
    render(<FotoAbogada abogada={withPhoto} tamano="mediana" diferida />);

    expect(photo()!.getAttribute('loading')).toBe('lazy');
  });
});

describe('TarjetaAbogada (spec 007, RF-18 y RF-20)', () => {
  it('con sus textos: foto, nombre, título profesional, resumen y "Más información" a su página', () => {
    render(<TarjetaAbogada abogada={vanesa} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Dra. Vanesa Sabalette Rabello' }),
    ).toBeTruthy();
    expect(screen.getByText(TITULO_PROFESIONAL)).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Foto de la Dra. Vanesa Sabalette Rabello' }),
    ).toBeTruthy();
    expect(screen.getByText(vanesa.resumen!)).toBeTruthy();
    const link = screen.getByRole('link', {
      name: 'Más información sobre la Dra. Vanesa Sabalette Rabello',
    });
    expect(link.getAttribute('href')).toBe('/abogadas/vanesa-sabalette-rabello');
    expect(initials('VSR')).toBeTruthy();
  });

  it('la de Carolina Marisa Pertusatti, con su foto, su resumen y su página', () => {
    render(<TarjetaAbogada abogada={carolina} />);

    expect(
      screen.getByRole('heading', { level: 3, name: 'Dra. Carolina Marisa Pertusatti' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Foto de la Dra. Carolina Marisa Pertusatti' }),
    ).toBeTruthy();
    expect(screen.getByText(carolina.resumen!)).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Más información sobre la Dra. Carolina Marisa Pertusatti' })
        .getAttribute('href'),
    ).toBe('/abogadas/carolina-pertusatti');
    expect(initials('CMP')).toBeTruthy();
  });

  it('sin sus textos: solo foto, nombre y título profesional', () => {
    const { container } = render(<TarjetaAbogada abogada={withoutTexts} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Dra. Nueva Integrante' })).toBeTruthy();
    expect(initials('NI')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    expect(Array.from(container.querySelectorAll('p')).map((p) => p.textContent)).toEqual([
      TITULO_PROFESIONAL,
    ]);
  });
});

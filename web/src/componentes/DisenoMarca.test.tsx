import { render, screen, within } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { STUDIO_CONTACT, whatsappUrl } from '../servicios/datos-estudio';
import { LOGO_PATH } from '../servicios/marca';
import { DisenoMarca } from './DisenoMarca';
import { COLORES_REDES } from './IconosRedes';

function renderBrand(props: Partial<Parameters<typeof DisenoMarca>[0]> = {}) {
  return render(
    <LazyMotion features={domAnimation}>
      <DisenoMarca {...props}>
        <h1>Ingresar</h1>
      </DisenoMarca>
    </LazyMotion>,
  );
}

describe('DisenoMarca (spec 008, RF-11, RF-12 y RF-14)', () => {
  it('el logo y el nombre llevan al sitio público, sin anunciar el logo dos veces', () => {
    renderBrand();

    const home = screen.getByRole('link', { name: STUDIO_CONTACT.nombre });
    expect(home.getAttribute('href')).toBe('/');
    const logo = home.querySelector('img')!;
    expect(logo.getAttribute('src')).toBe(LOGO_PATH);
    expect(logo.getAttribute('alt')).toBe('');
  });

  it('la tarjeta va en la región principal, con lugar abajo para el botón de WhatsApp', () => {
    renderBrand();

    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { name: 'Ingresar' })).toBeTruthy();
    expect(main.className).toContain('pb-24');
  });

  it('con contacto, muestra la dirección y el WhatsApp sin mensaje, separados por " · "', () => {
    renderBrand({ conContacto: true });

    const whatsapp = screen.getByRole('link', { name: STUDIO_CONTACT.whatsappVisible });
    expect(whatsapp.getAttribute('href')).toBe(whatsappUrl());
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    expect(whatsapp.getAttribute('rel')).toBe('noopener noreferrer');
    expect(whatsapp.parentElement!.textContent).toBe(
      `Pueyrredón Nº 47, Concordia · ${STUDIO_CONTACT.whatsappVisible}`,
    );
  });

  it('antes del número va el ícono de WhatsApp en verde, con su contorno, sin anunciarse', () => {
    renderBrand({ conContacto: true });

    const whatsapp = screen.getByRole('link', { name: STUDIO_CONTACT.whatsappVisible });
    const icon = whatsapp.querySelector('svg')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(whatsapp.firstElementChild).toBe(icon);
    const fills = Array.from(icon.querySelectorAll('[fill]')).map((e) => e.getAttribute('fill'));
    expect(fills).toContain(COLORES_REDES.whatsapp);
    expect(icon.querySelector('[stroke="#FCFFFF"]')).toBeTruthy();
  });

  it('sin dirección informada, solo el WhatsApp, sin " · " (spec 007, RF-24)', () => {
    renderBrand({ conContacto: true, contact: { ...STUDIO_CONTACT, direccion: null } });

    const whatsapp = screen.getByRole('link', { name: STUDIO_CONTACT.whatsappVisible });
    expect(whatsapp.parentElement!.textContent).toBe(STUDIO_CONTACT.whatsappVisible);
  });

  it('sin contacto, no muestra la dirección ni el WhatsApp (RF-14)', () => {
    renderBrand();

    expect(screen.queryByRole('link', { name: STUDIO_CONTACT.whatsappVisible })).toBeNull();
    expect(screen.queryByText(/Pueyrredón/)).toBeNull();
  });
});

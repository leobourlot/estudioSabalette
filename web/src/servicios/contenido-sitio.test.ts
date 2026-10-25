import { describe, expect, it } from 'vitest';
import {
  annexSection,
  listItems,
  quoteBlocks,
  quoteParagraphs,
  quotesByItem,
  quotedStrings,
  quoteText,
} from '../pruebas/anexo-spec-007';
import {
  ABOGADAS,
  lawyerName,
  APERTURA,
  type Bloque,
  CAUSA_EJEMPLO,
  copyrightNotice,
  hasOwnPage,
  INGRESO_EJEMPLO,
  INTRO_SERVICIOS,
  MENSAJES_WHATSAPP,
  PESTANAS_LABORAL,
  SERVICIOS,
  TEXTOS,
  TITULO_PROFESIONAL,
  type ClaveServicio,
} from './contenido-sitio';

const service = (clave: ClaveServicio) => SERVICIOS.find((s) => s.clave === clave)!;
const lawyer = (slug: string) => ABOGADAS.find((a) => a.slug === slug)!;

describe('textos del sitio contra el anexo de la spec 007 (RF-2)', () => {
  it('T-1, apertura del inicio', () => {
    expect(APERTURA).toBe(quoteText(annexSection('T-1')));
  });

  it('T-2, encabezado de la sección Servicios', () => {
    expect(INTRO_SERVICIOS).toBe(quoteText(annexSection('T-2')));
  });

  it('T-3 a T-6, frases de las tarjetas', () => {
    const phrases = quotesByItem(annexSection('T-3 a T-6'));

    expect(service('derecho-laboral').frase).toBe(phrases.get('T-3, Derecho Laboral:'));
    expect(service('accidentes').frase).toBe(
      phrases.get('T-4, Accidentes y Enfermedades Laborales:'),
    );
    expect(service('danos').frase).toBe(phrases.get('T-5, Derecho de Daños:'));
    expect(service('sucesiones').frase).toBe(phrases.get('T-6, Sucesiones:'));
  });

  it('T-7, destacados de la pestaña Empresas', () => {
    expect(PESTANAS_LABORAL[0].destacados).toEqual(listItems(annexSection('T-7')));
  });

  it('T-8 y T-9, pestañas de Derecho Laboral', () => {
    expect(PESTANAS_LABORAL[0].bloques).toEqual(quoteBlocks(annexSection('T-8')));
    expect(PESTANAS_LABORAL[1].bloques).toEqual(quoteBlocks(annexSection('T-9')));
  });

  it('T-10 a T-12, páginas de servicio', () => {
    expect(service('accidentes').bloques).toEqual(quoteBlocks(annexSection('T-10')));
    expect(service('danos').bloques).toEqual(quoteBlocks(annexSection('T-11')));
    expect(service('sucesiones').bloques).toEqual(quoteBlocks(annexSection('T-12')));
  });

  it('T-22, causa de ejemplo de la maqueta del portal', () => {
    const section = annexSection('T-22');
    const line = (prefix: string) => section.filter((l) => l.startsWith(`- ${prefix}:`));
    const pairs = quotedStrings(line('Datos')[0]);

    expect([CAUSA_EJEMPLO.caratula]).toEqual(quotedStrings(line('Carátula')[0]));
    expect(CAUSA_EJEMPLO.datos.flat()).toEqual(pairs);
    expect(CAUSA_EJEMPLO.movimientos.map((m) => [m.fecha, m.tipo, m.texto])).toEqual(
      line('Movimiento').map(quotedStrings),
    );
  });

  it('T-22, ingreso de ejemplo de la maqueta del portal', () => {
    const ingreso = annexSection('T-22').find((l) => l.startsWith('- Ingreso:'))!;
    const { titulo, etiquetaEmail, email, etiquetaContrasena, boton, largoContrasena } =
      INGRESO_EJEMPLO;

    expect([titulo, etiquetaEmail, email, etiquetaContrasena, boton]).toEqual(
      quotedStrings(ingreso),
    );
    expect(ingreso).toContain(`${largoContrasena} puntos`);
  });

  it('T-19 y T-20, resumen y texto completo de Carolina Marisa Pertusatti', () => {
    const carolina = lawyer('carolina-pertusatti');

    expect(carolina.resumen).toBe(quoteText(annexSection('T-19')));
    expect(carolina.texto).toEqual(quoteParagraphs(annexSection('T-20')));
  });

  it('T-13 y T-14, resumen y texto completo de Vanesa Sabalette Rabello', () => {
    const vanesa = lawyer('vanesa-sabalette-rabello');

    expect(vanesa.resumen).toBe(quoteText(annexSection('T-13')));
    expect(vanesa.texto).toEqual(quoteParagraphs(annexSection('T-14')));
  });

  it('la comparación detecta una letra cambiada (caso de control)', () => {
    const altered: Bloque[] = structuredClone(service('sucesiones').bloques) as Bloque[];
    const first = altered[0];
    if (first.tipo === 'parrafo') altered[0] = { ...first, texto: first.texto.replace('A', 'a') };

    expect(altered).not.toEqual(quoteBlocks(annexSection('T-12')));
  });

  it('el anexo tiene las listas completas: nueve puntos en las pestañas y siete en Sucesiones', () => {
    const items = (blocks: readonly Bloque[]) =>
      blocks.flatMap((block) => (block.tipo === 'lista' ? block.items : []));

    expect(items(PESTANAS_LABORAL[0].bloques)).toHaveLength(9);
    expect(items(PESTANAS_LABORAL[1].bloques)).toHaveLength(9);
    expect(items(service('sucesiones').bloques)).toHaveLength(7);
  });
});

describe('servicios (RF-12, RF-13)', () => {
  it('van en el orden de las tarjetas', () => {
    expect(SERVICIOS.map((s) => s.clave)).toEqual([
      'derecho-laboral',
      'accidentes',
      'danos',
      'sucesiones',
    ]);
  });

  it('tienen el nombre de la tarjeta y el título de su página', () => {
    expect(SERVICIOS.map((s) => [s.nombre, s.titulo])).toEqual([
      ['Derecho Laboral', 'Derecho Laboral'],
      ['Accidentes y Enfermedades Laborales', 'Accidentes de trabajo y enfermedades profesionales'],
      ['Derecho de Daños', 'Derecho de Daños'],
      ['Sucesiones', 'Sucesiones'],
    ]);
  });

  it('tienen sus direcciones (RF-8)', () => {
    expect(SERVICIOS.map((s) => s.ruta)).toEqual([
      '/servicios/derecho-laboral/empresas',
      '/servicios/accidentes-de-trabajo',
      '/servicios/derecho-de-danos',
      '/servicios/sucesiones',
    ]);
  });

  it('las pestañas de Derecho Laboral van en orden, con su dirección', () => {
    expect(PESTANAS_LABORAL.map((p) => [p.clave, p.etiqueta, p.ruta])).toEqual([
      ['empresas', 'Empresas', '/servicios/derecho-laboral/empresas'],
      ['trabajadores', 'Trabajadores', '/servicios/derecho-laboral/trabajadores'],
    ]);
    expect(PESTANAS_LABORAL[1].destacados).toEqual([]);
  });
});

describe('causa de ejemplo del portal (RF-41, RF-47)', () => {
  it('tiene los cuatro datos del portal, en su orden', () => {
    expect(CAUSA_EJEMPLO.datos.map(([etiqueta]) => etiqueta)).toEqual([
      'Expediente',
      'Juzgado',
      'Fuero',
      'Estado',
    ]);
  });

  it('los movimientos van del más reciente al más antiguo, como en el portal', () => {
    const fechas = CAUSA_EJEMPLO.movimientos.map((m) => m.fecha.split('/').reverse().join('-'));

    expect(fechas).toEqual([...fechas].sort().reverse());
  });
});

describe('abogadas (RF-18 a RF-20)', () => {
  it('van en el orden del logo', () => {
    expect(ABOGADAS.map((a) => a.nombre)).toEqual([
      'Carolina Marisa Pertusatti',
      'Vanesa Sabalette Rabello',
    ]);
  });

  it('se muestran con "Dra." adelante', () => {
    expect(ABOGADAS.map(lawyerName)).toEqual([
      'Dra. Carolina Marisa Pertusatti',
      'Dra. Vanesa Sabalette Rabello',
    ]);
  });

  it('las dos tienen su resumen y su texto, y por eso su página', () => {
    expect(hasOwnPage(lawyer('carolina-pertusatti'))).toBe(true);
    expect(hasOwnPage(lawyer('vanesa-sabalette-rabello'))).toBe(true);
  });

  it('sin el resumen o sin el texto, no tiene página', () => {
    const vanesa = lawyer('vanesa-sabalette-rabello');

    expect(hasOwnPage({ ...vanesa, resumen: null })).toBe(false);
    expect(hasOwnPage({ ...vanesa, texto: null })).toBe(false);
  });

  it('tienen su foto en public/fotos (RF-21)', () => {
    expect(ABOGADAS.map((a) => a.foto)).toEqual([
      '/fotos/carolina-pertusatti.jpg',
      '/fotos/vanesa-sabalette-rabello.jpg',
    ]);
  });

  it('las dos llevan el título profesional de T-21', () => {
    expect(TITULO_PROFESIONAL).toBe(quoteText(annexSection('T-21')));
    expect(ABOGADAS.map((a) => a.titulo)).toEqual([TITULO_PROFESIONAL, TITULO_PROFESIONAL]);
  });
});

describe('mensajes de WhatsApp contra el anexo (T-15, RF-27)', () => {
  const messages = quotesByItem(annexSection('T-15'));

  it('cada página pública tiene el suyo', () => {
    expect(MENSAJES_WHATSAPP.general).toBe(
      messages.get('Inicio, páginas de las abogadas y página de dirección inexistente:'),
    );
    expect(MENSAJES_WHATSAPP.empresas).toBe(messages.get('Derecho Laboral, pestaña Empresas:'));
    expect(MENSAJES_WHATSAPP.trabajadores).toBe(
      messages.get('Derecho Laboral, pestaña Trabajadores:'),
    );
    expect(MENSAJES_WHATSAPP.accidentes).toBe(
      messages.get('Accidentes de trabajo y enfermedades profesionales:'),
    );
    expect(MENSAJES_WHATSAPP.danos).toBe(messages.get('Derecho de Daños:'));
    expect(MENSAJES_WHATSAPP.sucesiones).toBe(messages.get('Sucesiones:'));
  });

  it('no hay mensajes que el anexo no tenga', () => {
    expect(Object.keys(MENSAJES_WHATSAPP)).toHaveLength(messages.size);
  });
});

describe('textos de la interfaz contra el anexo (T-17)', () => {
  const lineFor = (prefix: string) => {
    const line = annexSection('T-17').find((l) => l.startsWith(`- ${prefix}:`));
    if (!line) throw new Error(`No está "${prefix}" en T-17`);
    return quotedStrings(line);
  };

  it('menú y encabezado', () => {
    expect(Object.values(TEXTOS.menu)).toEqual(lineFor('Menú y encabezado'));
  });

  it('inicio', () => {
    expect(Object.values(TEXTOS.inicio)).toEqual(lineFor('Inicio'));
  });

  it('portal de clientes', () => {
    expect(Object.values(TEXTOS.portal)).toEqual(lineFor('Portal de clientes'));
  });

  it('páginas de detalle, con las etiquetas de las pestañas', () => {
    expect(Object.values(TEXTOS.detalle)).toEqual(lineFor('Páginas de detalle'));
    expect(PESTANAS_LABORAL.map((p) => p.etiqueta)).toEqual([
      TEXTOS.detalle.empresas,
      TEXTOS.detalle.trabajadores,
    ]);
  });

  it('contacto', () => {
    expect(Object.values(TEXTOS.contacto)).toEqual(lineFor('Contacto'));
  });

  it('botón de WhatsApp', () => {
    expect([TEXTOS.botonWhatsapp]).toEqual(lineFor('Botón de WhatsApp'));
  });

  it('dirección inexistente', () => {
    expect(Object.values(TEXTOS.noEncontrada)).toEqual(lineFor('Dirección inexistente'));
  });
});

describe('pie de página contra el anexo (T-18, RF-44)', () => {
  const section = annexSection('T-18');
  const line = (prefix: string) => section.find((l) => l.startsWith(`- ${prefix}:`))!;

  it('la leyenda de derechos, con el año', () => {
    expect([TEXTOS.pie.derechos]).toEqual(quotedStrings(line('Derechos')));
    expect(copyrightNotice(2026)).toBe(
      '© 2026 - Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.',
    );
  });

  it('"Diseñado por" y Bourder Web, con su dirección', () => {
    expect([TEXTOS.pie.disenadoPor, TEXTOS.pie.bourderWeb]).toEqual(quotedStrings(line('Diseño')));
    expect(line('Diseño')).toContain(TEXTOS.pie.bourderWebUrl);
  });
});

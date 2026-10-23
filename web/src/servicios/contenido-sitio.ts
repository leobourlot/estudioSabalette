/**
 * Contenido del sitio público (spec 007, RF-2 y anexo "Textos aprobados"). Son los textos de la
 * clienta y los aprobados para la spec, palabra por palabra, como datos sin formato: los
 * componentes solo los muestran. Un test los compara con el anexo de la spec. Cambiar un texto
 * exige cambiar primero la spec. No importa React (principio 3).
 */

export type Bloque =
  { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: readonly string[] };

const p = (texto: string): Bloque => ({ tipo: 'parrafo', texto });
const list = (...items: string[]): Bloque => ({ tipo: 'lista', items });

/** T-1. */
export const APERTURA =
  'Brindamos asesoramiento jurídico integral, con especial dedicación al Derecho Laboral.';

/** T-2. */
export const INTRO_SERVICIOS =
  'Nuestro trabajo parte del análisis particular de cada situación, priorizando soluciones estratégicas y negociadas cuando resultan convenientes, y una defensa judicial sólida cuando el conflicto requiere acudir a los tribunales.';

export type ClaveServicio = 'derecho-laboral' | 'accidentes' | 'danos' | 'sucesiones';

export interface Servicio {
  clave: ClaveServicio;
  /** En la tarjeta y en los accesos (RF-13). */
  nombre: string;
  /** Título de su página (RF-13). */
  titulo: string;
  /** Frase de la tarjeta (T-3 a T-6). */
  frase: string;
  /** Dirección de su página (RF-8). La de Derecho Laboral es la de la pestaña Empresas. */
  ruta: string;
  /** Texto de su página (T-10 a T-12). Derecho Laboral lo tiene en sus pestañas. */
  bloques: readonly Bloque[];
}

export type ClavePestana = 'empresas' | 'trabajadores';

export interface PestanaLaboral {
  clave: ClavePestana;
  etiqueta: string;
  ruta: string;
  /** T-7, solo en Empresas (RF-17). */
  destacados: readonly string[];
  bloques: readonly Bloque[];
}

/** Derecho Laboral, pestaña Empresas (T-7 y T-8) y pestaña Trabajadores (T-9). */
export const PESTANAS_LABORAL: readonly PestanaLaboral[] = [
  {
    clave: 'empresas',
    etiqueta: 'Empresas',
    ruta: '/servicios/derecho-laboral/empresas',
    destacados: [
      'Asesoramiento laboral preventivo',
      'Gestión de contingencias',
      'Acompañamiento permanente',
    ],
    bloques: [
      p(
        'Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales, procurando anticipar contingencias y brindar respuestas claras frente a situaciones que requieren decisiones rápidas y jurídicamente seguras.',
      ),
      p('Nuestro asesoramiento comprende, entre otros aspectos:'),
      list(
        'Contratación, registración y modalidades de trabajo.',
        'Remuneraciones, jornada, licencias y condiciones laborales.',
        'Aplicación e interpretación de convenios colectivos de trabajo.',
        'Sanciones disciplinarias y conflictos durante la relación laboral.',
        'Desvinculaciones y estrategias de negociación.',
        'Intercambios telegráficos.',
        'Conciliaciones y acuerdos laborales.',
        'Prevención de contingencias y planificación de estrategias.',
        'Representación y defensa en procesos judiciales laborales.',
      ),
    ],
  },
  {
    clave: 'trabajadores',
    etiqueta: 'Trabajadores',
    ruta: '/servicios/derecho-laboral/trabajadores',
    destacados: [],
    bloques: [
      p(
        'Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral, desde la primera consulta y el intercambio telegráfico hasta la negociación o eventual instancia judicial.',
      ),
      p('Intervenimos especialmente en:'),
      list(
        'Despidos y diferencias indemnizatorias.',
        'Trabajo no registrado o deficientemente registrado.',
        'Diferencias salariales y de categoría.',
        'Modificaciones de las condiciones de trabajo.',
        'Licencias y enfermedades inculpables.',
        'Situaciones de discriminación y conflictos laborales.',
        'Intercambios telegráficos.',
        'Negociaciones y acuerdos.',
        'Reclamos y procesos judiciales laborales.',
      ),
    ],
  },
];

/** Los cuatro servicios, en el orden de las tarjetas (RF-12). */
export const SERVICIOS: readonly Servicio[] = [
  {
    clave: 'derecho-laboral',
    nombre: 'Derecho Laboral',
    titulo: 'Derecho Laboral',
    frase:
      'Acompañamos tanto a empresas como a trabajadores en la prevención, gestión y resolución de conflictos.',
    ruta: PESTANAS_LABORAL[0].ruta,
    bloques: [],
  },
  {
    clave: 'accidentes',
    nombre: 'Accidentes y Enfermedades Laborales',
    titulo: 'Accidentes de trabajo y enfermedades profesionales',
    frase:
      'Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral.',
    ruta: '/servicios/accidentes-de-trabajo',
    bloques: [
      p(
        'Brindamos asesoramiento y representación integral frente a accidentes de trabajo y enfermedades vinculadas con la actividad laboral, acompañando al trabajador durante las distintas etapas del reclamo.',
      ),
      p(
        'Intervenimos en trámites ante ART y Comisiones Médicas, rechazo de contingencias, determinación y revisión de incapacidades, divergencias en las prestaciones y reclamos indemnizatorios, tanto en instancia administrativa como judicial.',
      ),
    ],
  },
  {
    clave: 'danos',
    nombre: 'Derecho de Daños',
    titulo: 'Derecho de Daños',
    frase:
      'Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos.',
    ruta: '/servicios/derecho-de-danos',
    bloques: [
      p(
        'Intervenimos en reclamos destinados a obtener la reparación integral de los daños sufridos como consecuencia de hechos que generan responsabilidad.',
      ),
      p('Asesoramos y representamos en casos de:'),
      list(
        'Accidentes de tránsito.',
        'Daños personales y patrimoniales.',
        'Responsabilidad civil.',
        'Reclamos frente a compañías aseguradoras.',
        'Negociaciones extrajudiciales y acciones indemnizatorias.',
      ),
    ],
  },
  {
    clave: 'sucesiones',
    nombre: 'Sucesiones',
    titulo: 'Sucesiones',
    frase:
      'Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite.',
    ruta: '/servicios/sucesiones',
    bloques: [
      p(
        'Acompañamos a nuestros clientes durante todo el proceso sucesorio, procurando simplificar el trámite y facilitar los acuerdos necesarios entre los interesados.',
      ),
      p('Nuestro asesoramiento comprende:'),
      list(
        'Sucesiones testamentarias y ab intestato.',
        'Declaratoria de herederos.',
        'Denuncia y administración de bienes.',
        'Acuerdos entre herederos.',
        'Cesiones de derechos hereditarios.',
        'Partición y adjudicación de bienes.',
        'Inscripción de inmuebles y demás bienes registrables.',
      ),
    ],
  },
];

/** T-21: el título profesional de las abogadas, debajo del nombre (RF-18 y RF-19). */
export const TITULO_PROFESIONAL = 'Abogada | Mediadora | Diplomada en Derecho Laboral';

export interface Abogada {
  slug: string;
  nombre: string;
  /** Título profesional, debajo del nombre (T-21). */
  titulo: string;
  /** Ruta de la foto en public/fotos/, o null mientras no la entreguen (RF-21). */
  foto: string | null;
  /** Resumen de la tarjeta, o null mientras falte (RF-20). */
  resumen: string | null;
  /** Párrafos del texto completo, o null mientras falte (RF-20). */
  texto: readonly string[] | null;
}

/** Las integrantes, en el orden del logo (RF-18). */
export const ABOGADAS: readonly Abogada[] = [
  {
    slug: 'carolina-pertusatti',
    nombre: 'Carolina Marisa Pertusatti',
    titulo: TITULO_PROFESIONAL,
    foto: '/fotos/carolina-pertusatti.jpg',
    // T-19.
    resumen:
      'Elegí estudiar Abogacía impulsada por un profundo sentido de justicia y una vocación genuina de ayudar a los demás. Estoy convencida de que la excelencia profesional y la calidad humana deben ir siempre de la mano.',
    // T-20.
    texto: [
      'Elegí estudiar Abogacía impulsada por un profundo sentido de justicia y una vocación genuina de ayudar a los demás. Encontré en el Derecho la posibilidad de transformar esas convicciones en una profesión.',
      'Me gradué el 21 de diciembre de 2011 en la Universidad Nacional del Litoral. Posteriormente, continué mi formación como mediadora y diplomada en Derecho Laboral, disciplina a la que dedico gran parte de mi actividad profesional.',
      'Me considero una persona empática, perseverante y de convicciones firmes. Ejerzo mi profesión con pasión, honestidad y compromiso, convencida de que cada caso merece una defensa responsable, dedicada y jurídicamente sólida.',
      'Entiendo que detrás de cada conflicto hay derechos que proteger y personas que depositan su confianza en nuestro trabajo.',
      'Estoy convencida de que la excelencia profesional y la calidad humana deben ir siempre de la mano.',
    ],
  },
  {
    slug: 'vanesa-sabalette-rabello',
    nombre: 'Vanesa Sabalette Rabello',
    titulo: TITULO_PROFESIONAL,
    foto: '/fotos/vanesa-sabalette-rabello.jpg',
    resumen:
      'Me especialicé en Derecho Procesal Civil, me formé como mediadora y me diplomé en Derecho Laboral. Entiendo el ejercicio de la abogacía como la búsqueda de soluciones.',
    texto: [
      'Me gradué como abogada en 2012 en la Universidad Nacional del Litoral y, desde entonces, ejerzo una profesión que también es mi vocación.',
      'Me especialicé en Derecho Procesal Civil, me formé como mediadora y me diplomé en Derecho Laboral, áreas en las que desarrollo principalmente mi práctica profesional.',
      'Entiendo el ejercicio de la abogacía como la búsqueda de soluciones. Estoy convencida de que detrás de cada conflicto existe una estrategia posible: en algunos casos, el mejor resultado se alcanza mediante una negociación inteligente y oportuna; en otros, es necesario recurrir a una decisión judicial que reconozca y proteja los derechos de nuestros clientes.',
      'Cada caso representa para mí un nuevo desafío. Por eso, procuro abordarlo de manera empática y personalizada, anticipando escenarios y definiendo junto al cliente el camino más adecuado para alcanzar el mejor resultado posible.',
      'Mi compromiso no se limita a la defensa jurídica. Busco que quienes confían en nuestro Estudio se sientan acompañados durante todo el proceso, comprendan las decisiones que se toman y encuentren en nosotros una respuesta profesional, clara y responsable, que les brinde tranquilidad y seguridad.',
    ],
  },
];

/** Una abogada tiene tarjeta completa y página propia solo con resumen y texto (RF-20). */
export function hasOwnPage(abogada: Abogada): boolean {
  return abogada.resumen !== null && abogada.texto !== null;
}

/**
 * El nombre de una abogada como se muestra: siempre con "Dra." adelante (RF-18, RF-19 y RF-21).
 * Las iniciales y la dirección de su página salen del nombre sin el tratamiento.
 */
export function lawyerName(abogada: Abogada): string {
  return `Dra. ${abogada.nombre}`;
}

/** Dirección de la página de una abogada (RF-8). */
export function lawyerPath(abogada: Abogada): string {
  return `/abogadas/${abogada.slug}`;
}

/** T-15: el mensaje de WhatsApp de cada página pública (RF-27). */
export const MENSAJES_WHATSAPP = {
  /** Inicio, páginas de las abogadas y página de dirección inexistente. */
  general: 'Hola, me contacto desde el sitio web del estudio.',
  empresas:
    'Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para empresas.',
  trabajadores:
    'Hola, me contacto desde el sitio web por una consulta de Derecho Laboral para trabajadores.',
  accidentes:
    'Hola, me contacto desde el sitio web por una consulta sobre accidentes de trabajo y enfermedades profesionales.',
  danos: 'Hola, me contacto desde el sitio web por una consulta sobre Derecho de Daños.',
  sucesiones: 'Hola, me contacto desde el sitio web por una consulta sobre sucesiones.',
} as const;

/** T-17 y T-18: los textos de la interfaz del sitio público. */
export const TEXTOS = {
  menu: {
    servicios: 'Servicios',
    abogadas: 'Abogadas',
    contacto: 'Contacto',
    menu: 'Menú',
    ingresar: 'Ingresar',
    irAlPortal: 'Ir a mi portal',
    irAlPanel: 'Ir al panel',
    saltarAlContenido: 'Saltar al contenido',
  },
  inicio: {
    nuestrosServicios: 'Nuestros servicios',
    conocerMas: 'Conocer más',
    abogadas: 'Abogadas',
    masInformacion: 'Más información',
  },
  detalle: {
    volverAServicios: 'Volver a servicios',
    otrosServicios: 'Otros servicios',
    volverAAbogadas: 'Volver a abogadas',
    empresas: 'Empresas',
    trabajadores: 'Trabajadores',
  },
  contacto: {
    titulo: 'Contactate con nosotros',
    texto:
      'Estamos disponibles para escucharte. La primera consulta es el primer paso para resolver tu problema legal.',
    ubicacion: 'Ubicación',
    comoLlegar: 'Cómo llegar',
    telefono: 'Teléfono / WhatsApp',
    disponibilidad: 'Disponibilidad',
    email: 'Email',
  },
  botonWhatsapp: 'Escribinos por WhatsApp',
  noEncontrada: {
    titulo: 'No encontramos esa página',
    texto: 'Puede que la dirección esté mal escrita o que la página ya no exista.',
    irAlInicio: 'Ir al inicio',
  },
  pie: {
    derechos: '© <año> - Pertusatti | Sabalette - Abogadas. Todos los derechos reservados.',
    disenadoPor: 'Diseñado por',
    bourderWeb: 'Bourder Web',
    bourderWebUrl: 'https://bourderweb.com.ar',
  },
} as const;

/** T-18: la leyenda de derechos con el año en que se publicó el sitio (RF-44). */
export function copyrightNotice(anio: number): string {
  return TEXTOS.pie.derechos.replace('<año>', String(anio));
}

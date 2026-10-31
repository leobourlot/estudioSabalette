import { useInView, useReducedMotion } from 'motion/react';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { CAUSA_EJEMPLO, INGRESO_EJEMPLO, TEXTOS } from '../servicios/contenido-sitio';
import { type MockupFade, mockupFrame, mockupLoopFrame, mockupTimeline } from './animaciones';

const CARD = 'rounded-xl border border-slate-300 bg-white p-4 shadow-sm';
const FIELD =
  'flex h-8 items-center rounded-md border border-slate-400 bg-white px-2 text-xs text-slate-800';

const { documento, largoContrasena } = INGRESO_EJEMPLO;
const TIMELINE = mockupTimeline(
  documento.length,
  largoContrasena,
  CAUSA_EJEMPLO.movimientos.length,
);

/** Lo que aparece, como estilo en línea: la opacidad y lo que le falta subir. */
function fadeStyle({ opacity, y }: MockupFade) {
  return { opacity, transform: `translateY(${y}px)` };
}

/** El salto más grande entre dos cuadros, en milisegundos: al volver de otra pestaña no salta. */
const MAX_FRAME_MS = 100;

/**
 * El tiempo del bucle, en segundos, o null mientras la maqueta no entró en la pantalla. Solo
 * avanza mientras está en la pantalla: al salir se detiene y al volver sigue donde estaba. Con la
 * reducción de movimiento pedida salta directamente a la causa completa (Infinity).
 */
function useTiempoMaqueta(ref: RefObject<HTMLElement | null>, reduceMotion: boolean) {
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const [t, setT] = useState<number | null>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!inView) return;
    let last: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      if (reduceMotion) {
        setT(Infinity);
        return;
      }
      if (last !== null) elapsed.current += Math.min(now - last, MAX_FRAME_MS) / 1000;
      last = now;
      setT(elapsed.current);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [inView, reduceMotion]);

  return t;
}

/** El cursor de texto del campo donde se está tipeando. No parpadea (RF-45). */
function Cursor() {
  return <span data-cursor="" className="ml-px inline-block h-4 w-px bg-estudio-oscuro" />;
}

/** El puntero del mouse, dibujado acá. */
function Puntero({ fade }: { fade: MockupFade }) {
  return (
    <svg
      viewBox="0 0 24 24"
      data-puntero=""
      className="pointer-events-none absolute right-8 top-4 h-6 w-6 drop-shadow"
      style={fadeStyle(fade)}
    >
      <path
        d="M5 3 L19 11 L12.5 12.5 L9.5 19 Z"
        className="fill-white stroke-estudio-oscuro"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * La maqueta del portal del inicio (spec 007, RF-47): una ventana apaisada que muestra el ingreso
 * y después la causa de ejemplo T-22 como la muestra el portal, con la carátula y los datos a la
 * izquierda y los movimientos en una línea de tiempo a la derecha (spec 004, RF-13 y RF-21; spec
 * 008, RF-18); en el celular van uno debajo del otro. El ingreso y la causa ocupan el mismo
 * lugar, uno sobre el otro, así la ventana no cambia de alto. Para el lector de pantalla es una
 * sola imagen con su descripción, sin enlaces ni controles.
 *
 * La secuencia (mockupLoopFrame) corre en bucle mientras la maqueta está en la pantalla, sin
 * control para pausarla, a pedido del estudio; fuera de la pantalla se detiene. El HTML prerenderizado
 * trae la causa completa con la ventana oculta, marcada con data-aparecer, así se ve sin el
 * código de la página (RF-35); con la reducción de movimiento, aparece completa (RF-45).
 */
export function MaquetaPortal() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const t = useTiempoMaqueta(ref, reduceMotion);
  const frame = mockupLoopFrame(t ?? Infinity, TIMELINE, documento.length, largoContrasena);
  const ventana = t === null ? mockupFrame(0, TIMELINE, 0, 0).ventana : frame.ventana;
  const { caratula, datos, movimientos } = CAUSA_EJEMPLO;

  return (
    <div
      ref={ref}
      data-aparecer=""
      data-maqueta=""
      data-vista={frame.ingreso > 0 ? 'ingreso' : 'portal'}
      role="img"
      aria-label={TEXTOS.portal.descripcionMaqueta}
      style={fadeStyle(ventana)}
      className="w-full overflow-hidden rounded-xl border border-slate-500 bg-slate-200 shadow-xl"
    >
      <div className="flex gap-1.5 bg-slate-200 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
      </div>
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 py-2 text-estudio-blanco">
        <span className="font-titulos text-lg font-semibold">{TEXTOS.portal.leyenda}</span>
        <span className="rounded-full bg-estudio-blanco/20 px-2 py-0.5 text-xs font-medium">
          {TEXTOS.portal.ejemplo}
        </span>
      </div>
      <div className="grid">
        <div
          data-parte="portal"
          style={{ opacity: frame.portal }}
          className="grid items-start gap-3 p-3 [grid-area:1/1] sm:grid-cols-[2fr_3fr]"
        >
          <div className={`space-y-3 ${CARD}`}>
            <p className="font-titulos text-xl font-semibold leading-tight text-estudio-oscuro">
              {caratula}
            </p>
            <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
              {datos.map(([etiqueta, valor]) => (
                <div key={etiqueta} className="contents">
                  <span className="text-slate-500">{etiqueta}</span>
                  <span className="text-slate-800">{valor}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`space-y-3 ${CARD}`}>
            <p className="font-titulos text-lg font-semibold text-estudio-oscuro">
              {TEXTOS.portal.movimientos}
            </p>
            <ol>
              {movimientos.map((movimiento, index) => (
                <li
                  key={movimiento.fecha}
                  data-movimiento=""
                  style={fadeStyle(frame.movimientos[index])}
                  className="group relative pl-6"
                >
                  <span className="absolute bottom-0 left-[5px] top-4 w-0.5 bg-slate-300 group-last:hidden" />
                  <span className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-estudio-oscuro bg-estudio-oscuro" />
                  <div className="mb-3 space-y-1 border-b border-slate-200 pb-3 text-xs group-last:mb-0 group-last:border-b-0 group-last:pb-0">
                    <p className="flex flex-wrap gap-2">
                      <span className="font-semibold text-estudio-oscuro">{movimiento.fecha}</span>
                      <span className="text-slate-600">{movimiento.tipo}</span>
                    </p>
                    <p className="text-slate-800">{movimiento.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div
          data-parte="ingreso"
          style={frame.ingreso > 0 ? { opacity: frame.ingreso } : undefined}
          className={`flex items-center justify-center p-3 [grid-area:1/1] ${frame.ingreso > 0 ? '' : 'invisible'}`}
        >
          <div className={`w-full max-w-xs space-y-3 ${CARD}`}>
            <p className="font-titulos text-2xl font-semibold text-estudio-oscuro">
              {INGRESO_EJEMPLO.titulo}
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                {INGRESO_EJEMPLO.etiquetaDocumento}
              </p>
              <p data-campo="documento" className={FIELD}>
                {documento.slice(0, frame.documentChars)}
                {frame.cursor === 'documento' && <Cursor />}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-700">
                {INGRESO_EJEMPLO.etiquetaContrasena}
              </p>
              <p data-campo="contrasena" className={`${FIELD} tracking-widest`}>
                {'•'.repeat(frame.passwordChars)}
                {frame.cursor === 'contrasena' && <Cursor />}
              </p>
            </div>
            <div className="relative">
              <p
                data-boton=""
                className={`flex h-9 items-center justify-center rounded text-sm font-medium text-estudio-blanco transition-transform ${frame.presionado ? 'scale-95 bg-estudio-azul' : 'bg-estudio-oscuro'}`}
              >
                {INGRESO_EJEMPLO.boton}
              </p>
              <Puntero fade={frame.puntero} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { describe, expect, it } from 'vitest';
import { linkViolation } from './enlace.js';

describe('linkViolation: enlaces aceptados (RF-6)', () => {
  it.each([
    'https://sjconsulta.csjn.gov.ar/sjconsulta/documentos/verDocumentoById.html?idDocumento=7867721',
    'https://www.saij.gob.ar/buscador?r=fallo&o=1#resultados',
    'https://www.pjn.gov.ar/fallos/da%C3%B1o-moral',
    'https://csjn.gov.ar',
    'https://csjn.gov.ar/',
    'https://juba.scba.gov.ar/Busquedas.aspx?a=1&b=(2)*3,4;5:6!7$8+9~_',
    'https://sub-dominio.ejemplo.com.ar/Ruta/Con/Mayusculas',
  ])('acepta %s', (enlace) => {
    expect(linkViolation(enlace)).toBeNull();
  });

  it('recorta los espacios de los extremos antes de validar', () => {
    expect(linkViolation('  https://csjn.gov.ar/fallos  ')).toBeNull();
  });
});

describe('linkViolation: esquema (RF-6)', () => {
  it.each([
    'http://csjn.gov.ar',
    'HTTPS://csjn.gov.ar',
    'Https://csjn.gov.ar',
    'javascript:alert(1)',
    'ftp://csjn.gov.ar',
    'csjn.gov.ar',
    '',
  ])('rechaza %j por el esquema', (enlace) => {
    expect(linkViolation(enlace)).toBe('esquema');
  });
});

describe('linkViolation: formato (RF-6)', () => {
  it.each([
    ['solo el esquema', 'https://'],
    ['un dominio sin punto', 'https://localhost/fallo'],
    ['mayúsculas en el dominio', 'https://www.CSJN.gov.ar/fallo'],
    ['usuario antes del dominio', 'https://csjn.gov.ar@sitio-falso.com/fallo'],
    ['@ en la ruta', 'https://csjn.gov.ar/fallo@otro'],
    ['una dirección IP', 'https://190.12.34.56/fallo'],
    ['un puerto', 'https://sitio.com:8443/fallo'],
    ['un dominio en punycode', 'https://xn--csjn-9qa.com/fallo'],
    ['una parte en punycode en el medio', 'https://www.xn--fallos-4ya.gov.ar'],
    ['una parte que empieza con guion', 'https://-csjn.gov.ar'],
    ['una parte que termina con guion', 'https://csjn-.gov.ar'],
    ['una parte vacía', 'https://csjn..gov.ar'],
    ['un espacio en el medio', 'https://csjn.gov.ar/fallo nuevo'],
    ['comillas dobles', 'https://csjn.gov.ar/?q="><script>'],
    ['comillas simples', "https://csjn.gov.ar/?q='x'"],
    ['<', 'https://csjn.gov.ar/<script>'],
    ['>', 'https://csjn.gov.ar/a>b'],
    ['llaves', 'https://csjn.gov.ar/{x}'],
    ['corchetes', 'https://csjn.gov.ar/[x]'],
    ['|', 'https://csjn.gov.ar/a|b'],
    ['barra invertida', 'https://csjn.gov.ar/a\\b'],
    ['^', 'https://csjn.gov.ar/a^b'],
    ['acento grave', 'https://csjn.gov.ar/a`b'],
    ['un emoji', 'https://csjn.gov.ar/😀'],
    ['una letra con tilde', 'https://csjn.gov.ar/daño'],
    ['una letra con tilde en el dominio', 'https://dañomoral.com.ar'],
  ])('rechaza %s', (_caso, enlace) => {
    expect(linkViolation(enlace)).toBe('formato');
  });
});

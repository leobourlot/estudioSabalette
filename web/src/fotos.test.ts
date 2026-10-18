import { describe, expect, it } from 'vitest';
import controlPhoto from './pruebas/foto-con-exif.jpg?raw';

/**
 * Spec 007, RF-21: las fotos se publican sin los datos que guarda la cámara (ubicación,
 * dispositivo, fecha). Este test recorre las imágenes que se publican (las fotos de las abogadas
 * y la marca) y falla si alguna tiene un bloque EXIF o XMP. Las lee como texto: las marcas de esos
 * bloques son caracteres ASCII y se conservan.
 */

const published = import.meta.glob<string>('../public/{fotos,marca}/**/*.{jpg,jpeg,png,webp}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const EXIF_MARK = 'Exif\0\0';
const XMP_MARK = 'http://ns.adobe.com/xap/1.0/';

function hasCameraData(content: string): boolean {
  return content.includes(EXIF_MARK) || content.includes(XMP_MARK);
}

describe('fotos sin datos de cámara (spec 007, RF-21)', () => {
  it('ninguna imagen publicada tiene bloques EXIF ni XMP', () => {
    const withData = Object.entries(published)
      .filter(([, content]) => hasCameraData(content))
      .map(([path]) => path);

    expect(withData).toEqual([]);
  });

  it('revisa las imágenes de la marca', () => {
    expect(Object.keys(published)).toEqual(
      expect.arrayContaining(['../public/marca/logo.png', '../public/marca/compartir.png']),
    );
  });

  it('detecta una imagen con datos de cámara (caso de control)', () => {
    expect(hasCameraData(controlPhoto)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import {
  accountRows,
  formatCuit,
  formatDni,
  fullName,
  personTypeLabel,
  roleLabel,
} from './presentacion';

describe('presentación de datos', () => {
  it.each([
    ['admin', 'Administrador'],
    ['abogado', 'Abogado'],
    ['cliente', 'Cliente'],
  ] as const)('nombra el rol %s', (rol, label) => {
    expect(roleLabel(rol)).toBe(label);
  });

  it('nombra el tipo de persona', () => {
    expect(personTypeLabel('fisica')).toBe('Persona física');
    expect(personTypeLabel('juridica')).toBe('Persona jurídica');
  });

  it.each([
    ['30123456', '30.123.456'],
    ['1234567', '1.234.567'],
  ])('escribe el DNI %s con puntos', (dni, formatted) => {
    expect(formatDni(dni)).toBe(formatted);
  });

  it('escribe el CUIT con guiones', () => {
    expect(formatCuit('30712345671')).toBe('30-71234567-1');
  });

  it('une nombre y apellido', () => {
    expect(fullName({ nombre: 'Ana', apellido: 'Gómez' })).toBe('Ana Gómez');
  });
});

describe('accountRows', () => {
  const base = {
    id: 1,
    esPrincipal: false,
    email: 'ana@correo.com',
    nombre: 'Ana',
    apellido: 'Gómez',
    debeCambiarContrasena: false,
  };

  it('a un integrante le arma solo sus datos personales', () => {
    expect(accountRows({ ...base, rol: 'admin', cliente: null })).toEqual([
      ['Nombre', 'Ana'],
      ['Apellido', 'Gómez'],
      ['Email', 'ana@correo.com'],
      ['Rol', 'Administrador'],
    ]);
  });

  it('a una persona jurídica le arma razón social, CUIT y la persona de contacto', () => {
    const rows = accountRows({
      ...base,
      rol: 'cliente',
      email: null,
      cliente: {
        tipoPersona: 'juridica',
        dni: null,
        cuit: '30712345671',
        razonSocial: 'Zeta S.A.',
        telefono: null,
        domicilio: null,
      },
    });

    expect(rows).toEqual([
      ['Tipo de persona', 'Persona jurídica'],
      ['Razón social', 'Zeta S.A.'],
      ['CUIT', '30-71234567-1'],
      ['Nombre del contacto', 'Ana'],
      ['Apellido del contacto', 'Gómez'],
      ['Email', '—'],
      ['Rol', 'Cliente'],
      ['Teléfono', '—'],
      ['Domicilio', '—'],
    ]);
  });
});

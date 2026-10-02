import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renderiza la página inicial con el nombre del estudio', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Estudio Sabalette' })).toBeTruthy();
  });
});

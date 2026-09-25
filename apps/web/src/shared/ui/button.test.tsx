import { render, screen } from '@testing-library/react';
import { Button } from '@/shared/ui/button';

describe('Button', () => {
  it('renders the default variant with accent-700 (AAA-safe with white text), never accent-500', () => {
    render(<Button>Confirmar</Button>);
    const button = screen.getByRole('button', { name: 'Confirmar' });

    expect(button.className).toContain('bg-accent-700');
    expect(button.className).not.toContain('bg-accent-500');
  });

  it('renders the destructive variant with error-700', () => {
    render(<Button variant="destructive">Cancelar</Button>);
    const button = screen.getByRole('button', { name: 'Cancelar' });

    expect(button.className).toContain('bg-error-700');
  });
});

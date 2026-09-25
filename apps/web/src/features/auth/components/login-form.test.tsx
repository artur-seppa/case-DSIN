import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from '@/features/auth/components/login-form';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn(), GET: vi.fn() },
}));

function renderWithQuery() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginForm onSuccess={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  it('shows a validation message for an invalid e-mail without calling the API', async () => {
    const user = userEvent.setup();
    renderWithQuery();

    await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
    await user.type(screen.getByLabelText('Senha'), 'anything');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('shows the inline server error on invalid credentials and keeps the typed e-mail', async () => {
    const errorBody = { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: errorBody,
      response: new Response(JSON.stringify(errorBody), { status: 401 }),
    } as never);
    const user = userEvent.setup();
    renderWithQuery();

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@example.com');
  });

  it('calls onSuccess when the login mutation resolves', async () => {
    const onSuccess = vi.fn();
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: '1', name: 'Ana', email: 'ana@example.com', phone: null, role: 'CLIENT' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm onSuccess={onSuccess} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

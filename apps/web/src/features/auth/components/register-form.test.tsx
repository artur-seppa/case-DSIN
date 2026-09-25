import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from '@/features/auth/components/register-form';
import { client } from '@/shared/api/client';

vi.mock('@/shared/api/client', () => ({
  client: { POST: vi.fn(), GET: vi.fn() },
}));

function renderWithQuery(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { onSuccess, ...render(
    <QueryClientProvider client={queryClient}>
      <RegisterForm onSuccess={onSuccess} />
    </QueryClientProvider>,
  ) };
}

describe('RegisterForm', () => {
  it('shows a validation message for a name that is too short, without calling the API', async () => {
    const user = userEvent.setup();
    renderWithQuery();

    await user.type(screen.getByLabelText('Nome'), 'A');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Nome deve ter pelo menos 2 letras')).toBeInTheDocument();
    expect(client.POST).not.toHaveBeenCalled();
  });

  it('shows the inline server error when the e-mail is already registered', async () => {
    const errorBody = { statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'Este e-mail já está cadastrado' };
    vi.mocked(client.POST).mockResolvedValue({
      data: undefined,
      error: errorBody,
      response: new Response(JSON.stringify(errorBody), { status: 409 }),
    } as never);
    const user = userEvent.setup();
    renderWithQuery();

    await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText('Este e-mail já está cadastrado')).toBeInTheDocument();
  });

  it('calls onSuccess when the register mutation resolves', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: '1', name: 'Ana Souza', email: 'ana@example.com', phone: null, role: 'CLIENT' },
      error: undefined,
      response: new Response(null, { status: 201 }),
    } as never);
    const user = userEvent.setup();
    const { onSuccess } = renderWithQuery();

    await user.type(screen.getByLabelText('Nome'), 'Ana Souza');
    await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await user.type(screen.getByLabelText('Senha'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileForm } from '@/features/profile/components/profile-form';
import { client } from '@/shared/api/client';
import { toast } from '@/shared/lib/toast';

vi.mock('@/shared/api/client', () => ({
  client: { GET: vi.fn(), PATCH: vi.fn(), POST: vi.fn() },
}));
vi.mock('@/shared/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(client.GET).mockResolvedValue({
    data: { id: '1', name: 'Mariana Souza', email: 'mariana@example.com', phone: '+5511912345678', role: 'CLIENT' },
    error: undefined,
    response: new Response(null, { status: 200 }),
  } as never);
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileForm />
    </QueryClientProvider>,
  );
}

describe('ProfileForm', () => {
  it('pre-fills the current name and phone', async () => {
    renderForm();

    expect(await screen.findByLabelText('Nome')).toHaveValue('Mariana Souza');
    expect(screen.getByLabelText('Telefone', { exact: false })).toHaveValue('+5511912345678');
  });

  it('shows a validation message for a name that is too short, without calling the API', async () => {
    const user = userEvent.setup();
    renderForm();

    const nameField = await screen.findByLabelText('Nome');
    await user.clear(nameField);
    await user.type(nameField, 'A');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome deve ter pelo menos 2 letras')).toBeInTheDocument();
    expect(client.PATCH).not.toHaveBeenCalled();
  });

  it('saves successfully and shows a confirmation', async () => {
    vi.mocked(client.PATCH).mockResolvedValue({
      data: { id: '1', name: 'Mariana S.', email: 'mariana@example.com', phone: '+5511912345678', role: 'CLIENT' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    } as never);
    const user = userEvent.setup();
    renderForm();

    const nameField = await screen.findByLabelText('Nome');
    await user.clear(nameField);
    await user.type(nameField, 'Mariana S.');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('shows the server phone-validation error inline on the phone field, not as a toast', async () => {
    vi.mocked(client.PATCH).mockResolvedValue({
      data: undefined,
      error: { statusCode: 400, message: ['Número de telefone inválido'], error: 'Bad Request' },
      response: new Response(JSON.stringify({ message: ['Número de telefone inválido'] }), { status: 400 }),
    } as never);
    const user = userEvent.setup();
    renderForm();

    const phoneField = await screen.findByLabelText('Telefone', { exact: false });
    await user.clear(phoneField);
    await user.type(phoneField, '123');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Número de telefone inválido')).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to a toast for a non-phone server error', async () => {
    vi.mocked(client.PATCH).mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});

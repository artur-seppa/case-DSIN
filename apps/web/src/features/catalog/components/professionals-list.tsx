import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { toast } from '@/shared/lib/toast';
import { catalogLabels } from '@/shared/labels/catalog';
import { adminProfessionalsInfiniteQueryOptions, createProfessional, type Professional } from '@/features/catalog/api/professionals';
import type { ApiError } from '@/shared/api/errors';

function NewProfessionalForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation<Professional, ApiError, void>({
    mutationFn: () => createProfessional(name),
    onSuccess: () => {
      toast.success(catalogLabels.professionalCreated);
      queryClient.invalidateQueries({ queryKey: ['catalog', 'professionals'] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="professional-name">{catalogLabels.nameLabel}</Label>
        <Input id="professional-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      {mutation.isError ? <p className="text-small text-error-700">{mutation.error.message}</p> : null}
      <DialogFooter>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? catalogLabels.saving : catalogLabels.save}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ProfessionalsList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(adminProfessionalsInfiniteQueryOptions());
  const professionals = data?.pages.flatMap((page) => page.items) ?? [];
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h2 font-semibold text-text-primary">{catalogLabels.professionalsTitle}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button">{catalogLabels.newProfessional}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{catalogLabels.newProfessional}</DialogTitle>
            </DialogHeader>
            <NewProfessionalForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4">
        {professionals.map((professional) => (
          <Link
            key={professional.id}
            to="/admin/professionals/$id"
            params={{ id: professional.id }}
            className="flex items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <span className="text-body font-medium text-text-primary">{professional.name}</span>
            <Badge variant={professional.active ? 'success' : 'neutral'}>
              {professional.active ? catalogLabels.active : catalogLabels.inactive}
            </Badge>
          </Link>
        ))}
      </div>

      {hasNextPage ? (
        <Button type="button" variant="outline" onClick={() => fetchNextPage()}>
          {catalogLabels.loadMore}
        </Button>
      ) : null}
    </div>
  );
}

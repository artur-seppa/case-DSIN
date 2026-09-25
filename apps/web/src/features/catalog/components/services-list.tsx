import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog';
import { formatCents } from '@/shared/utils/money';
import { toast } from '@/shared/lib/toast';
import { catalogLabels } from '@/shared/labels/catalog';
import { adminServicesInfiniteQueryOptions, createService, updateService, type Service } from '@/features/catalog/api/services';
import type { ApiError } from '@/shared/api/errors';

function ServiceForm({ service, onDone }: { service?: Service; onDone: () => void }) {
  const [name, setName] = useState(service?.name ?? '');
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 60));
  const [price, setPrice] = useState(String(service ? service.priceCents / 100 : 0));
  const queryClient = useQueryClient();

  const mutation = useMutation<Service, ApiError, void>({
    mutationFn: async () => {
      const input = {
        name,
        durationMinutes: Number(duration),
        priceCents: Math.round(Number(price) * 100),
      };
      return service ? updateService(service.id, input) : createService(input);
    },
    onSuccess: () => {
      toast.success(catalogLabels.serviceSaved);
      queryClient.invalidateQueries({ queryKey: ['catalog', 'services'] });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="service-name">{catalogLabels.nameLabel}</Label>
        <Input id="service-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="service-duration">{catalogLabels.durationLabel}</Label>
        <Input
          id="service-duration"
          type="number"
          step={15}
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="service-price">{catalogLabels.priceLabel}</Label>
        <Input id="service-price" type="number" step={0.01} value={price} onChange={(event) => setPrice(event.target.value)} />
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

export function ServicesList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(adminServicesInfiniteQueryOptions());
  const services = data?.pages.flatMap((page) => page.items) ?? [];
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | 'new' | null>(null);

  const toggleActive = useMutation({
    mutationFn: (service: Service) => updateService(service.id, { active: !service.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'services'] }),
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-h2 font-semibold text-text-primary">{catalogLabels.servicesTitle}</h1>
        <Dialog open={openId === 'new'} onOpenChange={(open) => setOpenId(open ? 'new' : null)}>
          <DialogTrigger asChild>
            <Button type="button">{catalogLabels.newService}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{catalogLabels.newService}</DialogTitle>
            </DialogHeader>
            <ServiceForm onDone={() => setOpenId(null)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-surface p-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="flex items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
          >
            <div>
              <div className="text-body font-medium text-text-primary">{service.name}</div>
              <div className="text-small text-text-secondary">
                {service.durationMinutes} min · {formatCents(service.priceCents)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={service.active ? 'success' : 'neutral'}>
                {service.active ? catalogLabels.active : catalogLabels.inactive}
              </Badge>
              <Dialog open={openId === service.id} onOpenChange={(open) => setOpenId(open ? service.id : null)}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    {catalogLabels.editService}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{catalogLabels.editService}</DialogTitle>
                  </DialogHeader>
                  <ServiceForm service={service} onDone={() => setOpenId(null)} />
                </DialogContent>
              </Dialog>
              <Button type="button" variant="ghost" onClick={() => toggleActive.mutate(service)}>
                {service.active ? catalogLabels.deactivate : catalogLabels.activate}
              </Button>
            </div>
          </div>
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

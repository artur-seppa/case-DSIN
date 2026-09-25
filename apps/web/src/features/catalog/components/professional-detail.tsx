import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/lib/toast';
import { cn } from '@/shared/lib/cn';
import { catalogLabels } from '@/shared/labels/catalog';
import { adminServicesQueryOptions } from '@/features/catalog/api/services';
import {
  professionalDetailQueryOptions,
  updateProfessional,
  setProfessionalServices,
  setProfessionalWorkingHours,
  type WorkingWindow,
  type Professional,
  type ProfessionalDetail,
} from '@/features/catalog/api/professionals';
import type { ApiError } from '@/shared/api/errors';

export interface ProfessionalDetailProps {
  id: string;
}

export function ProfessionalDetailScreen({ id }: ProfessionalDetailProps) {
  const { data: professional } = useQuery(professionalDetailQueryOptions(id));
  const { data: services } = useQuery(adminServicesQueryOptions);
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [windows, setWindows] = useState<WorkingWindow[]>([]);

  useEffect(() => {
    if (professional) {
      setName(professional.name);
      setSelectedServiceIds(professional.serviceIds);
      setWindows(professional.workingHours);
    }
  }, [professional]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['catalog', 'professionals'] });
  }

  const saveNameMutation = useMutation<Professional, ApiError, void>({
    mutationFn: () => updateProfessional(id, { name }),
    onSuccess: () => {
      toast.success(catalogLabels.professionalNameSaved);
      invalidate();
    },
  });

  const toggleActiveMutation = useMutation<Professional, ApiError, void>({
    mutationFn: () => updateProfessional(id, { active: !professional?.active }),
    onSuccess: invalidate,
  });

  const saveServicesMutation = useMutation<ProfessionalDetail, ApiError, void>({
    mutationFn: () => setProfessionalServices(id, selectedServiceIds),
    onSuccess: () => {
      toast.success(catalogLabels.professionalServicesSaved);
      invalidate();
    },
  });

  const saveWindowsMutation = useMutation<ProfessionalDetail, ApiError, void>({
    mutationFn: () => setProfessionalWorkingHours(id, windows),
    onSuccess: () => {
      toast.success(catalogLabels.professionalHoursSaved);
      invalidate();
    },
  });

  function toggleService(serviceId: string) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId) ? current.filter((candidate) => candidate !== serviceId) : [...current, serviceId],
    );
  }

  function addWindow(weekday: number) {
    setWindows((current) => [...current, { weekday, startTime: '09:00', endTime: '18:00' }]);
  }

  function removeWindow(index: number) {
    setWindows((current) => current.filter((_, candidate) => candidate !== index));
  }

  function updateWindow(index: number, patch: Partial<WorkingWindow>) {
    setWindows((current) => current.map((window, candidate) => (candidate === index ? { ...window, ...patch } : window)));
  }

  if (!professional) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link to="/admin/professionals" className="text-small text-text-secondary">
        {catalogLabels.backToList}
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="professional-name">{catalogLabels.nameLabel}</Label>
            <Input id="professional-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <Button type="button" onClick={() => saveNameMutation.mutate()} disabled={saveNameMutation.isPending}>
            {catalogLabels.save}
          </Button>
          <Button type="button" variant="outline" onClick={() => toggleActiveMutation.mutate()}>
            {professional.active ? catalogLabels.deactivate : catalogLabels.activate}
          </Button>
        </div>
        {saveNameMutation.isError ? <p className="text-small text-error-700">{saveNameMutation.error.message}</p> : null}
        {toggleActiveMutation.isError ? <p className="text-small text-error-700">{toggleActiveMutation.error.message}</p> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-surface p-4">
        <h2 className="text-body font-medium text-text-primary">{catalogLabels.servicesSectionTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {(services ?? []).map((service) => {
            const selected = selectedServiceIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleService(service.id)}
                className={cn(
                  'rounded-full border border-border bg-bg-surface px-3.5 py-1.5 text-small text-text-primary',
                  selected && 'border-accent-700 bg-accent-700 text-white',
                )}
              >
                {service.name}
              </button>
            );
          })}
        </div>
        {saveServicesMutation.isError ? <p className="text-small text-error-700">{saveServicesMutation.error.message}</p> : null}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => saveServicesMutation.mutate()}
          disabled={saveServicesMutation.isPending}
        >
          {catalogLabels.save}
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg-surface p-4">
        <h2 className="text-body font-medium text-text-primary">{catalogLabels.workingHoursSectionTitle}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {catalogLabels.weekdayLabels.slice(1).map((label, weekdayIndex) => {
            const weekday = weekdayIndex + 1;
            const dayWindows = windows
              .map((window, index) => ({ window, index }))
              .filter((entry) => entry.window.weekday === weekday);
            return (
              <div key={label} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <span className="text-small font-medium text-text-primary">{label}</span>
                <div className="flex flex-col gap-3">
                  {dayWindows.map(({ window, index }) => (
                    <div key={index} className="flex flex-col gap-1.5 rounded-lg bg-bg-page p-2">
                      <Input
                        type="time"
                        value={window.startTime}
                        onChange={(event) => updateWindow(index, { startTime: event.target.value })}
                        className="h-11 text-body"
                      />
                      <Input
                        type="time"
                        value={window.endTime}
                        onChange={(event) => updateWindow(index, { endTime: event.target.value })}
                        className="h-11 text-body"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        className="self-start text-error-700"
                        onClick={() => removeWindow(index)}
                      >
                        {catalogLabels.removeWindow}
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" className="self-start" onClick={() => addWindow(weekday)}>
                  {catalogLabels.addWindow}
                </Button>
              </div>
            );
          })}
        </div>
        {saveWindowsMutation.isError ? <p className="text-small text-error-700">{saveWindowsMutation.error.message}</p> : null}
        <Button
          type="button"
          className="self-start"
          onClick={() => saveWindowsMutation.mutate()}
          disabled={saveWindowsMutation.isPending}
        >
          {catalogLabels.save}
        </Button>
      </div>
    </div>
  );
}

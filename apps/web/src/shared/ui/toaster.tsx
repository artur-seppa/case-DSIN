import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'bg-bg-surface border border-border text-text-primary rounded-lg shadow-sm',
          title: 'text-body font-medium',
          description: 'text-small text-text-secondary',
        },
      }}
    />
  );
}

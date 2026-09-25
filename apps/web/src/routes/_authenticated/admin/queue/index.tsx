import { createFileRoute } from '@tanstack/react-router';
import { QueueList } from '@/features/queue/components/queue-list';

export const Route = createFileRoute('/_authenticated/admin/queue/')({
  component: QueueList,
});

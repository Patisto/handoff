import { useState } from 'react';
import { Bell, CheckCheck, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications, useReadNotification } from '../hooks/useNotifications';
import { enablePush } from '../push';
import { useUI } from '../../../stores/ui';
import { PageHeader, Loading, ErrorState, Empty } from '../../../components/shared';
import { Button } from '../../../components/ui/button';
import { cn, relativeDate } from '../../../lib/utils';
import { errorMessage } from '../../../api/client';
export function Notifications() {
  const query = useNotifications();
  const read = useReadNotification();
  const [unread, setUnread] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  return (
    <div className="page max-w-5xl">
      <PageHeader
        eyebrow="Stay in the loop"
        title="Your inbox"
        description="The updates that keep the next handoff moving."
        action={
          <Button
            variant="outline"
            disabled={read.isPending}
            onClick={() => read.mutate(undefined)}
          >
            <CheckCheck size={14} />
            Mark all read
          </Button>
        }
      />
      <div className="mb-6 flex flex-wrap justify-between gap-3">
        <div className="flex gap-1">
          <Button variant={!unread ? 'outline' : 'ghost'} onClick={() => setUnread(false)}>
            All updates
          </Button>
          <Button variant={unread ? 'outline' : 'ghost'} onClick={() => setUnread(true)}>
            Unread
          </Button>
        </div>
        {import.meta.env.VITE_FIREBASE_CONFIG && (
          <Button
            variant="ghost"
            disabled={pushPending}
            onClick={async () => {
              setPushPending(true);
              try {
                await enablePush();
                toast.success('Push notifications enabled');
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setPushPending(false);
              }
            }}
          >
            <Bell size={13} />
            Enable push
          </Button>
        )}
      </div>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : (
        <div className="panel divide-y divide-border">
          {query.data
            ?.filter((n) => !unread || !n.read)
            .map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  read.mutate(n.id);
                  if (n.payload.taskId) useUI.getState().openTask(n.payload.taskId);
                }}
                className={cn(
                  'flex w-full items-start gap-4 p-5 text-left transition hover:bg-white/[.025]',
                  !n.read && 'bg-accent/[.025]',
                )}
              >
                <span
                  className={cn(
                    'mt-1 rounded-lg border border-border p-2',
                    n.read ? 'text-muted' : 'text-accent',
                  )}
                >
                  <Bell size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{n.payload.title}</p>
                  <p className="mt-1.5 break-words text-xs leading-6 text-muted">
                    {n.payload.body}
                  </p>
                  <time className="mt-2 block text-[10px] text-muted">
                    {relativeDate(n.createdAt)}
                  </time>
                </div>
                {!n.read ? (
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent" />
                ) : (
                  <ArrowUpRight size={12} className="mt-2 text-muted" />
                )}
              </button>
            ))}
        </div>
      )}
      {query.data && !query.data.some((n) => !unread || !n.read) && (
        <Empty
          title="A moment of quiet"
          body="Assignments, feedback, and deadline reminders will appear here. No more chasing updates in chat."
        />
      )}
    </div>
  );
}

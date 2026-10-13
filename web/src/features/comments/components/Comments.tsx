import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useComments } from '../hooks/useComments';
import { commentsApi } from '../api';
import type { Comment } from '../types';
import { useAuth } from '../../../stores/auth';
import { Avatar, Loading, ErrorState } from '../../../components/shared';
import { Button } from '../../../components/ui/button';
import { relativeDate } from '../../../lib/utils';
import { errorMessage } from '../../../api/client';
import { invalidateWorkspace } from '../../../api/query';
export function Comments({ taskId }: { taskId: string }) {
  const user = useAuth((s) => s.user)!;
  const query = useComments(taskId);
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const create = useMutation({
    mutationFn: (body: string) => commentsApi.create(taskId, body),
    onMutate: async (body) => {
      await client.cancelQueries({ queryKey: ['comments', taskId] });
      const old = client.getQueryData<Comment[]>(['comments', taskId]);
      client.setQueryData<Comment[]>(['comments', taskId], (data) => [
        { id: 'pending', taskId, userId: user.id, user, body, createdAt: new Date().toISOString() },
        ...(data ?? []),
      ]);
      setBody('');
      return old;
    },
    onError: (e, body, old) => {
      client.setQueryData(['comments', taskId], old);
      setBody(body);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateWorkspace(),
  });
  const remove = useMutation({
    mutationFn: commentsApi.remove,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['comments', taskId] });
      const old = client.getQueryData<Comment[]>(['comments', taskId]);
      client.setQueryData<Comment[]>(['comments', taskId], (data) =>
        data?.filter((c) => c.id !== id),
      );
      return old;
    },
    onError: (e, _id, old) => {
      client.setQueryData(['comments', taskId], old);
      toast.error(errorMessage(e));
    },
    onSettled: () => invalidateWorkspace(),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (body.trim()) create.mutate(body.trim());
  }
  return (
    <section>
      <h3 className="section-title mb-5">
        Conversation <span className="ml-2 text-xs text-muted">{query.data?.length ?? 0}</span>
      </h3>
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState retry={() => void query.refetch()} />
      ) : (
        <div className="space-y-5">
          {[...(query.data ?? [])].reverse().map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar name={comment.user.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{comment.user.name}</span>
                  <time className="text-[9px] text-muted">{relativeDate(comment.createdAt)}</time>
                  {comment.id !== 'pending' &&
                    (user.role === 'MANAGER' || comment.userId === user.id) && (
                      <button
                        disabled={remove.isPending}
                        aria-label="Delete comment"
                        onClick={() => remove.mutate(comment.id)}
                        className="ml-auto text-muted hover:text-danger"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-soft">
                  {comment.body}
                </p>
              </div>
            </div>
          ))}
          {!query.data?.length && (
            <p className="text-xs text-muted">
              Keep feedback close to the work. Start the conversation.
            </p>
          )}
        </div>
      )}
      <form
        onSubmit={submit}
        className="mt-6 overflow-hidden rounded-lg border border-border bg-panel"
      >
        <textarea
          aria-label="Comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={10000}
          rows={3}
          placeholder="Share feedback or an update…"
          className="border-0 bg-transparent focus:ring-0"
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-[10px] text-muted">Visible to the task’s department</span>
          <Button disabled={!body.trim() || create.isPending} size="sm">
            <Send size={12} />
            {create.isPending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </section>
  );
}

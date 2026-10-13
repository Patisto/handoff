import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Paperclip, Download, FileText, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useFiles } from '../hooks/useFiles';
import { uploadFile, downloadFile } from '../api';
import { Button } from '../../../components/ui/button';
import { errorMessage } from '../../../api/client';
import { invalidateWorkspace } from '../../../api/query';
export function Files({ taskId, projectId }: { taskId?: string; projectId?: string }) {
  const scope = { taskId, projectId };
  const query = useFiles(scope);
  const ref = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState('');
  const upload = useMutation({
    mutationFn: (file: File) => uploadFile(file, scope),
    onSuccess: () => toast.success('File uploaded'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      if (ref.current) ref.current.value = '';
      return invalidateWorkspace();
    },
  });
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">Files & versions</h3>
        <Button
          variant="ghost"
          size="sm"
          disabled={upload.isPending}
          onClick={() => ref.current?.click()}
        >
          {upload.isPending ? (
            <LoaderCircle size={12} className="animate-spin" />
          ) : (
            <Paperclip size={12} />
          )}
          Attach file
        </Button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          aria-label="Upload file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
          }}
        />
      </div>
      <div className="space-y-2">
        {query.data?.map((file) => (
          <button
            key={file.id}
            disabled={downloading === file.id}
            onClick={async () => {
              setDownloading(file.id);
              try {
                await downloadFile(file);
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setDownloading('');
              }
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-raised/50"
          >
            <FileText size={16} className="text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{file.originalName}</p>
              <p className="mt-1 text-[10px] text-muted">
                Version {file.version} · {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Download size={13} className="text-muted" />
          </button>
        ))}
        {!query.data?.length && !query.isLoading && (
          <div className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted">
            Attach working files and final exports here.
            <br />
            <span className="mt-1 block text-[10px]">Every upload is saved as a new version.</span>
          </div>
        )}
        {query.isError && (
          <p role="alert" className="text-xs text-danger">
            Couldn’t load files. <button onClick={() => void query.refetch()}>Retry</button>
          </p>
        )}
      </div>
    </section>
  );
}

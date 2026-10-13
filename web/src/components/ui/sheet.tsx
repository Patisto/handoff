import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] fade-enter" />
        <Dialog.Content className="sheet-enter fixed inset-y-0 right-0 z-50 flex w-full max-w-[600px] flex-col border-l border-border bg-panel shadow-2xl">
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
              <Dialog.Description className={description ? 'mt-1 text-xs text-muted' : 'sr-only'}>
                {description ?? 'Manage your work without leaving the board.'}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button aria-label="Close drawer" variant="ghost" size="icon">
                <X size={17} />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
const variants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default: 'bg-[#8b7af0] text-white hover:bg-[#9b8afc] shadow-sm',
        outline: 'border border-border bg-[#1b1b1f] text-foreground hover:bg-[#242429]',
        ghost: 'text-muted hover:bg-white/5 hover:text-foreground',
        destructive: 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20',
      },
      size: { default: 'h-9 px-3.5', sm: 'h-8 px-2.5', icon: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> {
  asChild?: boolean;
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(variants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

import { Directive, computed, input, signal } from '@angular/core';
import { hlm } from '@spartan-ng/brain/core';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:cursor-pointer',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:cursor-pointer',
        outline:
          'border border-input hover:bg-accent hover:text-accent-foreground hover:cursor-pointer',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:cursor-pointer',
        ghost:
          'hover:bg-accent hover:text-accent-foreground hover:cursor-pointer',
        link: 'underline-offset-4 hover:underline text-primary hover:cursor-pointer',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
  selector: '[hlmBtn]',
  standalone: true,
  exportAs: 'hlmBtn',
  host: {
    '[class]': '_computedClass()',
  },
})
export class HlmButtonDirective {
  private readonly _config = injectBrnButtonConfig();

  private readonly _additionalClasses = signal<ClassValue>('');

  public readonly userClass = input<ClassValue>('', { alias: 'class' });

  protected readonly _computedClass = computed(() =>
    hlm(
      buttonVariants({ variant: this.variant(), size: this.size() }),
      this.userClass(),
      this._additionalClasses()
    )
  );

  public readonly variant = input<ButtonVariants['variant']>(
    this._config.variant
  );

  public readonly size = input<ButtonVariants['size']>(this._config.size);

  setClass(classes: string): void {
    this._additionalClasses.set(classes);
  }
}

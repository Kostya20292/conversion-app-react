import clsx from 'clsx';
import type { KeyboardEvent } from 'react';
import type { SegmentedControlProps } from './SegmentedControl.types';
import styles from './SegmentedControl.module.scss';

export type { SegmentOption, SegmentedControlProps } from './SegmentedControl.types';

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = options[(currentIndex + 1) % options.length];
      onChange(next.value);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = options[(currentIndex - 1 + options.length) % options.length];
      onChange(prev.value);
    }
  };

  return (
    <div
      className={clsx(styles.root, className)}
      role="tablist"
      aria-label={ariaLabel}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={clsx(styles.segment, isActive && styles.active)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

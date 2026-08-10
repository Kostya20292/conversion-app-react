export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

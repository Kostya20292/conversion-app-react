export type AccountApiKeySectionProps = {
  onNotify: (message: string) => void;
  apiKey?: string;
  initiallyVisible?: boolean;
  hideIfUnknown?: boolean;
};

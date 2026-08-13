export type DropzoneProps = {
  file: File | null;
  error: string | null;
  onFilesSelected: (files: File[]) => void;
  onClear: () => void;
};

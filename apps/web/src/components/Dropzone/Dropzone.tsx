import clsx from 'clsx';
import { type MouseEvent, useId } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/Button/Button';
import { FieldError } from '@/components/FieldError/FieldError';
import { MAX_FILE_SIZE_MB } from '@/constants/conversion';
import { formatFileSize } from '@/lib/formatFileSize';
import type { DropzoneProps } from './Dropzone.types';
import styles from './Dropzone.module.scss';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;

const isImageFileName = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

const FileTypeIcon = ({ fileName }: { fileName: string }) => {
  if (isImageFileName(fileName)) {
    return (
      <svg className={styles.fileIcon} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <rect
          x="6"
          y="8"
          width="28"
          height="24"
          rx="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="15" cy="17" r="3" fill="currentColor" />
        <path
          d="M8 28l8-8 6 6 4-4 8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className={styles.fileIcon} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path
        d="M13 6h10l8 8v18a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M23 6v8h8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const Dropzone = ({ file, error, onFilesSelected, onClear }: DropzoneProps) => {
  const instanceId = useId();
  const hintId = `${instanceId}-hint`;
  const errorId = `${instanceId}-error`;
  const hasError = Boolean(error);
  const isSelected = Boolean(file) && !hasError;

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles) => {
      onFilesSelected(acceptedFiles);
    },
  });

  const handleOpenPicker = () => {
    open();
  };

  const handleClear = () => {
    onClear();
  };

  const handleRootClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    open();
  };

  const describedBy = [hintId, hasError ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div
      {...getRootProps({
        className: clsx(
          styles.root,
          isDragActive && styles.dragOver,
          hasError && !isDragActive && styles.invalid,
          isSelected && !isDragActive && styles.selected,
        ),
        role: 'group',
        'aria-label': 'Зона загрузки файла',
        'aria-invalid': hasError || undefined,
        'aria-describedby': describedBy,
        onClick: handleRootClick,
      })}
    >
      <input
        {...getInputProps({
          'aria-label': 'Выбрать файл для конвертации',
          tabIndex: -1,
          'aria-hidden': true,
        })}
      />

      {isDragActive && <p className={styles.title}>Отпустите файл сюда</p>}
      {!isDragActive && file && (
        <div className={styles.file}>
          <FileTypeIcon fileName={file.name} />
          <div className={styles.fileMeta}>
            <p className={styles.fileName}>{file.name}</p>
            <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
          </div>
        </div>
      )}
      {!isDragActive && !file && <p className={styles.title}>Перетащите файл сюда</p>}

      <p id={hintId} className={styles.hint}>
        1 файл, до {MAX_FILE_SIZE_MB} МБ
      </p>

      {hasError && (
        <FieldError id={errorId} className={styles.error}>
          {error}
        </FieldError>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleOpenPicker}>
          {file ? 'Заменить' : 'Выбрать файл'}
        </Button>
        {file && (
          <Button variant="tertiary" onClick={handleClear}>
            Удалить
          </Button>
        )}
      </div>
    </div>
  );
};

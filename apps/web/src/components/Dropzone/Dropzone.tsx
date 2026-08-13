import clsx from 'clsx';
import { type MouseEvent, useId } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/Button/Button';
import { MAX_FILE_SIZE_MB } from '@/constants/conversion';
import { formatFileSize } from '@/lib/formatFileSize';
import type { DropzoneProps } from './Dropzone.types';
import styles from './Dropzone.module.scss';

export type { DropzoneProps } from './Dropzone.types';

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
      <input {...getInputProps({ 'aria-label': 'Выбрать файл для конвертации' })} />

      {isDragActive ? (
        <p className={styles.title}>Отпустите файл сюда</p>
      ) : file ? (
        <div className={styles.file}>
          <p className={styles.fileName}>{file.name}</p>
          <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
        </div>
      ) : (
        <p className={styles.title}>Перетащите файл сюда</p>
      )}

      <p id={hintId} className={styles.hint}>
        1 файл, до {MAX_FILE_SIZE_MB} МБ
      </p>

      {hasError ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleOpenPicker}>
          {file ? 'Заменить' : 'Выбрать файл'}
        </Button>
        {file ? (
          <Button variant="tertiary" onClick={handleClear}>
            Удалить
          </Button>
        ) : null}
      </div>
    </div>
  );
};

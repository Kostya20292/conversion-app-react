import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Dropzone } from '@/components/Dropzone/Dropzone';
import { createTestFile } from '@/test/createTestFile';

describe('Dropzone', () => {
  it('объявляет зону загрузки и лимит одного файла до 10 МБ', () => {
    render(
      <Dropzone
        file={null}
        error={null}
        onFilesSelected={() => undefined}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByRole('group', { name: 'Зона загрузки файла' })).toBeInTheDocument();
    expect(screen.getByText('1 файл, до 10 МБ')).toBeInTheDocument();
  });

  it('показывает имя выбранного файла', () => {
    const file = createTestFile('photo.jpg', { type: 'image/jpeg' });

    render(
      <Dropzone
        file={file}
        error={null}
        onFilesSelected={() => undefined}
        onClear={() => undefined}
      />,
    );

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Заменить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument();
  });

  it('связывает ошибку с зоной загрузки', () => {
    render(
      <Dropzone
        file={null}
        error="За раз можно конвертировать только один файл"
        onFilesSelected={() => undefined}
        onClear={() => undefined}
      />,
    );

    const zone = screen.getByRole('group', { name: 'Зона загрузки файла' });

    expect(zone).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'За раз можно конвертировать только один файл',
    );
  });

  it('передаёт выбранные файлы наружу', async () => {
    const user = userEvent.setup();
    let selectedFiles: File[] = [];
    const file = createTestFile('photo.jpg', { type: 'image/jpeg' });

    render(
      <Dropzone
        file={null}
        error={null}
        onFilesSelected={(files) => {
          selectedFiles = files;
        }}
        onClear={() => undefined}
      />,
    );

    await user.upload(screen.getByLabelText('Выбрать файл для конвертации'), file);

    expect(selectedFiles).toEqual([file]);
  });
});

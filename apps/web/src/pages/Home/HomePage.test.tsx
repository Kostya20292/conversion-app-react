import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONVERSION_ROUTE } from '@/constants/conversion';
import { useConversionStore, type ConversionPhase } from '@/features/conversion/conversionStore';
import { HomePage } from '@/pages/Home/HomePage';
import { createTestFile } from '@/test/createTestFile';
import { renderWithRouter } from '@/test/renderWithRouter';
import type { ConversionJob } from '@/types/api';

const seedSelectedFile = (
  patch: Partial<{
    phase: ConversionPhase;
    job: ConversionJob | null;
    error: string | null;
  }> = {},
) => {
  const file = createTestFile('photo.jpg', { type: 'image/jpeg' });
  useConversionStore.setState({
    route: DEFAULT_CONVERSION_ROUTE,
    file,
    error: null,
    phase: 'idle',
    job: null,
    ...patch,
  });
};

describe('HomePage', () => {
  beforeEach(() => {
    useConversionStore.setState({
      route: DEFAULT_CONVERSION_ROUTE,
      file: null,
      error: null,
      phase: 'idle',
      job: null,
    });
  });

  it('блокирует конвертацию без файла', () => {
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();
  });

  it('показывает ошибку, если выбрано больше одного файла', async () => {
    const { user } = renderWithRouter(<HomePage />);
    const input = screen.getByLabelText('Выбрать файл для конвертации');

    await user.upload(input, [
      createTestFile('a.jpg', { type: 'image/jpeg' }),
      createTestFile('b.jpg', { type: 'image/jpeg' }),
    ]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'За раз можно конвертировать только один файл',
    );
    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();
  });

  it('включает конвертацию для одного jpg при JPG → PNG', async () => {
    const { user } = renderWithRouter(<HomePage />);
    const input = screen.getByLabelText('Выбрать файл для конвертации');

    await user.upload(input, createTestFile('photo.jpg', { type: 'image/jpeg' }));

    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeEnabled();
  });

  it('показывает ошибку расширения после смены направления', async () => {
    const { user } = renderWithRouter(<HomePage />);

    await user.click(screen.getByRole('radio', { name: 'PNG → JPG' }));
    await user.upload(
      screen.getByLabelText('Выбрать файл для конвертации'),
      createTestFile('photo.jpg', { type: 'image/jpeg' }),
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Для PNG → JPG нужен файл .png');
    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();
  });

  it('во время загрузки показывает прогресс и блокирует повторный запуск', () => {
    seedSelectedFile({ phase: 'uploading' });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('progressbar', { name: 'Загрузка файла' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeDisabled();
  });

  it('во время конвертации показывает статус задачи', () => {
    seedSelectedFile({
      phase: 'processing',
      job: { id: 'job-1', status: 'processing' },
    });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('status', { name: 'Идёт конвертация' })).toBeInTheDocument();
  });

  it('после успеха предлагает скачать и поделиться', () => {
    seedSelectedFile({
      phase: 'completed',
      job: {
        id: 'job-1',
        status: 'completed',
        download_url: '/api/jobs/job-1/download?token=t',
      },
    });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('button', { name: 'Скачать' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Поделиться' })).toBeInTheDocument();
  });

  it('при ошибке конвертации предлагает повторить', () => {
    seedSelectedFile({
      phase: 'failed',
      error: 'Не удалось конвертировать. Файл может быть повреждён',
    });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Не удалось конвертировать. Файл может быть повреждён',
    );
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled();
  });

  it('при таймауте конвертации показывает превышение времени', () => {
    seedSelectedFile({
      phase: 'failed',
      error: 'Превышено время конвертации',
    });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Превышено время конвертации');
  });

  it('при обрыве сети на загрузке предлагает проверить соединение', () => {
    seedSelectedFile({
      phase: 'failed',
      error: 'Не удалось загрузить. Проверьте соединение',
    });
    renderWithRouter(<HomePage />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Не удалось загрузить. Проверьте соединение',
    );
  });

  it('после повтора снова позволяет конвертировать тот же файл', async () => {
    seedSelectedFile({
      phase: 'failed',
      error: 'Не удалось конвертировать. Файл может быть повреждён',
    });
    const { user } = renderWithRouter(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(screen.getByRole('button', { name: 'Конвертировать' })).toBeEnabled();
  });
});

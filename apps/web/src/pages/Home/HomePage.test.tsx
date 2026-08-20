import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONVERSION_ROUTE } from '@/constants/conversion';
import { useConversionStore } from '@/features/conversion/conversionStore';
import { createTestFile } from '@/test/createTestFile';
import { renderWithRouter } from '@/test/renderWithRouter';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  beforeEach(() => {
    useConversionStore.setState({
      route: DEFAULT_CONVERSION_ROUTE,
      file: null,
      error: null,
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
});

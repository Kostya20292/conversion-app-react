import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONVERSION_ROUTE } from '@/constants/conversion';
import { createTestFile } from '@/test/createTestFile';
import { useConversionStore } from '@/features/conversion/conversionStore';

const resetConversionStore = () => {
  useConversionStore.setState({
    route: DEFAULT_CONVERSION_ROUTE,
    file: null,
    error: null,
    phase: 'idle',
    job: null,
  });
};

describe('useConversionStore', () => {
  beforeEach(() => {
    resetConversionStore();
  });

  it('сохраняет один валидный файл и сбрасывает ошибку', () => {
    const file = createTestFile('photo.jpg', { type: 'image/jpeg' });

    useConversionStore.getState().selectFiles([file]);

    expect(useConversionStore.getState().file).toBe(file);
    expect(useConversionStore.getState().error).toBeNull();
  });

  it('ставит ошибку, если выбрано больше одного файла', () => {
    useConversionStore
      .getState()
      .selectFiles([
        createTestFile('a.jpg', { type: 'image/jpeg' }),
        createTestFile('b.jpg', { type: 'image/jpeg' }),
      ]);

    expect(useConversionStore.getState().file).toBeNull();
    expect(useConversionStore.getState().error).toBe(
      'За раз можно конвертировать только один файл',
    );
  });

  it('перепроверяет файл при смене направления конвертации', () => {
    const file = createTestFile('photo.jpg', { type: 'image/jpeg' });
    useConversionStore.getState().selectFiles([file]);

    useConversionStore.getState().setRoute('png-to-jpg');

    expect(useConversionStore.getState().error).toBe('Для PNG → JPG нужен файл .png');
  });

  it('очищает выбранный файл', () => {
    useConversionStore
      .getState()
      .selectFiles([createTestFile('photo.jpg', { type: 'image/jpeg' })]);

    useConversionStore.getState().clearFile();

    expect(useConversionStore.getState().file).toBeNull();
    expect(useConversionStore.getState().error).toBeNull();
  });
});

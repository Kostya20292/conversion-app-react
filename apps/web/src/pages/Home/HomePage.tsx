import { Link } from 'react-router-dom';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dropzone } from '@/components/Dropzone/Dropzone';
import { SegmentedControl } from '@/components/SegmentedControl/SegmentedControl';
import { CONVERSION_ROUTE_OPTIONS } from '@/constants/conversion';
import { useConversionStore } from '@/features/conversion/conversionStore';
import styles from './HomePage.module.scss';

export const HomePage = () => {
  const route = useConversionStore((state) => state.route);
  const file = useConversionStore((state) => state.file);
  const error = useConversionStore((state) => state.error);
  const setRoute = useConversionStore((state) => state.setRoute);
  const selectFiles = useConversionStore((state) => state.selectFiles);
  const clearFile = useConversionStore((state) => state.clearFile);
  const canConvert = Boolean(file) && !error;

  return (
    <div className={styles.page}>
      <section className={`container ${styles.hero}`} aria-labelledby="home-brand">
        <h1 className={styles.brand} id="home-brand">
          Convertly
        </h1>
        <p className={styles.subtitle}>Конвертируйте файлы онлайн и через API</p>

        <div className={styles.controls}>
          <SegmentedControl
            ariaLabel="Направление конвертации"
            className={styles.routeControl}
            options={CONVERSION_ROUTE_OPTIONS}
            value={route}
            onChange={setRoute}
          />
        </div>

        <div className={styles.upload}>
          <Dropzone file={file} error={error} onFilesSelected={selectFiles} onClear={clearFile} />
        </div>

        <Button disabled={!canConvert} fullWidth={false} className={styles.cta}>
          Конвертировать
        </Button>
      </section>

      <section className={`container ${styles.section}`}>
        <Banner
          action={
            <Link to="/login" className={styles.bannerLink}>
              Войти
            </Link>
          }
        >
          Войдите, чтобы сохранять файлы в профиле, управлять ссылками и пользоваться API.
        </Banner>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="how-title">
        <h2 id="how-title" className={styles.sectionTitle}>
          Как это работает
        </h2>
        <p className={styles.sectionLead}>Три шага до готового файла.</p>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepIndex}>1</span>
            <div>
              <p className={styles.stepTitle}>Загрузить</p>
              <p className={styles.stepText}>Выберите один файл нужного формата.</p>
            </div>
          </li>
          <li>
            <span className={styles.stepIndex}>2</span>
            <div>
              <p className={styles.stepTitle}>Конвертировать</p>
              <p className={styles.stepText}>Мы обработаем файл и покажем статус задачи.</p>
            </div>
          </li>
          <li>
            <span className={styles.stepIndex}>3</span>
            <div>
              <p className={styles.stepTitle}>Скачать / Поделиться</p>
              <p className={styles.stepText}>Скачайте результат или отправьте публичную ссылку.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="api-title">
        <h2 id="api-title" className={styles.sectionTitle}>
          API для разработчиков
        </h2>
        <p className={styles.sectionLead}>
          Конвертируйте файлы из своих сервисов по ключу. Документация с примерами curl и fetch.
        </p>
        <div className={styles.apiActions}>
          <Link to="/api-docs" className={styles.textLink}>
            Открыть API docs
          </Link>
          <Link to="/register" className={styles.textLink}>
            Получить ключ
          </Link>
        </div>
      </section>
    </div>
  );
};

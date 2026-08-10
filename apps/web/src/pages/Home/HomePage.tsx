import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { SegmentedControl } from '@/components/SegmentedControl/SegmentedControl';
import { CONVERSION_ROUTE_OPTIONS, DEFAULT_CONVERSION_ROUTE } from '@/constants/conversion';
import type { ConversionRoute } from '@/types/conversion';
import styles from './HomePage.module.scss';

export const HomePage = () => {
  const [route, setRoute] = useState<ConversionRoute>(DEFAULT_CONVERSION_ROUTE);

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

        <div className={styles.uploadPlaceholder} aria-hidden="true">
          <p className={styles.uploadTitle}>Зона загрузки файла</p>
          <p className={styles.uploadHint}>1 файл, до 10 МБ — появится на следующем этапе</p>
        </div>

        <Button disabled fullWidth={false} className={styles.cta}>
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

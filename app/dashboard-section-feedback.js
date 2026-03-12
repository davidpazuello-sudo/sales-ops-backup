"use client";

import styles from "./page.module.css";

export function SectionNotice({
  variant = "info",
  children,
  title = "",
  live = "polite",
}) {
  const variantClass = variant === "error"
    ? styles.sectionNoticeError
    : variant === "success"
      ? styles.sectionNoticeSuccess
      : styles.sectionNoticeInfo;

  return (
    <div className={`${styles.sectionNotice} ${variantClass}`.trim()} role="status" aria-live={live}>
      {title ? <strong className={styles.sectionNoticeTitle}>{title}</strong> : null}
      <span>{children}</span>
    </div>
  );
}

export function SectionEmptyState({
  title,
  description,
}) {
  return (
    <div className={styles.sectionEmptyPanel}>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function SectionLoadingState({
  title = "Carregando",
  description = "Aguarde enquanto trazemos os dados mais recentes.",
}) {
  return (
    <div className={styles.sectionLoadingPanel} role="status" aria-live="polite">
      <span className={styles.sectionLoadingSpinner} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

"use client";

import styles from "./page.module.css";

function BaseIcon({ children }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
}

export function MenuIcon() {
  return <div className={styles.hamburger} aria-hidden="true"><span /><span /><span /></div>;
}

export function PanelsIcon() {
  return <span className={styles.panelsIcon} aria-hidden="true" />;
}

export function SimpleArrow({ right = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={right ? "M9.5 6.5L15 12l-5.5 5.5" : "M14.5 6.5L9 12l5.5 5.5"} />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 7V5.8A1.8 1.8 0 0 0 12.2 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8V17" />
      <path d="M10 12h9" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
      <path d="M18.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      <path d="M5.5 15.5l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 10a5 5 0 1 1 10 0c0 4.5 2 6 2 6H5s2-1 2-6" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.2 4.2" />
    </svg>
  );
}

export function MeetingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4v3" />
      <path d="M17 4v3" />
      <rect x="4" y="6.5" width="16" height="13.5" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
      <path d="M13 14h3" />
    </svg>
  );
}

export function AttachmentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12.5l6-6a3 3 0 1 1 4.2 4.2l-7.2 7.2a5 5 0 1 1-7.1-7.1l7.3-7.3" />
    </svg>
  );
}

export function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0" />
      <path d="M12 17v3.5" />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 11.5l17-8-5.3 17-2.4-6.8z" />
      <path d="M12.3 13.7L20 3.5" />
    </svg>
  );
}

export function getNavIcon(id) {
  if (id === "reports") {
    return <BaseIcon><path d="M6 18V11" /><path d="M11 18V7" /><path d="M16 18V13" /></BaseIcon>;
  }

  if (id === "sellers") {
    return <BaseIcon><circle cx="9" cy="8" r="3" /><path d="M4 17c0-2.4 2.2-4.3 5-4.3s5 1.9 5 4.3" /><circle cx="17" cy="9" r="2.3" /><path d="M14.6 16.2c.6-1.5 2-2.5 3.7-2.5.8 0 1.5.2 2.1.5" /></BaseIcon>;
  }

  if (id === "deals") {
    return <BaseIcon><rect x="4" y="6" width="16" height="12" rx="1.5" /><path d="M12 6v12" /><path d="M4 10h16" /></BaseIcon>;
  }

  if (id === "campaigns") {
    return <BaseIcon><path d="M5 7h10l4 4-7 8H5z" /><circle cx="8.2" cy="9.2" r="1.1" /></BaseIcon>;
  }

  if (id === "tasks") {
    return <BaseIcon><rect x="5" y="4.5" width="14" height="15" rx="2" /><path d="M8 9h7" /><path d="M8 13h4" /><path d="M8 17h5" /><path d="M15.5 13.5l1.3 1.3 2.7-3" /></BaseIcon>;
  }

  if (id === "access") {
    return <BaseIcon><path d="M7 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /><path d="M13 10h7" /><path d="M17 6v8" /><path d="M5 12v6h4v-3h2v3h4v-4" /></BaseIcon>;
  }

  return <BaseIcon><path d="M12 8.6A3.4 3.4 0 1 0 12 15.4A3.4 3.4 0 1 0 12 8.6z" /><path d="M19 12a7.2 7.2 0 0 0-.1-1l1.9-1.4-1.8-3.2-2.3 1a7.7 7.7 0 0 0-1.7-1l-.3-2.4H10l-.4 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-1-1.8 3.2L5.7 11a7.2 7.2 0 0 0 0 2l-1.9 1.4 1.8 3.2 2.3-1c.5.4 1.1.7 1.7 1l.4 2.4h4.6l.3-2.4c.6-.2 1.2-.6 1.7-1l2.3 1 1.8-3.2L18.9 13c.1-.3.1-.7.1-1z" /></BaseIcon>;
}

export function getConfigIcon(id) {
  if (id === "account") {
    return getNavIcon("sellers");
  }

  if (id === "hubspot") {
    return <BaseIcon><path d="M10 14l4-4" /><path d="M7.5 16.5l-1.2 1.2a3.5 3.5 0 1 1-5-5l3.2-3.2a3.5 3.5 0 0 1 5 0" /><path d="M16.5 7.5l1.2-1.2a3.5 3.5 0 1 1 5 5l-3.2 3.2a3.5 3.5 0 0 1-5 0" /></BaseIcon>;
  }

  if (id === "notifications") {
    return <BaseIcon><path d="M7 10a5 5 0 1 1 10 0c0 5 2 6 2 6H5s2-1 2-6" /><path d="M10 18a2 2 0 0 0 4 0" /></BaseIcon>;
  }

  if (id === "ai") {
    return <BaseIcon><path d="M9 4a3 3 0 0 0-3 3v1a2.5 2.5 0 0 0-2 2.5A2.5 2.5 0 0 0 6 13v1a3 3 0 0 0 3 3" /><path d="M15 4a3 3 0 0 1 3 3v1a2.5 2.5 0 0 1 2 2.5A2.5 2.5 0 0 1 18 13v1a3 3 0 0 1-3 3" /><path d="M9 4a3 3 0 0 1 3 3v10" /><path d="M15 4a3 3 0 0 0-3 3v10" /></BaseIcon>;
  }

  if (id === "personalize") {
    return <BaseIcon><path d="M12 4l1.8 2.7 3.2.5-2.2 2.2.5 3.2-3.3-1.7-3.3 1.7.5-3.2-2.2-2.2 3.2-.5z" /><path d="M12 13v7" /></BaseIcon>;
  }

  if (id === "exports") {
    return <BaseIcon><path d="M8 3h6l4 4v14H8z" /><path d="M14 3v4h4" /><path d="M10 12h6" /><path d="M10 16h6" /></BaseIcon>;
  }

  if (id === "storage") {
    return <BaseIcon><path d="M5 8.5h14v7H5z" /><path d="M7 5h10" /><path d="M7 19h10" /></BaseIcon>;
  }

  return <BaseIcon><path d="M12 3l7 3v5c0 4.5-2.9 8.5-7 10-4.1-1.5-7-5.5-7-10V6z" /><path d="M9.5 12l1.8 1.8 3.7-4" /></BaseIcon>;
}

export function Row({ label, value, helper }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <div className={styles.detailValueBox}>
        <strong className={styles.detailValue}>{value}</strong>
        {helper ? <span className={styles.detailHelper}>{helper}</span> : null}
      </div>
    </div>
  );
}

export function PhotoOption({ profilePhoto, onPhotoChange }) {
  return (
    <div className={styles.photoOption}>
      <div
        className={styles.photoPreview}
        style={profilePhoto ? { backgroundImage: `url(${profilePhoto})` } : undefined}
      >
        {profilePhoto ? null : "?"}
      </div>
      <div className={styles.photoMeta}>
        <strong>Foto do perfil</strong>
        <span>JPG ou PNG, até 5 MB.</span>
      </div>
      <label className={styles.photoAction}>
        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className={styles.hiddenFileInput} onChange={onPhotoChange} />
        <span>Adicionar foto</span>
      </label>
    </div>
  );
}

export function Card({ eyebrow, title, children, wide = false }) {
  return (
    <section className={`${styles.card} ${wide ? styles.cardWide : ""}`.trim()}>
      <span className={styles.cardEyebrow}>{eyebrow}</span>
      {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
      {children}
    </section>
  );
}

export function Table({ head, rows, matrix = false }) {
  return (
    <div className={styles.table}>
      <div className={`${styles.tableHead} ${matrix ? styles.matrixCols : ""}`.trim()}>
        {head.map((item) => <span key={item}>{item}</span>)}
      </div>
      {rows.map((row, idx) => (
        <div key={`${row[0]}-${idx}`} className={`${styles.tableRow} ${matrix ? styles.matrixCols : ""}`.trim()}>
          {row.map((cell, cellIndex) => <span key={`${cell}-${cellIndex}`}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

export function Metric({ title, value, note }) {
  return (
    <div className={styles.metric}>
      <span>{title}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export function OptionGroup({ title, options, value, onChange }) {
  return (
    <div className={styles.optionGroup}>
      <span className={styles.optionGroupLabel}>{title}</span>
      <div className={styles.optionPills}>
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`${styles.optionPill} ${value === option ? styles.optionPillActive : ""}`.trim()}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PreferenceTable({ rows, values, onToggle }) {
  return (
    <div className={styles.preferenceTable}>
      {rows.map((row) => (
        <div key={row.id} className={styles.preferenceRow}>
          <div className={styles.preferenceCopy}>
            <strong>{row.label}</strong>
            <span>{row.description}</span>
          </div>
          <button type="button" onClick={() => onToggle(row.id)} className={`${styles.toggleButton} ${values[row.id] ? styles.toggleButtonActive : ""}`.trim()}>
            <span />
          </button>
        </div>
      ))}
    </div>
  );
}

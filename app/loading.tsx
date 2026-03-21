// @ts-nocheck
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main className={styles.appRouteLoadingScreen}>
      <div className={styles.appRouteLoadingPanel} role="status" aria-live="polite">
        <span className={styles.sectionLoadingSpinner} aria-hidden="true" />
        <div>
          <strong>Abrindo pagina</strong>
          <p>A estrutura da tela entra primeiro. A integracao continua logo depois da abertura.</p>
        </div>
      </div>
    </main>
  );
}

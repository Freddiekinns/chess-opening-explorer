import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>404 - Page Not Found</h1>
      <p className={styles.message}>The page you're looking for doesn't exist.</p>
    </div>
  );
}

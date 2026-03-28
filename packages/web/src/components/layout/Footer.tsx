import React from 'react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <span className={styles.brand}>Opening Book</span>
      <div className={styles.meta}>
        <span className={styles.copyright}>&copy; 2026 Opening Book &middot; MIT License</span>
        <a
          href="https://forms.gle/3DfV8NpbhapzyTi26"
          className={styles.contribute}
          target="_blank"
          rel="noopener noreferrer"
        >
          Help make Opening Book better
        </a>
      </div>
    </footer>
  );
};

export default Footer;

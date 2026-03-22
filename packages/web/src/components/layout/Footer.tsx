import React from 'react';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <span className={styles.brand}>Opening Book</span>
      <span className={styles.copyright}>&copy; 2024 Opening Book</span>
    </footer>
  );
};

export default Footer;

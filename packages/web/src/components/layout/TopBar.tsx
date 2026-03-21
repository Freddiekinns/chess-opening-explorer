import { NavLink, Link } from 'react-router-dom';
import styles from './TopBar.module.css';

const navItems = [
  { to: '/', label: 'Discover', end: true },
  { to: '/analyse', label: 'Analyse' },
];

export default function TopBar() {
  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.logo}>
        Opening Book
      </Link>
      <nav className={styles.nav}>
        {navItems.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

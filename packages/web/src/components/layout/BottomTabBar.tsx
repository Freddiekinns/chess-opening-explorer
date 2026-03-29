import { NavLink } from 'react-router-dom';
import { Compass, BarChart3 } from 'lucide-react';
import styles from './BottomTabBar.module.css';

const tabItems = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/analyse', label: 'Analyse', icon: BarChart3 },
];

export default function BottomTabBar() {
  return (
    <nav className={styles.bottomTabBar}>
      {tabItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <Icon size={20} />
          <span className={styles.tabLabel}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

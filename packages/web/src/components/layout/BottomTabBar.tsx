import { NavLink } from 'react-router-dom';
import { Compass, Star, BarChart3 } from 'lucide-react';
import { useRepertoire } from '../../hooks/useRepertoire';
import styles from './BottomTabBar.module.css';

// Three tabs, not four: search is a persistent icon in the app bar, so it
// does not need one. The repertoire was previously several taps deep.
const tabItems = [
  { to: '/', label: 'Discover', icon: Compass, end: true },
  { to: '/repertoire', label: 'Repertoire', icon: Star, end: false },
  { to: '/analyse', label: 'Analyse', icon: BarChart3, end: false },
];

export default function BottomTabBar() {
  const { count } = useRepertoire();

  return (
    <nav className={styles.bottomTabBar}>
      {tabItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        >
          <span className={styles.iconWrap}>
            <Icon size={20} />
            {/* aria-hidden: the count is conveyed by the Repertoire page
                itself, and a bare number on a nav link is just noise. */}
            {to === '/repertoire' && count > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {count}
              </span>
            )}
          </span>
          <span className={styles.tabLabel}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ITEMS = [
  { to:'/',            icon:'📊', key:'nav.markets'     },
  { to:'/leaderboard', icon:'🏆', key:'nav.leaderboard' },
  { to:'/profile',     icon:'👤', key:'nav.profile'     },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t pb-safe"
      style={{ borderColor:'var(--card-border)' }}>
      <div className="flex">
        {ITEMS.map(item => {
          const active = pathname === item.to;
          return (
            <Link key={item.to} to={item.to}
              className="flex-1 flex flex-col items-center py-2.5 gap-1 transition-all"
              style={{ color: active ? '#818cf8' : 'var(--text-3)' }}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-semibold">{t(item.key)}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

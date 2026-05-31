import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="relative z-10 py-5 text-center text-xs font-medium"
      style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-3)' }}>
      {t('footer.text')}
    </footer>
  );
}

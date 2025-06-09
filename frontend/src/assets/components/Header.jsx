import { useState, useEffect } from 'react';
import '../css/Header.css';
import { useLanguage } from '../i18n/LanguageContext';

const Header = ({ activeDashboard }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const container = document.querySelector('.dashboard-content');
    const sidebar   = document.querySelector('.nav-left-sidebar');

    if (container && sidebar) {
      if (sidebarOpen) {
        sidebar.style.left = '0px';
        container.classList.add('sidebar-open');
        container.classList.remove('sidebar-closed');
      } else {
        sidebar.style.left = '-264px';
        container.classList.remove('sidebar-open');
        container.classList.add('sidebar-closed');
      }
    }
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen(p => !p);

  return (
    <>
      <div className="page-header">
        <h2 className="pageheader-title">
          <button
            className={`close-sidebar-btn ${sidebarOpen ? 'close' : 'open'}`}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          {activeDashboard === 'caller'
            ? t('callerDashboard')
            : activeDashboard === 'company'
            ? t('companyDashboard')
            : t('adminDashboard')}
        </h2>
      </div>
    </>
  );
};

export default Header;

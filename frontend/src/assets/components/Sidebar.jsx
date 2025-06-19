import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import logo from '../images/logo.png';
import styles from '../css/Logout.module.css';
import sidebarStyles from '../css/Sidebar.module.css';
import '../../App.css';
import defaultInstance from '../../api/defaultInstance';
import { useLanguage } from '../i18n/LanguageContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const [vipOpen, setVipOpen] = useState(false);
  const [workerOpen, setWorkerOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = async () => {
    try {
      console.log('Attempting logout with token:', localStorage.getItem('authToken'));
      const response = await defaultInstance.post('/logout', {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      console.log('Logout successful:', response.data);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      navigate('/login', { replace: true });
    }
  };

  const isSuperAdmin = localStorage.getItem('role') === 'super_admin';
  const isAdmin = localStorage.getItem('role') === 'admin';

  const langBtnStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: active ? '#017cbf' : '#f0f0f8',
    color: active ? '#fff' : '#017cbf',
    fontWeight: 600,
    borderRadius: '6px',
    marginRight: 8,
    marginBottom: 8,
    padding: ' 14px',
    cursor: 'pointer',
    fontSize: 14,
    boxShadow: active ? '0 2px 8px rgba(1,124,191,0.08)' : 'none',
    transition: 'all 0.2s',
    width: '100%'
  });

  // Close sidebar when clicking a link on mobile
  const handleMobileLinkClick = () => {
    if (window.innerWidth <= 768) {
      const sidebar = document.querySelector('.nav-left-sidebar');
      const container = document.querySelector('.dashboard-content');
      const overlay = document.querySelector('.sidebar-overlay');
      
      if (sidebar && container) {
        sidebar.style.left = '-264px';
        sidebar.classList.remove('mobile-open');
        container.classList.remove('sidebar-open');
        container.classList.add('sidebar-closed');
        if (overlay) overlay.classList.remove('active');
      }
    }
  };

  // Enhanced styles for dropdown items
  const dropdownItemStyle = {
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    margin: '8px 0',
    padding: '12px 15px',
    backgroundColor: '#f0f0f8',
    border: '#f0f0f8',
    cursor: 'pointer'
  };

  return (
    <div className="nav-left-sidebar sidebar-dark">
      <div className="menu-list">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
          <div className="logo-gorgia">
            <button
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                display: 'block'
              }}
              onClick={() => window.location.reload()}
              aria-label={t('reload')}
            >
              <img src={logo} className="logo bottom-fade-in" alt="Logo" />
            </button>
          </div>
        </div>
        <hr />
        <div style={{ marginTop: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }} className="fade-in">
          <button
            style={langBtnStyle(language === 'en')}
            onClick={() => setLanguage('en')}
            aria-label="Switch to English"            
          >
            <img src="https://flagcdn.com/w40/gb.png" alt="EN" style={{ width: 24, height: 16, display: 'block'}} />
          </button>
          <button
            style={langBtnStyle(language === 'ru')}
            onClick={() => setLanguage('ru')}
            aria-label="Switch to Russian"
          >
            <img src="https://flagcdn.com/w40/ru.png" alt="RU" style={{ width: 24, height: 16, display: 'block' }} />
          </button>
          <button
            style={langBtnStyle(language === 'ka')}
            onClick={() => setLanguage('ka')}
            aria-label="Switch to Georgian"
          >
            <img src="https://flagcdn.com/w40/ge.png" alt="KA" style={{ width: 24, height: 16, display: 'block' }} />
          </button>
        </div>


        <nav className="navbar navbar-expand-lg navbar-light">
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav flex-column">
              <li className="nav-item">
                {!isSuperAdmin && (
                  <NavLink
                    to="/company-dashboard"
                    className={({ isActive }) => `fade-in nav-link ${isActive ? 'my-active' : ''}`}
                    onClick={handleMobileLinkClick}
                  >
                    <i className="fa fa-fw fa-user-circle"></i>{t('companyDashboard')}
                  </NavLink>
                )}
              </li>
              {isAdmin && (
                <li className="nav-item">
                  <NavLink
                    to="/caller-dashboard"
                    className={({ isActive }) => `fade-in nav-link ${isActive ? 'my-active' : ''}`}
                    onClick={handleMobileLinkClick}
                  >
                    <i className="fa fa-fw fa-user-circle"></i>{t('callerDashboard')}
                  </NavLink>
                </li>
              )}
              {isSuperAdmin && (
                <li className="nav-item">
                  <div
                    className={`${sidebarStyles.dropdownToggle} fade-in nav-link`}
                    onClick={() => setVipOpen((open) => !open)}
                    tabIndex={0}
                    role="button"
                    style={{ 
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div className={sidebarStyles.vip}>
                      <i className="fa fa-fw fa-star"></i>{t('vipDepartment')}
                    </div>
                    <span className={sidebarStyles.arrow + (vipOpen ? ` ${sidebarStyles.open}` : '')}></span>
                  </div>
                  <div
                    className={`${sidebarStyles.dropdownPanel} ${vipOpen ? sidebarStyles.open : ''}`}
                    style={{ 
                      padding: '5px 10px',
                      borderRadius: '10px',
                      margin: '8px 0'
                    }}
                  >
                    <ul className={sidebarStyles.dropdownList}>
                      <li
                        className={sidebarStyles.dropdownItem}
                        style={dropdownItemStyle}
                        onClick={() => {
                          localStorage.setItem('department_id', '1');
                          window.location.href = '/company-dashboard';
                        }}
                      >
                        <i className="fa fa-fw fa-building" style={{ color: '#0173b1', marginRight: '10px' }}></i>
                        <span style={{ fontWeight: '500' }}>{t('companyDashboard')}</span>
                      </li>
                      <li
                        className={sidebarStyles.dropdownItem}
                        style={dropdownItemStyle}
                        onClick={() => {
                          localStorage.setItem('department_id', '1');
                          window.location.href = '/caller-dashboard';
                        }}
                      >
                        <i className="fa fa-fw fa-phone" style={{ color: '#0173b1', marginRight: '10px' }}></i>
                        <span style={{ fontWeight: '500' }}>{t('callerDashboard')}</span>
                      </li>
                    </ul>
                  </div>
                </li>
              )}
              {isSuperAdmin && (
                <li className="nav-item">
                  <div
                    className={`${sidebarStyles.dropdownToggle} fade-in nav-link`}
                    onClick={() => setWorkerOpen((open) => !open)}
                    tabIndex={0}
                    role="button"
                    style={{ 
                      borderRadius: '8px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div className={sidebarStyles.worker}>
                      <i className="fa fa-fw fa-user-circle"></i>{t('workerDepartment')}
                    </div>
                    <span className={sidebarStyles.arrow + (workerOpen ? ` ${sidebarStyles.open}` : '')}></span>
                  </div>
                  <div
                    className={`${sidebarStyles.dropdownPanel} ${workerOpen ? sidebarStyles.open : ''}`}
                    style={{ 
                      padding: '5px 10px',
                      borderRadius: '10px',
                      margin: '8px 0'
                    }}
                  >
                    <ul className={sidebarStyles.dropdownList}>
                      <li
                        className={sidebarStyles.dropdownItem}
                        style={dropdownItemStyle}
                        onClick={() => {
                          localStorage.setItem('department_id', '2');
                          window.location.href = '/company-dashboard';
                        }}
                      >
                        <i className="fa fa-fw fa-building" style={{ color: '#0173b1', marginRight: '10px' }}></i>
                        <span style={{ fontWeight: '500' }}>{t('companyDashboard')}</span>
                      </li>
                    </ul>
                  </div>
                </li>
              )}
              {(isAdmin || isSuperAdmin) && (
                <li className="nav-item">
                  <NavLink
                    to="/admin-dahsboard"
                    className={({ isActive }) => `fade-in nav-link ${isActive ? 'my-active' : ''}`}
                    onClick={handleMobileLinkClick}
                  >
                    <i className="fa fa-fw fa-user-circle"></i>{t('adminDashboard')}
                  </NavLink>
                </li>
              )}
              <li className="nav-item fade-in" style={{ marginTop: '20px' }}>
                <button className={styles.Btn} onClick={handleLogout}>
                  <div className={styles.sign}>
                    <svg viewBox="0 0 512 512">
                      <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                    </svg>
                  </div>
                  <div className={styles.text}>{t('logout')}</div>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
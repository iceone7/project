import React from 'react';
import logo from '../images/logo.png';

const Sidebar = ({ activeDashboard, setActiveDashboard }) => {
  return (
    <div className="nav-left-sidebar sidebar-dark">
      <div className="menu-list">
        <img src={logo} className='logo bottom-fade-in' alt="Logo" />
        <hr />
        <nav className="navbar navbar-expand-lg navbar-light">
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav flex-column">
              <li className="nav-item">
                <button className={`fade-in nav-link ${activeDashboard === 'company' ? 'my-active' : ''}`} onClick={() => setActiveDashboard('company')}>
                  <i className="fa fa-fw fa-user-circle"></i> Company Dashboard
                </button>
              </li>
              <li className="nav-item" style={{ marginTop: '20px' }}>
                <button className={`fade-in nav-link ${activeDashboard === 'caller' ? 'my-active' : ''}`} onClick={() => setActiveDashboard('caller')}>
                  <i className="fa fa-fw fa-user-circle"></i> Caller Dashboard
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

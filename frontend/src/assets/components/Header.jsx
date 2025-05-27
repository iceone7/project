const Header = ({ activeDashboard }) => {
  return (
    <div className="page-header">
      <h2 className="pageheader-title left-fade-in">
        {activeDashboard === 'caller' ? 'Caller Dashboard' : activeDashboard === 'company' ? 'Company Dashboard' : 'Admin Dashboard'}
      </h2>
      <div className="page-breadcrumb">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="#" className="breadcrumb-link">Dashboard</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page"></li>
          </ol>
        </nav>
      </div>
    </div>
  );
};

export default Header;
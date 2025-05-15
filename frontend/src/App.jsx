import React from 'react';

function App() {
  return (
    <div className="dashboard-main-wrapper">
      <div className="nav-left-sidebar sidebar-dark">
        <div className="menu-list">
          <nav className="navbar navbar-expand-lg navbar-light">
            <a className="d-xl-none d-lg-none" href="#">Dashboard</a>
            <button
              className="navbar-toggler"
              type="button"
              data-toggle="collapse"
              data-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav flex-column">
                <li className="nav-divider">Menu</li>
                <li className="nav-item">
                  <a className="nav-link active" href="#">
                    <i className="fa fa-fw fa-user-circle"></i>Dashboard
                    <span className="badge badge-success">6</span>
                  </a>
                </li>
                <li className="nav-item" style={{ marginTop: '20px' }}>
                  <a className="nav-link active" href="#">
                    <i className="fa fa-fw fa-user-circle"></i>Dashboard
                    <span className="badge badge-success">6</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      <div className="dashboard-wrapper">
        <div className="dashboard-ecommerce">
          <div className="container-fluid dashboard-content">
            <div className="row">
              <div className="col-12">
                <div className="page-header">
                  <h2 className="pageheader-title">Dashboard Template</h2>
                  <p className="pageheader-text">
                    Nulla euismod urna eros, sit amet scelerisque torton lectus vel mauris facilisis faucibus at enim quis massa lobortis rutrum.
                  </p>
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
              </div>
            </div>

            <div className="ecommerce-widget">
              <div className="row">
                <div className="col-xl-9 col-lg-12 col-md-6 col-sm-12 col-12">
                  <div className="card">
                    <h5 className="card-header">Recent Orders</h5>
                    <div className="card-body p-0">
                      <div className="table-responsive">
                        <table className="table">
                          <thead className="bg-light">
                            <tr className="border-0">
                              <th>#</th>
                              <th>Caller Name</th>
                              <th>Caller Number</th>
                              <th>Receiver Number</th>
                              <th>Call Count</th>
                              <th>Company Name</th>
                              <th>Data</th>
                              <th>Call Duration</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>1</td>
                              <td>ბაქრაძე მაია</td>
                              <td>995511233276</td>
                              <td>995595072916</td>
                              <td>0</td>
                              <td>Null</td>
                              <td>25-08-2018 21:12:56</td>
                              <td>Null</td>
                              <td><span className="badge-dot badge-brand mr-1"></span>InTransit</td>
                            </tr>
                            {/* другие строки можно также скопировать */}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
}

export default App;

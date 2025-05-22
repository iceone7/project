import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

// logo
import logo from './assets/images/logo.png';

// styles
import styles from './assets/css/CreateButton.module.css';
import download_button from './assets/css/UploadButton.module.css';
import edit_delete from './assets/css/edit_detele.module.css';
import './App.css';

// import components
import AddCallerModal from './assets/components/AddCallerModal';
import AddCompanyModal from './assets/components/AddCompanyModal';
import UploadExcel from './assets/components/UploadExcel';
import FilterForm from './assets/components/FilterForm';

function App() {
  const [showCallerModal, setShowCallerModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [calls, setCalls] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [companyDetails, setCompanyDetails] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [counter, setCounter] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [activeDashboard, setActiveDashboard] = useState(() => {
    return localStorage.getItem('activeDashboard') || 'company';
  });

  useEffect(() => {
    localStorage.setItem('activeDashboard', activeDashboard);
  }, [activeDashboard]);

  // Load companies
  useEffect(() => {
    if (activeDashboard === 'company') {
  console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

      axios.get(`${import.meta.env.VITE_API_BASE_URL}/companies`)
        .then(response => {
          if (response.data.data) {
            setCompanies(response.data.data);
            setFilteredCompanies(response.data.data);
          } else {
            setCompanies(response.data);
            setFilteredCompanies(response.data);
          }
        })
        .catch(error => {
          console.error('Error loading companies:', error);
        });
    }
  }, [activeDashboard]);

  // Load calls and initialize excelData
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_BASE_URL}/get-imported-companies`)
      .then(response => {
        console.log('Server response:', response.data);
        const normalizedData = response.data.data.map(item => ({
          id: item.id || Date.now() + Math.random(),
          companyName: item.company_name || item.companyName || '',
          identificationCode: item.identification_code || item.identificationCode || '',
          contactPerson1: item.contact_person1 || item.contactPerson1 || '',
          tel1: item.tel1 || item.contactTel1 || '',
          contactPerson2: item.contact_person2 || item.contactPerson2 || '',
          tel2: item.tel2 || item.contactTel2 || '',
          contactPerson3: item.contact_person3 || item.contactPerson3 || '',
          tel3: item.tel3 || item.contactTel3 || '',
          callerName: item.caller_name || item.callerName || '',
          callerNumber: item.caller_number || item.callerNumber || '',
          receiverNumber: item.receiver_number || item.receiverNumber || '',
          callCount: item.call_count || item.callCount || 0,
          callDate: item.call_date || item.callDate || '',
          callDuration: item.call_duration || item.callDuration || '',
          callStatus: item.call_status || item.callStatus || '',
        }));
        setCompanyDetails(normalizedData);
        setExcelData(normalizedData);
      })
      .catch(error => {
        console.error('Error loading calls:', error);
      });
  }, []);

  // Delete company
  const handleDeleteCompany = (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      axios.delete(`${import.meta.env.VITE_API_BASE_URL}/companies/${id}`)
        .then(response => {
          if (response.data.success) {
            setCompanies(companies.filter(company => company.id !== id));
            setFilteredCompanies(filteredCompanies.filter(company => company.id !== id));
          } else {
            alert('Error deleting company');
          }
        })
        .catch(error => {
          console.error('Error deleting company:', error);
        });
    }
  };

  // Edit item
  const handleEdit = (item) => {
    setEditingItem(item);
    setEditMode(true);
    if (activeDashboard === 'caller') {
      setShowCallerModal(true);
    } else {
      setShowCompanyModal(true);
    }
  };

  // Update company
  const handleUpdateCompany = (data) => {
    axios.put(`${import.meta.env.VITE_API_BASE_URL}/companies/${editingItem.id}`, data)
      .then(response => {
        if (response.data.success) {
          setCompanies(companies.map(company => 
            company.id === editingItem.id ? response.data.data : company
          ));
          setFilteredCompanies(filteredCompanies.map(company => 
            company.id === editingItem.id ? response.data.data : company
          ));
          setShowCompanyModal(false);
          setEditMode(false);
          setEditingItem(null);
        } else {
          alert('Error updating company');
        }
      })
      .catch(error => {
        console.error('Error updating company:', error);
      });
  };

  // Update call
  const handleUpdateCaller = (data) => {
    axios.put(`${import.meta.env.VITE_API_BASE_URL}/update_caller.php?id=${editingItem.id}`, data)
      .then(response => {
        if (response.data.success) {
          setCalls(calls.map(call => 
            call.id === editingItem.id ? {...call, ...data} : call
          ));
          setShowCallerModal(false);
          setEditMode(false);
          setEditingItem(null);
        } else {
          alert('Error updating call');
        }
      })
      .catch(error => {
        console.error('Error updating call:', error);
      });
  };

  // Open modal based on active dashboard
  const handleOpenModal = () => {
    if (activeDashboard === 'caller') {
      setShowCallerModal(true);
    } else if (activeDashboard === 'company') {
      setShowCompanyModal(true);
    }
  };

  // Handle filter application
  const handleFilterApply = useCallback((filteredData) => {
    console.log('handleFilterApply called with data:', filteredData);
    setFilteredCompanies(filteredData);
  }, []);

  // useCallback
  const onUploadSuccess = useCallback((data) => {
    console.log('onUploadSuccess called with data:', data);
    setExcelData(data);
  }, []);

  // Download Excel for Company Dashboard
  const handleDownloadExcel = () => {
    console.log('handleDownloadExcel triggered, filteredCompanies:', filteredCompanies);
    if (!filteredCompanies || !filteredCompanies.length) {
      alert('No data to download');
      return;
    }

    try {
      const headers = [
        'Tender Number',
        'Buyer',
        'Contact Person #1',
        'Phone #1',
        'Contact Person #2',
        'Phone #2',
        'Email',
        'Executor',
        'ID Code',
        'Contract Value',
        'Total Value Gorgia',
        'Last Purchase Date Gorgia',
        'Contract End Date',
        'Foundation Date',
        'Manager',
        'Status',
      ];

      const exportData = filteredCompanies.map(row => [
        row.tenderNumber || 'N/A',
        row.buyer || 'N/A',
        row.contact1 || 'N/A',
        row.phone1 || 'N/A',
        row.contact2 || 'N/A',
        row.phone2 || 'N/A',
        row.email || 'N/A',
        row.executor || 'N/A',
        row.idCode || 'N/A',
        row.contractValue || 'N/A',
        row.totalValueGorgia || 'N/A',
        row.lastPurchaseDateGorgia || 'N/A',
        row.contractEndDate || 'N/A',
        row.foundationDate || 'N/A',
        row.manager || 'N/A',
        row.status || 'N/A',
      ]);

      console.log('Export data prepared:', exportData);
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);

      console.log('Setting column widths...');
      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
        );
        return { wch: maxLength + 2 };
      });
      worksheet['!cols'] = colWidths;

      console.log('Creating workbook...');
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;

      const fileName = `company_data_${dateStr}.xlsx`;
      console.log('Writing file:', fileName);
      XLSX.writeFile(workbook, fileName);
      console.log('File downloaded successfully');
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error downloading file: ' + err.message);
    }
  };

  // Add call
  const handleAddCaller = (data) => {
    if (editMode) {
      handleUpdateCaller(data);
      return;
    }
    
    const newCaller = {
      callerName: data.callerName || 'Null',
      callerNumber: data.callerNumber || 'Null',
      receiverNumber: data.receiverNumber || 'Null',
      callCount: 0,
      companyName: 'Null',
      data: 'Null',
      duration: 'Null',
      status: 'InTransit'
    };

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/save_caller.php`, newCaller)
      .then(response => {
        if (response.data.success) {
          setCalls(prev => [...prev, { ...newCaller, id: counter }]);
          setCounter(prev => prev + 1);
          setShowCallerModal(false);
        } else {
          alert('Error saving call');
        }
      })
      .catch(error => {
        console.error('Error saving call:', error);
      });
  };

  // Add company
  const handleAddCompany = (data) => {
    if (editMode) {
      handleUpdateCompany(data);
      return;
    }
    
    const newCompany = {
      companyName: data.companyName || 'Null',
      identificationCode: data.identificationCode || 'Null',
      contactPerson1: data.contactPerson1 || 'Null',
      tel1: data.tel1 || 'Null',
      contactPerson2: data.contactPerson2 || 'Null',
      tel2: data.tel2 || 'Null',
      contactPerson3: data.contactPerson3 || 'Null',
      tel3: data.tel3 || 'Null',
    };

    axios.post(`${import.meta.env.VITE_API_BASE_URL}/save_company.php`, newCompany)
      .then(response => {
        if (response.data.success) {
          setShowCompanyModal(false);
        } else {
          alert('Error saving company');
        }
      })
      .catch(error => {
        console.error('Error saving company:', error);
      });
  };

  return (
    <div className="dashboard-main-wrapper">
      <div className="nav-left-sidebar sidebar-dark">
        <div className="menu-list">
          <img src={logo} className='logo bottom-fade-in' alt="Logo"/>
          <hr />
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
                <li className="nav-item">
                  <button className={`fade-in nav-link ${activeDashboard === 'company' ? 'my-active' : ''}`} onClick={() => setActiveDashboard('company')}>
                    <i className="fa fa-fw fa-user-circle"></i>Company Dashboard
                    <span className="badge badge-success">6</span>
                  </button>
                </li>
                <li className="nav-item" style={{ marginTop: '20px' }}>
                  <button className={`fade-in nav-link ${activeDashboard === 'caller' ? 'my-active' : ''}`} onClick={() => setActiveDashboard('caller')}>
                    <i className="fa fa-fw fa-user-circle"></i>Caller Dashboard
                    <span className="badge badge-success">6</span>
                  </button>
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
                  <h2 className="pageheader-title left-fade-in">
                    {activeDashboard === 'caller' ? 'Caller Dashboard' : 'Company Dashboard'}
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
                  <div className="buttons">
                    {activeDashboard === 'company' && (
                      <div className='fade-in' style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="create">
                          <button className={styles.button} onClick={handleOpenModal}>
                            <span className={styles.text}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M0 0h24v24H0z" fill="none"></path>
                                <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" fill="currentColor"></path>
                              </svg>
                              Create
                            </span>
                          </button>
                        </div>
                        <button
                          className={download_button.DownloadButton}
                          onClick={handleDownloadExcel}
                          disabled={!filteredCompanies?.length}
                        >
                          <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="16"
                              width="20"
                              viewBox="0 0 640 512"
                            >
                              <path
                                d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                                fill="white"
                              />
                            </svg>
                            Download
                        </button>
                        <FilterForm
                          onlyButton={true}
                          onToggleFilters={() => setShowFilters(!showFilters)}
                        />
                      </div>
                    )}
                    {activeDashboard === 'caller' && (
                      <div className="caller-dashboard fade-in">
                        <UploadExcel onUploadSuccess={onUploadSuccess} excelData={excelData} />
                      </div>
                    )}     
                  </div>              
                  {showCallerModal && (
                    <AddCallerModal
                      onClose={() => setShowCallerModal(false)}
                      onSave={handleAddCaller}
                      editingItem={editingItem}
                      editMode={editMode}
                    />
                  )}
                  {showCompanyModal && (
                    <AddCompanyModal
                      onClose={() => setShowCompanyModal(false)}
                      onSave={handleAddCompany}
                      editingItem={editingItem}
                      editMode={editMode}
                    />
                  )}
                  {activeDashboard === 'company' && (
                      <FilterForm
                        data={companies}
                        onFilterApply={handleFilterApply}
                        showFilters={showFilters}
                        onToggleFilters={() => setShowFilters(!showFilters)}
                        onlyForm={true}
                        dashboardType="company"
                      />
                    )}
                </div>
              </div>
            </div>

            <div className="ecommerce-widget">
              <div className="row">
                <div className="col-12">
                  <div key={activeDashboard} className="animated-section fade-in">
                    <div className="card">
                      <h5 className="card-header">Recent Orders</h5>
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table">
                            <thead className="bg-light">
                              {activeDashboard === 'caller' ? (
                                <tr className="border-0">
                                  <th>#</th>
                                  <th>Company Name</th>
                                  <th>Identification Code or ID</th>
                                  <th>Contact Person #1</th>
                                  <th>Tel</th>
                                  <th>Contact Person #2</th>
                                  <th>Tel</th>
                                  <th>Contact Person #3</th>
                                  <th>Tel</th>
                                  <th>Caller Name</th>
                                  <th>Caller Number</th>
                                  <th>Receiver Number</th>
                                  <th>Call Count</th>
                                  <th>Call Date</th>
                                  <th>Call Duration</th>
                                  <th>Call Status</th>
                                </tr>
                              ) : (
                                <tr className="border-0">
                                  <th>#</th>
                                  <th>ტენდერის N</th>
                                  <th>შემსყიდველი</th>
                                  <th>საკ. პირი #1</th>
                                  <th>ტელ</th>
                                  <th>საკ.პირი #2</th>
                                  <th>ტელ</th>
                                  <th>ელ-ფოსტა</th>
                                  <th>შემსრულებელი</th>
                                  <th>ს/კ -ID</th>
                                  <th>ხელშ. ღირებ.</th>
                                  <th>გორგიაში შესყ. ჯამურ. ღირ</th>
                                  <th>გორგიაში ბოლო შესყ. თარ.</th>
                                  <th>დაკონტ. საორ. თარიღი</th>
                                  <th>დაფუძ. თარიღი</th>
                                  <th>მენეჯერი</th>
                                  <th>სტატუსი</th>
                                  <th>Edit / Delete</th>
                                </tr>
                              )}
                            </thead>

                            <tbody>
                              {activeDashboard === 'caller' ? (
                                excelData.length > 0 ? (
                                  excelData.map((call, index) => (
                                    <tr key={index}>
                                      <td>{index + 1}</td>
                                      <td>{call.companyName}</td>
                                      <td>{call.identificationCode || call.id}</td>
                                      <td>{call.contactPerson1}</td>
                                      <td>{call.tel1}</td>
                                      <td>{call.contactPerson2}</td>
                                      <td>{call.tel2}</td>
                                      <td>{call.contactPerson3}</td>
                                      <td>{call.tel3}</td>
                                      <td>{call.callerName}</td>
                                      <td>{call.callerNumber}</td>
                                      <td>{call.receiverNumber}</td>
                                      <td>{call.callCount}</td>
                                      <td>{call.callDate}</td>
                                      <td>{call.callDuration}</td>
                                      <td>{call.callStatus}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="16">No data available</td>
                                  </tr>
                                )
                              ) : (
                                filteredCompanies.map((company, index) => (
                                  <tr key={company.id || index}>
                                    <td>{index + 1}</td>
                                    <td>{company.tenderNumber || 'N/A'}</td>
                                    <td>{company.buyer || 'N/A'}</td>
                                    <td>{company.contact1 || 'N/A'}</td>
                                    <td>{company.phone1 || 'N/A'}</td>
                                    <td>{company.contact2 || 'N/A'}</td>
                                    <td>{company.phone2 || 'N/A'}</td>
                                    <td>{company.email || 'N/A'}</td>
                                    <td>{company.executor || 'N/A'}</td>
                                    <td>{company.idCode || 'N/A'}</td>
                                    <td>{company.contractValue || 'N/A'}</td>
                                    <td>{company.totalValueGorgia || 'N/A'}</td>
                                    <td>{company.lastPurchaseDateGorgia || 'N/A'}</td>
                                    <td>{company.contractEndDate || 'N/A'}</td>
                                    <td>{company.foundationDate || 'N/A'}</td>
                                    <td>{company.manager || 'N/A'}</td>
                                    <td>{company.status || 'N/A'}</td>
                                    <td className={edit_delete.editdelete}>                                
                                      <button 
                                        onClick={() => handleDeleteCompany(company.id)} 
                                        className={edit_delete.deletebutton}
                                      >
                                        <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                          <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                        </svg>
                                      </button>
                                      <button onClick={() => handleEdit(company)} className={edit_delete.editbutton}>
                                        <svg className={edit_delete.editsvgIcon} viewBox="0 0 512 512">
                                          <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
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
    </div>
  );
}

export default App;
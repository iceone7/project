import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';

// components
import AddCallerModal from './assets/components/AddCallerModal';
import AddCompanyModal from './assets/components/AddCompanyModal';
import FilterForm from './assets/components/FilterForm';
import Sidebar from './assets/components/Sidebar';
import Header from './assets/components/Header';
import ButtonsPanel from './assets/components/ButtonsPanel';
import DataTable from './assets/components/DataTable';
import defaultInstance from './api/defaultInstance';

function App({ dashboardType = 'company' }) {
  const [showCallerModal, setShowCallerModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [calls, setCalls] = useState([]);
  const [companyDetails, setCompanyDetails] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [counter, setCounter] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load companies
  useEffect(() => {
    if (dashboardType === 'company') {
      defaultInstance.get('/companies')
      // axios.get('http://localhost:8000/api/companies')
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
  }, [dashboardType]);

  // Load calls and initialize excelData
  useEffect(() => {
    if (dashboardType === 'caller') {
      axios.get('http://localhost:8000/api/get-imported-companies')
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
    }
  }, [dashboardType]);

  // Delete company
  const handleDeleteCompany = (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      axios.delete(`http://localhost:8000/api/companies/${id}`)
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
    if (dashboardType === 'caller') {
      setShowCallerModal(true);
    } else {
      setShowCompanyModal(true);
    }
  };

  // Update company
  const handleUpdateCompany = (data) => {
    axios.put(`http://localhost:8000/api/companies/${editingItem.id}`, data)
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
    axios.put(`http://localhost/caller-app/update_caller.php?id=${editingItem.id}`, data)
      .then(response => {
        if (response.data.success) {
          setCalls(calls.map(call => 
            call.id === editingItem.id ? { ...call, ...data } : call
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

  // Open modal based on dashboard type
  const handleOpenModal = () => {
    if (dashboardType === 'caller') {
      setShowCallerModal(true);
    } else if (dashboardType === 'company') {
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

    axios.post('http://localhost/caller-app/save_caller.php', newCaller)
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

    axios.post('http://localhost/caller-app/save_company.php', newCompany)
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
      <Sidebar activeDashboard={dashboardType} setActiveDashboard={() => {}} />
      <div className="dashboard-wrapper">
        <div className="dashboard-ecommerce">
          <div className="container-fluid dashboard-content">
            <div className="row">
              <div className="col-12">
                <Header activeDashboard={dashboardType} />
                <ButtonsPanel
                  activeDashboard={dashboardType}
                  handleOpenModal={handleOpenModal}
                  handleDownloadExcel={handleDownloadExcel}
                  filteredCompanies={filteredCompanies}
                  setShowFilters={setShowFilters}
                  showFilters={showFilters}
                  onUploadSuccess={onUploadSuccess}
                  excelData={excelData}
                />
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
                {dashboardType === 'company' && (
                  <FilterForm
                    data={companies}
                    onFilterApply={handleFilterApply}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    onlyForm={true}
                    dashboardType="company"
                  />
                )}
                <DataTable
                  activeDashboard={dashboardType}
                  excelData={excelData}
                  filteredCompanies={filteredCompanies}
                  handleDeleteCompany={handleDeleteCompany}
                  handleEdit={handleEdit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}

export default App;
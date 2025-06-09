import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import * as XLSX from 'xlsx';
import AddCallerModal from './assets/components/AddCallerModal';
import AddCompanyModal from './assets/components/AddCompanyModal';
import FilterForm from './assets/components/FilterForm';
import Sidebar from './assets/components/Sidebar';
import Header from './assets/components/Header';
import ButtonsPanel from './assets/components/ButtonsPanel';
import DataTable from './assets/components/DataTable';
import defaultInstance from './api/defaultInstance';
import AdminDashboard from './assets/components/AdminDashboard';
import deleteModalStyles from './assets/css/DeleteModal.module.css';
import { LanguageProvider, useLanguage } from './assets/i18n/LanguageContext';

// ConfirmModal componenttttttttttttttttttt
function ConfirmModal({ open, onCancel, onConfirm, text }) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className={deleteModalStyles.deleteModalOverlay} onClick={onCancel}>
      <div className={deleteModalStyles.deleteModalContent} onClick={e => e.stopPropagation()}>
        <div className={deleteModalStyles.deleteModalHeader}>
          <span role="img" aria-label="warning" style={{ fontSize: 32, marginRight: 10 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: 20, color: '#ef4444' }}>{t('confirmDeletion')}</span>
        </div>
        <div className={deleteModalStyles.deleteModalText}>{t('areYouSureDelete')}</div>
        <div className={deleteModalStyles.deleteModalFooter}>
          <button onClick={onCancel} className={deleteModalStyles.cancelBtn}>
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className={deleteModalStyles.deleteBtn}>
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function App({ dashboardType = 'company' }) {
  const [showCallerModal, setShowCallerModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (dashboardType === 'company') {
      defaultInstance
        .get('/company-excel-uploads')
        .then((response) => {
          const data = response.data.data || [];
          setCompanies(data);
          setFilteredCompanies(data);
        })
        .catch((error) => {
          console.error('Error loading companies:', error);
        });
    }
  }, [dashboardType]);

  useEffect(() => {
    if (dashboardType === 'caller') {
      defaultInstance
        .get(`${import.meta.env.VITE_API_BASE_URL}/get-imported-companies`)
        .then((response) => {
          console.log('Server response:', response.data);
          const normalizedData = response.data.data.map((item) => ({
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
          setExcelData(normalizedData);
          setFilteredCompanies(normalizedData);
        })
        .catch((error) => {
          console.error('Error loading calls:', error);
        });
    }
  }, [dashboardType]);

  const handleCallerUploadSuccess = (data) => {
    setExcelData(data);
    setFilteredCompanies(data);
  };

  const handleCompanyUploadSuccess = async (data) => {
    const normalizedData = data.map((item, index) => ({
      id: item.id,
      tenderNumber: item.tenderNumber || item.tender_number || '',
      buyer: item.buyer || '',
      contact1: item.contact1 || item.contact_1 || '',
      phone1: item.phone1 || item.phone_1 || '',
      contact2: item.contact2 || item.contact_2 || '',
      phone2: item.phone2 || item.phone_2 || '',
      email: item.email || '',
      executor: item.executor || '',
      idCode: item.idCode || item.id_code || '',
      contractValue: item.contractValue || item.contract_value || '',
      totalValueGorgia: item.totalValueGorgia || item.total_value_gorgia || '',
      lastPurchaseDateGorgia: item.lastPurchaseDateGorgia || item.last_purchase_date_gorgia || '',
      contractEndDate: item.contractEndDate || item.contract_end_date || '',
      foundationDate: item.foundationDate || item.foundation_date || '',
      manager: item.manager || '',
      status: item.status || '',
    }));
    console.log('Normalized company data:', normalizedData);
    setPreviewData(normalizedData);
    try {
      await defaultInstance.post('/company-excel-uploads', { data: normalizedData });
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
      setPreviewData([]);
    } catch (err) {
      alert('Failed to save data: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleEdit = async (updatedData) => {
    try {
      await defaultInstance.put(`/company-excel-uploads/${updatedData.id}`, updatedData);
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
    } catch (err) {
      alert('Failed to update company: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleDeleteCompany = (id) => {
    setDeleteTargetId(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteCompany = async () => {
    try {
      await defaultInstance.delete(`/company-excel-uploads/${deleteTargetId}`);
      const response = await defaultInstance.get('/company-excel-uploads');
      const dbData = response.data.data || [];
      setCompanies(dbData);
      setFilteredCompanies(dbData);
    } catch (error) {
      alert('Error deleting company: ' + (error?.response?.data?.error || error.message));
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDeleteCompany = () => {
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const handleDownloadExcel = async () => {
    try {
      console.log('Starting downloadExcel, using filteredCompanies:', filteredCompanies);
      const dbData = filteredCompanies || [];
      if (!dbData.length) {
        alert('No data to download');
        return;
      }

      const exportRows = dbData.map(row => ({
        tenderNumber: row.tenderNumber ?? row.tender_number ?? '',
        buyer: row.buyer ?? '',
        contact1: row.contact1 ?? '',
        phone1: row.phone1 ?? '',
        contact2: row.contact2 ?? '',
        phone2: row.phone2 ?? '',
        email: row.email ?? '',
        executor: row.executor ?? '',
        idCode: row.idCode ?? row.id_code ?? '',
        contractValue: row.contractValue ?? row.contract_value ?? '',
        totalValueGorgia: row.totalValueGorgia ?? row.total_value_gorgia ?? '',
        lastPurchaseDateGorgia: row.lastPurchaseDateGorgia ?? row.last_purchase_date_gorgia ?? '',
        contractEndDate: row.contractEndDate ?? row.contract_end_date ?? '',
        foundationDate: row.foundationDate ?? row.foundation_date ?? '',
        manager: row.manager ?? '',
        status: row.status ?? '',
      }));

      const headers = [
        'ტენდერის N',
        'შემსყიდველი',
        'საკ. პირი #1',
        'ტელ #1',
        'საკ. პირი #2',
        'ტელ #2',
        'ელ-ფოსტა',
        'შემსრულებელი',
        'ს/კ -ID',
        'ხელშ. ღირებ.',
        'გორგიაში შესყ. ჯამურ. ღირ',
        'გორგიაში ბოლო შესყ. თარ.',
        'დაკონტ. საორ. თარიღი',
        'დაფუძ. თარიღი',
        'მენეჯერი',
        'სტატუსი',
      ];

      const keys = [
        'tenderNumber',
        'buyer',
        'contact1',
        'phone1',
        'contact2',
        'phone2',
        'email',
        'executor',
        'idCode',
        'contractValue',
        'totalValueGorgia',
        'lastPurchaseDateGorgia',
        'contractEndDate',
        'foundationDate',
        'manager',
        'status',
      ];

      const exportData = exportRows.map(row => keys.map(k => row[k] || ''));
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      worksheet['!cols'] = headers.map((h, i) => ({
        wch: Math.max(
          h.length,
          ...exportData.map(row => (row[i] ? row[i].toString().length : 0))
        ) + 2,
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const fileName = `company_data_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error('Download error:', err.message);
      alert('Error downloading file: ' + err.message);
    }
  };

  const handleCallerFilterApply = (filtered) => {
    setExcelData(filtered);
    setFilteredCompanies(filtered);
  };

  const handleCompanyFilterApply = (filtered) => {
    setFilteredCompanies(filtered);
  };

  return (
    <LanguageProvider>
      <div className="dashboard-main-wrapper">
        {dashboardType === 'admin' ? (
          <AdminDashboard />
        ) : (
          <>
            <Sidebar activeDashboard={dashboardType} setActiveDashboard={() => {}} />
            <div className="dashboard-wrapper">
              <div className="dashboard-ecommerce">
                <div className="container-fluid dashboard-content">
                  <div className="row">
                    <div className="col-12">
                      <Header activeDashboard={dashboardType} />
                      <ButtonsPanel
                        activeDashboard={dashboardType}
                        handleOpenModal={() => setShowCompanyModal(true)}
                        handleDownloadExcel={handleDownloadExcel}
                        filteredCompanies={filteredCompanies}
                        setShowFilters={setShowFilters}
                        showFilters={showFilters}
                        onUploadSuccess={handleCallerUploadSuccess}
                        excelData={excelData}
                        onCompanyUploadSuccess={handleCompanyUploadSuccess}
                      />
                      {showCallerModal && (
                        <AddCallerModal
                          onClose={() => setShowCallerModal(false)}
                          editingItem={editingItem}
                          editMode={editMode}
                        />
                      )}
                      {showCompanyModal && (
                        <AddCompanyModal
                          onClose={() => setShowCompanyModal(false)}
                          editingItem={editingItem}
                          editMode={editMode}
                        />
                      )}
                      {dashboardType === 'company' && (
                        <FilterForm
                          data={companies}
                          onFilterApply={handleCompanyFilterApply}
                          showFilters={showFilters}
                          onToggleFilters={() => setShowFilters(!showFilters)}
                          onlyForm={true}
                          dashboardType="company"
                        />
                      )}
                      {dashboardType === 'caller' && (
                        <FilterForm
                          data={excelData}
                          onFilterApply={handleCallerFilterApply}
                          showFilters={showFilters}
                          onToggleFilters={() => setShowFilters(!showFilters)}
                          onlyForm={true}
                          dashboardType="caller"
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
            <ConfirmModal
              open={showDeleteModal}
              onCancel={cancelDeleteCompany}
              onConfirm={confirmDeleteCompany}
              text="Are you sure you want to delete this company?"
            />
          </>
        )}
      </div>
    </LanguageProvider>
  );
}

export default App;
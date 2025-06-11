import styles from '../css/CreateButton.module.css';
import download_button from '../css/UploadButton.module.css';
import FilterForm from './FilterForm';
import UploadExcel from './UploadExcel';
import UploadCompanyExcel from './UploadCompanyExcel';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import defaultInstance from '../../api/defaultInstance';

const isDepartamentCraftsmen = localStorage.getItem('department_id') === '2';

const ButtonsPanel = ({
  activeDashboard,
  handleOpenModal,
  handleDownloadExcel,
  filteredCompanies,
  setShowFilters,
  showFilters,
  onUploadSuccess,
  excelData,
  onCompanyUploadSuccess,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Enhanced download function that ensures data availability
  const handleDownloadAllData = async () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Directly fetch data from API to ensure we have the latest
      const response = await defaultInstance.get('/company-excel-uploads');
      const companies = response.data.data || [];
      
      if (!companies || companies.length === 0) {
        alert('No data available to download');
        setIsExporting(false);
        return;
      }
      
      console.log(`Fetched ${companies.length} companies for export`);
      
      // Define Georgian headers for export
      const headers = [
        'ტენდერის N',
        'შემსყიდველი',
        'საკ. პირი #1',
        'ტელ #1',
        'საკ. პირი #2',
        'ტელ #2',
        'საკ. პირი #3',
        'ტელ #3',
        'ელ-ფოსტა',
        'შემსრულებელი',
        'ს/კ -ID',
        'ხელშ. ღირებ.',
        'გორგიაში შესყ. ჯამურ. ღირ',
        'გორგიაში ბოლო შესყ. თარ.',
        'დაკონტ. საორ. თარიღი',
        'დაფუძ. თარიღი',
        'მენეჯერი',
        'მენეჯერის ნომერი',
        'სტატუსი'
      ];
      
      // Map data for export - handle both camelCase and snake_case field names
      const exportData = companies.map(company => [
        company.tenderNumber || company.tender_number || '',
        company.buyer || '',
        company.contact1 || company.contact_1 || '',
        company.phone1 || company.phone_1 || '',
        company.contact2 || company.contact_2 || '',
        company.phone2 || company.phone_2 || '',
        company.contact3 || company.contact_3 || '',
        company.phone3 || company.phone_3 || '',
        company.email || '',
        company.executor || '',
        company.idCode || company.id_code || '',
        company.contractValue || company.contract_value || '',
        company.totalValueGorgia || company.total_value_gorgia || '',
        company.lastPurchaseDateGorgia || company.last_purchase_date_gorgia || '',
        company.contractEndDate || company.contract_end_date || '',
        company.foundationDate || company.foundation_date || '',
        company.manager || '',
        company.managerNumber || company.manager_number || '',
        company.status || ''
      ]);
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      
      // Set column widths
      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? String(row[colIndex]).length : 0))
        );
        return { wch: maxLength + 2 }; // Add some padding
      });
      worksheet['!cols'] = colWidths;
      
      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
      
      // Generate filename with current date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const fileName = `company_data_${dateStr}.xlsx`;
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, fileName);
      console.log('Company data export successful');
    } catch (err) {
      console.error('Error exporting company data:', err);
      setExportError('Failed to download data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // New function to handle caller data export
  const handleExportCallerData = () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Check if there's data to export
      if (!excelData || excelData.length === 0) {
        alert('No caller data available to export');
        setIsExporting(false);
        return;
      }
      
      console.log(`Exporting ${excelData.length} caller records`);
      
      // Define headers for caller export
      const headers = [
        'Company Name', 'ID Code', 'Contact Person #1', 'Phone #1',
        'Contact Person #2', 'Phone #2', 'Contact Person #3', 'Phone #3',
        'Caller Name', 'Caller Number', 'Receiver Name', 'Receiver Number',
        'Call Count', 'Call Date', 'Call Duration', 'Call Status'
      ];
      
      // Map data for export - handle both camelCase and snake_case field names
      const exportData = excelData.map(call => [
        call.companyName || call.company_name || '',
        call.idCode || call.identification_code || '',
        call.contactPerson1 || call.contact_person1 || '',
        call.phone1 || call.tel1 || '',
        call.contactPerson2 || call.contact_person2 || '',
        call.phone2 || call.tel2 || '',
        call.contactPerson3 || call.contact_person3 || '',
        call.phone3 || call.tel3 || '',
        call.callerName || call.caller_name || '',
        call.callerNumber || call.caller_number || '',
        call.receiverName || call.receiver_name || '',
        call.receiverNumber || call.receiver_number || '',
        call.callCount || call.call_count || '0',
        call.callDate || call.call_date || '',
        call.callDuration || call.call_duration || '',
        call.callStatus || call.call_status || ''
      ]);
      
      // Create worksheet with headers and data
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      
      // Set column widths
      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? String(row[colIndex]).length : 0))
        );
        return { wch: maxLength + 2 }; // Add some padding
      });
      worksheet['!cols'] = colWidths;
      
      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Caller Data');
      
      // Generate filename with current date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const fileName = `caller_data_${dateStr}.xlsx`;
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, fileName);
      console.log('Caller data export successful');
    } catch (err) {
      console.error('Error exporting caller data:', err);
      setExportError('Failed to export caller data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // Simplified template download function
  const handleDownloadTemplate = () => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Define the template headers based on the dashboard type
      const headerObj = {};
      
      if (activeDashboard === 'caller') {
        // Headers for caller dashboard template
        headerObj['Company Name'] = '';
        headerObj['ID Code'] = '';
        headerObj['Contact Person #1'] = '';
        headerObj['Phone #1'] = '';
        headerObj['Contact Person #2'] = '';
        headerObj['Phone #2'] = '';
        headerObj['Contact Person #3'] = '';
        headerObj['Phone #3'] = '';
        headerObj['Caller Name'] = '';
        headerObj['Caller Number'] = '';
        headerObj['Receiver Name'] = '';
        headerObj['Receiver Number'] = '';
        headerObj['Call Count'] = '';
        headerObj['Call Date'] = '';
        headerObj['Call Duration'] = '';
        headerObj['Call Status'] = '';
      } else {
        // Headers for company dashboard template (Georgian)
        headerObj['ტენდერის N'] = '';
        headerObj['შემსყიდველი'] = '';
        headerObj['საკ. პირი #1'] = '';
        headerObj['ტელ #1'] = '';
        headerObj['საკ. პირი #2'] = '';
        headerObj['ტელ #2'] = '';
        headerObj['საკ. პირი #3'] = '';
        headerObj['ტელ #3'] = '';
        headerObj['ელ-ფოსტა'] = '';
        headerObj['შემსრულებელი'] = '';
        headerObj['ს/კ -ID'] = '';
        headerObj['ხელშ. ღირებ.'] = '';
        headerObj['გორგიაში შესყ. ჯამურ. ღირ'] = '';
        headerObj['გორგიაში ბოლო შესყ. თარ.'] = '';
        headerObj['დაკონტ. საორ. თარიღი'] = '';
        headerObj['დაფუძ. თარიღი'] = '';
        headerObj['მენეჯერი'] = '';
        headerObj['მენეჯერის ნომერი'] = '';
        headerObj['სტატუსი'] = '';
      }
      
      // Create worksheet with empty rows
      const data = [headerObj, {}, {}, {}];  // Header row and 3 empty rows
      const worksheet = XLSX.utils.json_to_sheet(data, { header: Object.keys(headerObj) });
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      // Generate filename with current date
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Set filename based on dashboard type
      const fileName = activeDashboard === 'caller' 
        ? `caller_template_${dateStr}.xlsx` 
        : `company_template_${dateStr}.xlsx`;
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, fileName);
      console.log(`${activeDashboard.charAt(0).toUpperCase() + activeDashboard.slice(1)} template download successful`);
    } catch (err) {
      console.error('Error creating template:', err);
      setExportError('Failed to create template: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // Use handleDownloadAllData for the main download button, 
  // and handleDownloadExcel for filtered data
  
  return (
    <div className="buttons" style={{ marginBottom: '20px' }}>
      {activeDashboard === 'company' && !isDepartamentCraftsmen && (
        <div className="fade-in" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
            onClick={handleDownloadAllData}
            disabled={isExporting}
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
            {isExporting ? 'Downloading...' : 'Download'}
          </button>

          <FilterForm
            onlyButton={true}
            onToggleFilters={() => setShowFilters(!showFilters)}
            dashboardType="company"
            onDownloadFiltered={handleDownloadExcel} // Pass download function
          />
          <UploadCompanyExcel onPreviewSuccess={onCompanyUploadSuccess} />
          {exportError && <div style={{ color: 'red', marginLeft: '10px' }}>{exportError}</div>}
        </div>
      )}
      {activeDashboard === 'caller' && (
        <div className="caller-dashboard fade-in" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <UploadExcel
            onUploadSuccess={onUploadSuccess}
            excelData={excelData}
          />
          <button
            className={download_button.DownloadButton}
            onClick={handleExportCallerData}
            disabled={isExporting || !excelData || excelData.length === 0}
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
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
          <FilterForm
            onlyButton={true}
            onToggleFilters={() => setShowFilters(!showFilters)}
            dashboardType="caller"
            onDownloadFiltered={handleDownloadExcel} // Pass download function
          />
          {exportError && <div style={{ color: 'red', marginLeft: '10px' }}>{exportError}</div>}
        </div>
      )}
    </div>
  );
};

export default ButtonsPanel;
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import styles from '../css/UploadButton.module.css';
import FilterForm from './FilterForm';

const UploadExcel = ({ onUploadSuccess, excelData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get-imported-companies`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const json = await response.json();
        console.log('Fetched data from server:', json);
        const normalizedData = json.data.map(item => ({
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
        console.log('Normalized server data:', normalizedData);
        onUploadSuccess(normalizedData);
      } catch (error) {
        console.error('Error fetching data from the server: ', error);
        setError('Error fetching data from the server: ' + error.message);
      }
    };

    fetchData();
  }, [onUploadSuccess]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const newFormattedData = jsonData.map((row, index) => ({
          id: index + 1,
          companyName: row['Company Name'] || '',
          identificationCode: row['Identification Code or ID'] || '',
          contactPerson1: row['Contact Person #1'] || '',
          tel1: row['Tel'] || '',
          contactPerson2: row['Contact Person #2'] || '',
          tel2: row['Tel #2'] || '',
          contactPerson3: row['Contact Person #3'] || '',
          tel3: row['Tel #3'] || '',
          callerName: row['Caller Name'] || '',
          callerNumber: row['Caller Number'] || '',
          receiverNumber: row['Receiver Number'] || '',
          callCount: row['Call Count'] || 0,
          callDate: formatExcelDate(row['Call Date']),
          callDuration: row['Call Duration'] || '',
          callStatus: row['Call Status (Answered, No Answer, Busy, Failed)'] || '',
        }));

        console.log('Formatted data from file:', newFormattedData);
        await uploadToServer(newFormattedData);
        onUploadSuccess(newFormattedData);
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Error processing Excel file: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const formatExcelDate = (excelDate) => {
    if (!excelDate) return '';
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return excelDate;
  };

  const uploadToServer = async (data) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/import-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) throw new Error('Error uploading data to server');
      console.log('Data uploaded to server successfully');
    } catch (err) {
      console.error('Upload error:', err);
      setError('Error uploading data to server: ' + err.message);
      throw err;
    }
  };

  const handleDownloadExcel = () => {
    console.log('handleDownloadExcel triggered, excelData:', excelData);
    if (!excelData || !excelData.length) {
      alert('No data to download');
      return;
    }

    try {
      const headers = [
        'Company Name',
        'Identification Code or ID',
        'Contact Person #1',
        'Tel',
        'Contact Person #2',
        'Tel #2',
        'Contact Person #3',
        'Tel #3',
        'Caller Name',
        'Caller Number',
        'Receiver Number',
        'Call Count',
        'Call Date',
        'Call Duration',
        'Call Status (Answered, No Answer, Busy, Failed)',
      ];

      const exportData = excelData.map(row => [
        row.companyName || row.company_name || '',
        row.identificationCode || row.identification_code || '',
        row.contactPerson1 || row.contact_person1 || '',
        row.tel1 || row.contactTel1 || '',
        row.contactPerson2 || row.contact_person2 || '',
        row.tel2 || row.contactTel2 || '',
        row.contactPerson3 || row.contact_person3 || '',
        row.tel3 || row.contactTel3 || '',
        row.callerName || row.caller_name || '',
        row.callerNumber || row.caller_number || '',
        row.receiverNumber || row.receiver_number || '',
        row.callCount || row.call_count || 0,
        row.callDate || row.call_date || '',
        row.callDuration || row.call_duration || '',
        row.callStatus || row.call_status || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Calls');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;

      const fileName = `exported_data_${dateStr}.xlsx`;
      console.log('Writing file:', fileName);
      XLSX.writeFile(workbook, fileName);
      console.log('File downloaded successfully');
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Error downloading file: ' + err.message);
    }
  };

  return (
    <div className="upload-excel">
      <div style={{ display: 'flex', gap: '10px' }}>
        <label>
          <button
            className={styles.button}
            onClick={() => document.getElementById('excel-upload').click()}
            disabled={isLoading}
          >
            <svg
              aria-hidden="true"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeWidth="2"
                stroke="#ffffff"
                d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H11M13.5 3L19 8.625M13.5 3V7.625C13.5 8.17728 13.9477 8.625 14.5 8.625H19M19 8.625V11.8125"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2"
                stroke="#ffffff"
                d="M17 15V18M17 21V18M17 18H14M17 18H20"
              />
            </svg>
            Upload Excel
          </button>
          <input
            id="excel-upload"
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
        <button
          className={styles.DownloadButton}
          onClick={handleDownloadExcel}
          disabled={isLoading || !excelData?.length}
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
      {error && <div className="error" style={{ marginTop: 10, color: 'red' }}>{error}</div>}
      <FilterForm
        data={excelData}
        onFilterApply={onUploadSuccess}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onlyForm={true}
      />
    </div>
  );
};

export default UploadExcel;
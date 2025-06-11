import * as XLSX from 'xlsx';
import { useState } from 'react';
import styles from '../css/UploadButton.module.css';

const UploadExcel = ({ onUploadSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Define the expected column headers
  const expectedHeaders = [
    'Company Name', 'ID Code', 'Contact Person #1', 'Phone #1',
    'Contact Person #2', 'Phone #2', 'Contact Person #3', 'Phone #3',
    'Caller Name', 'Caller Number', 'Receiver Name', 'Receiver Number',
    'Call Count', 'Call Date', 'Call Duration', 'Call Status'
  ];

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Check if there's data
        if (!jsonData || jsonData.length < 2) {
          setError('Excel file is empty or has no data rows');
          setIsLoading(false);
          return;
        }

        // Get headers from first row
        const headers = jsonData[0].map(header => String(header).trim());
        console.log('Excel headers:', headers);
        
        // Process data rows
        const processedData = [];
        for (let i = 1; i < jsonData.length; i++) {
          if (jsonData[i].length === 0) continue; // Skip empty rows
          
          const row = jsonData[i];
          const dataRow = {
            id: `row-${i}`,
            companyName: row[headers.indexOf('Company Name')] || '',
            idCode: row[headers.indexOf('ID Code')] || '',
            contactPerson1: row[headers.indexOf('Contact Person #1')] || '',
            phone1: row[headers.indexOf('Phone #1')] || '',
            contactPerson2: row[headers.indexOf('Contact Person #2')] || '',
            phone2: row[headers.indexOf('Phone #2')] || '',
            contactPerson3: row[headers.indexOf('Contact Person #3')] || '',
            phone3: row[headers.indexOf('Phone #3')] || '',
            callerName: row[headers.indexOf('Caller Name')] || '',
            callerNumber: row[headers.indexOf('Caller Number')] || '',
            receiverName: row[headers.indexOf('Receiver Name')] || '',
            receiverNumber: row[headers.indexOf('Receiver Number')] || '',
            callCount: row[headers.indexOf('Call Count')] || 0,
            callDate: row[headers.indexOf('Call Date')] || '',
            callDuration: row[headers.indexOf('Call Duration')] || '',
            callStatus: row[headers.indexOf('Call Status')] || '',
          };
          processedData.push(dataRow);
        }
        
        console.log('Processed Excel data:', processedData);
        
        // Pass the processed data to parent component
        onUploadSuccess(processedData);
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Error processing Excel file: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="upload-excel">
      <div style={{ display: 'flex', gap: '10px' }}>
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
          {isLoading ? 'Uploading...' : 'Upload Excel'}
        </button>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
      
      {error && <div className="error" style={{ marginTop: 10, color: 'red' }}>{error}</div>}
    </div>
  );
};

export default UploadExcel;
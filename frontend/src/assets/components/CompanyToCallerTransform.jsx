import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import styles from '../css/UploadButton.module.css';
import defaultInstance from '../../api/defaultInstance';
import { useLanguage } from '../i18n/LanguageContext';

const CompanyToCallerTransform = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const { t } = useLanguage();

  // Georgian to English field mapping
  const fieldMapping = {
    'ტენდერის N': 'tender_number',
    'შემსყიდველი': 'companyName',
    'საკ. პირი #1': 'contactPerson1',
    'ტელ #1': 'tel1',
    'საკ. პირი #2': 'contactPerson2',
    'ტელ #2': 'tel2',
    'საკ. პირი #3': 'contactPerson3',
    'ტელ #3': 'tel3',
    'ელ-ფოსტა': 'email',
    'შემსრულებელი': 'executor',
    'ს/კ -ID': 'identificationCode',
    'ხელშ. ღირებ.': 'contractValue',
    'გორგიაში შესყ. ჯამურ. ღირ': 'totalValueGorgia',
    'გორგიაში ბოლო შესყ. თარ.': 'lastPurchaseDateGorgia',
    'დაკონტ. საორ. თარიღი': 'contractEndDate',
    'დაფუძ. თარიღი': 'foundationDate',
    'მენეჯერი': 'callerName',
    'მენეჯერის ნომერი': 'callerNumber',
    'სტატუსი': 'status'
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(10);
    setProcessingStep('Reading Georgian company Excel file...');

    try {
      // Read the Excel file
      const data = await readExcelFile(file);
      setProgress(30);
      
      // Transform data to caller format
      setProcessingStep('Transforming from Georgian to caller format...');
      const transformedData = transformCompanyToCaller(data);
      setProgress(50);
      
      // Enrich with PBX data
      setProcessingStep('Enriching with PBX call data...');
      const enrichedData = await enrichWithPbxData(transformedData);
      setProgress(80);
      
      // Generate and download the Excel file
      setProcessingStep('Generating caller dashboard Excel...');
      generateCallerExcel(enrichedData);
      setProgress(100);
      
      setSuccess('Successfully transformed and enhanced data!');
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Error: ' + err.message);
    } finally {
      setIsLoading(false);
      setProcessingStep('');
      setProgress(0);
    }
  };

  // Read the Excel file and parse data
  const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Ensure we have data
          if (!jsonData || jsonData.length < 2) {
            reject(new Error('Excel file is empty or contains no data rows'));
            return;
          }
          
          // Extract headers and data rows
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          
          console.log('Headers from file:', headers);
          console.log('First data row:', rows[0]);
          
          resolve({ headers, rows });
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Transform company data to caller format
  const transformCompanyToCaller = ({ headers, rows }) => {
    // Map the headers from Georgian to English fields
    const mappedHeaders = headers.map(header => fieldMapping[header] || header);
    console.log('Mapped headers:', mappedHeaders);
    
    // Transform rows to objects with mapped field names
    const transformedData = rows
      .filter(row => row.length > 0 && row.some(cell => cell && String(cell).trim() !== ''))
      .map(row => {
        const transformedRow = {
          companyName: '', 
          identificationCode: '',
          contactPerson1: '',
          tel1: '',
          contactPerson2: '',
          tel2: '',
          contactPerson3: '',
          tel3: '',
          callerName: '', // Manager name
          callerNumber: '', // Manager number
          receiverName: '', // Will be populated from PBX
          receiverNumber: '', // Will be populated from PBX
          callCount: 0,     // Will be populated from PBX
          callDuration: '', // Will be populated from PBX
          callStatus: ''    // Will be populated from PBX
        };
        
        // Map values from the row using the mapped headers
        mappedHeaders.forEach((mappedHeader, index) => {
          if (mappedHeader && row[index] !== undefined && row[index] !== null) {
            transformedRow[mappedHeader] = row[index];
          }
        });
        
        // Special mappings according to your example:
        // შემსყიდველი -> Company Name
        const buyerIndex = headers.findIndex(h => h === 'შემსყიდველი');
        if (buyerIndex !== -1 && row[buyerIndex]) {
          transformedRow.companyName = row[buyerIndex];
        }
        
        // ს/კ -ID -> ID Code 
        const idCodeIndex = headers.findIndex(h => h === 'ს/კ -ID');
        if (idCodeIndex !== -1 && row[idCodeIndex]) {
          transformedRow.identificationCode = row[idCodeIndex];
        }
        
        // მენეჯერი -> Caller Name
        const managerIndex = headers.findIndex(h => h === 'მენეჯერი');
        if (managerIndex !== -1 && row[managerIndex]) {
          transformedRow.callerName = row[managerIndex];
        }
        
        // მენეჯერის ნომერი -> Caller Number
        const managerNumberIndex = headers.findIndex(h => h === 'მენეჯერის ნომერი');
        if (managerNumberIndex !== -1 && row[managerNumberIndex]) {
          transformedRow.callerNumber = row[managerNumberIndex];
        }
        
        return transformedRow;
      });
    
    console.log('Transformed data (first 2 rows):', transformedData.slice(0, 2));
    return transformedData;
  };

  // Enrich data with PBX info
  const enrichWithPbxData = async (transformedData) => {
    // Extract all caller numbers for PBX lookup
    const callerNumbers = transformedData
      .map(row => row.callerNumber)
      .filter(number => number && number.trim() !== '');
    
    if (callerNumbers.length === 0) {
      return transformedData; // No numbers to look up
    }
    
    try {
      console.log('Fetching PBX data for caller numbers:', callerNumbers);
      const response = await defaultInstance.post('/caller-data', { callerNumbers });
      const pbxData = response.data.data;
      
      // Enrich each row with PBX data
      return transformedData.map(row => {
        if (row.callerNumber && pbxData[row.callerNumber]) {
          const callData = pbxData[row.callerNumber];
          return {
            ...row,
            receiverName: callData.receiverName || '',
            receiverNumber: callData.receiverNumber || '',
            callCount: callData.callCount || 0,
            callDuration: callData.formattedDuration || '',
            callStatus: callData.callStatus || ''
          };
        }
        return row;
      });
    } catch (error) {
      console.error('Error fetching PBX data:', error);
      // Return original data if PBX fetch fails
      return transformedData;
    }
  };

  // Generate and download caller Excel file
  const generateCallerExcel = (data) => {
    const headers = [
      'Company Name', 
      'ID Code',
      'Contact Person #1',
      'Phone #1',
      'Contact Person #2',
      'Phone #2',
      'Contact Person #3',
      'Phone #3',
      'Caller Name',
      'Caller Number',
      'Receiver Name',
      'Receiver Number',
      'Call Count',
      'Call Date',
      'Call Duration',
      'Call Status'
    ];
    
    // Format data for Excel
    const excelData = data.map(row => [
      row.companyName || '',
      row.identificationCode || '',
      row.contactPerson1 || '',
      row.tel1 || '',
      row.contactPerson2 || '',
      row.tel2 || '',
      row.contactPerson3 || '',
      row.tel3 || '',
      row.callerName || '',
      row.callerNumber || '',
      row.receiverName || '',
      row.receiverNumber || '',
      row.callCount || 0,
      '', // Call date - not provided by current data structure
      row.callDuration || '',
      row.callStatus || ''
    ]);
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
    
    // Set column widths
    const colWidths = headers.map((h, colIndex) => {
      const maxLength = Math.max(
        h.length,
        ...excelData.map(row => String(row[colIndex] || '').length)
      );
      return { wch: maxLength + 2 };
    });
    worksheet['!cols'] = colWidths;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Caller Dashboard');
    
    // Generate filename with date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const fileName = `caller_dashboard_${dateStr}.xlsx`;
    
    // Download file
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="company-to-caller-transform" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h3>Georgian Company to Caller Dashboard Transformer</h3>
      <p>Upload a Georgian company Excel file to convert it to caller dashboard format with PBX data.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          className={styles.button}
          onClick={() => document.getElementById('company-excel-upload').click()}
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
          {isLoading ? 'Processing...' : 'Upload Georgian Company Excel'}
        </button>
        <input
          id="company-excel-upload"
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
      
      {isLoading && (
        <div style={{ marginTop: '20px' }}>
          <div>{processingStep}</div>
          <div style={{ 
            height: '8px', 
            backgroundColor: '#e9ecef', 
            borderRadius: '4px', 
            marginTop: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#007bff',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>
      )}
      
      {error && <div style={{ marginTop: '20px', color: 'red' }}>{error}</div>}
      {success && <div style={{ marginTop: '20px', color: 'green' }}>{success}</div>}
      
      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Field Mappings:</h4>
        <ul>
          <li>შემსყიდველი → Company Name</li>
          <li>ს/კ -ID → ID Code</li>
          <li>საკ. პირი #1 → Contact Person #1</li>
          <li>ტელ #1 → Phone #1</li>
          <li>საკ. პირი #2 → Contact Person #2</li>
          <li>ტელ #2 → Phone #2</li>
          <li>საკ. პირი #3 → Contact Person #3</li>
          <li>ტელ #3 → Phone #3</li>
          <li>მენეჯერი → Caller Name</li>
          <li>მენეჯერის ნომერი → Caller Number</li>
        </ul>
        <p>The following fields are retrieved from PBX:</p>
        <ul>
          <li>Receiver Name</li>
          <li>Receiver Number</li>
          <li>Call Count</li>
          <li>Call Duration</li>
          <li>Call Status</li>
        </ul>
      </div>
    </div>
  );
};

export default CompanyToCallerTransform;

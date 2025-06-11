import * as XLSX from 'xlsx';
import { useState } from 'react';
import styles from '../css/UploadButton.module.css';
import FilterForm from './FilterForm';
import defaultInstance from '../../api/defaultInstance';

const UploadExcel = ({ onUploadSuccess, excelData }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const isAdmin = localStorage.getItem('role') === 'super_admin' || localStorage.getItem('role') === 'admin';

  // Georgian to English column mapping
  const columnMapping = {
    'ტენდერის N': 'tenderNumber',
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

  // Converts Excel time decimal to HH:MM:SS string
  const excelTimeToHMS = (excelTime) => {
    if (typeof excelTime === 'number' && !isNaN(excelTime)) {
      const totalSeconds = Math.round(excelTime * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return [hours, minutes, seconds]
        .map(v => String(v).padStart(2, '0'))
        .join(':');
    }
    return '';
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setProcessingStep('Reading Excel file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        setProcessingStep('Processing excel data...');

        console.log('Raw Excel data:', jsonData);

        // Map Georgian column names to expected format
        const formattedData = jsonData.map((row, index) => {
          const mappedRow = {};
          
          // Process each column from the input Excel file
          Object.keys(row).forEach(key => {
            const mappedKey = columnMapping[key];
            if (mappedKey) {
              mappedRow[mappedKey] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
            }
          });

          // Set default values if fields are missing
          return {
            id: index + 1,
            companyName: mappedRow.companyName || 'Unknown',
            identificationCode: mappedRow.identificationCode || '',
            contactPerson1: mappedRow.contactPerson1 || '',
            tel1: mappedRow.tel1 || '',
            contactPerson2: mappedRow.contactPerson2 || '',
            tel2: mappedRow.tel2 || '',
            contactPerson3: mappedRow.contactPerson3 || '',
            tel3: mappedRow.tel3 || '',
            callerName: mappedRow.callerName || '',
            callerNumber: mappedRow.callerNumber || '',
            receiverName: '',  // Initialize empty, will be filled from PBX
            receiverNumber: '', // Initialize empty, will be filled from PBX
            email: mappedRow.email || '',
            executor: mappedRow.executor || '',
            contractValue: mappedRow.contractValue || '',
            totalValueGorgia: mappedRow.totalValueGorgia || '',
            lastPurchaseDateGorgia: mappedRow.lastPurchaseDateGorgia || '',
            contractEndDate: mappedRow.contractEndDate || '',
            foundationDate: mappedRow.foundationDate || '',
            status: mappedRow.status || '',
            tenderNumber: mappedRow.tenderNumber || '',
            callCount: 0,
            callDate: '',
            callDuration: '',
            callStatus: ''
          };
        });

        console.log('Formatted data after mapping:', formattedData);
        
        // Extract all caller numbers for CDR lookup
        setProcessingStep('Extracting caller numbers for PBX lookup...');
        const callerNumbers = formattedData
          .map(row => row.callerNumber)
          .filter(number => number && number.trim() !== '');
          
        // Also try phone numbers as fallbacks
        let allNumbers = [...callerNumbers];
        formattedData.forEach(row => {
          if (row.tel1 && row.tel1.trim() !== '') allNumbers.push(row.tel1);
          if (row.tel2 && row.tel2.trim() !== '') allNumbers.push(row.tel2);
          if (row.tel3 && row.tel3.trim() !== '') allNumbers.push(row.tel3);
        });
        
        // Remove duplicates
        const uniqueCallerNumbers = [...new Set(allNumbers)];
        console.log('Caller numbers for PBX lookup:', uniqueCallerNumbers);
        
        // If we have caller numbers, enrich the data with CDR information
        let enrichedData = [...formattedData];
        if (uniqueCallerNumbers.length > 0) {
          try {
            setProcessingStep(`Fetching PBX call data for ${uniqueCallerNumbers.length} numbers...`);
            
            const cdrResponse = await defaultInstance.post('/caller-data', { callerNumbers: uniqueCallerNumbers });
            const cdrData = cdrResponse.data.data;
            console.log('Received PBX data:', cdrData);
            
            setProcessingStep('Enriching data with PBX information...');
            // Merge CDR data with the original data
            enrichedData = formattedData.map(row => {
              let enriched = { ...row };
              
              // Try with caller number first
              if (row.callerNumber && cdrData[row.callerNumber]) {
                const pbxData = cdrData[row.callerNumber];
                enriched.receiverName = pbxData.receiverName || '';
                enriched.receiverNumber = pbxData.receiverNumber || '';
                enriched.callCount = pbxData.callCount || 0;
                enriched.callDate = formatDate(pbxData.lastCallDate) || '';
                enriched.callDuration = pbxData.formattedDuration || '';
                enriched.callStatus = pbxData.callStatus || '';
                return enriched;
              }
              
              // Try with tel1, tel2, tel3 as fallbacks
              for (const telField of ['tel1', 'tel2', 'tel3']) {
                const telNumber = row[telField];
                if (telNumber && cdrData[telNumber]) {
                  const pbxData = cdrData[telNumber];
                  enriched.receiverName = pbxData.receiverName || '';
                  enriched.receiverNumber = pbxData.receiverNumber || '';
                  enriched.callCount = pbxData.callCount || 0;
                  enriched.callDate = formatDate(pbxData.lastCallDate) || '';
                  enriched.callDuration = pbxData.formattedDuration || '';
                  enriched.callStatus = pbxData.callStatus || '';
                  return enriched;
                }
              }
              
              return enriched;
            });
            
            console.log('Data enriched with PBX information:', enrichedData);
          } catch (err) {
            console.error('Error fetching CDR data:', err);
            setError('Warning: Could not retrieve call history data from PBX. Using data from file only.');
          }
        } else {
          console.log('No caller numbers found in the data for CDR lookup');
        }

        // Save the enriched data to database
        try {
          setProcessingStep('Saving enriched data to database...');
          
          // Format data to match the server's expected format
          const formattedForDb = enrichedData.map(row => ({
            company_name: row.companyName || '',
            identification_code: row.identificationCode || '',
            contact_person1: row.contactPerson1 || '',
            tel1: row.tel1 || '',
            contact_person2: row.contactPerson2 || '',
            tel2: row.tel2 || '',
            contact_person3: row.contactPerson3 || '',
            tel3: row.tel3 || '',
            caller_name: row.callerName || '',
            caller_number: row.callerNumber || '',
            receiver_name: row.receiverName || '',
            receiver_number: row.receiverNumber || '',
            call_count: row.callCount || 0,
            call_date: row.callDate || '',
            call_duration: row.callDuration || '',
            call_status: row.callStatus || '',
          }));
          
          await uploadToServer(formattedForDb);
          console.log('Data successfully saved to database');
        } catch (err) {
          console.error('Error saving data to database:', err);
          setError('Warning: Data loaded but could not be saved to database. You can still download the enriched file.');
        } finally {
          // Pass the enriched data to parent component regardless of db save
          onUploadSuccess(enrichedData);
          setProcessingStep('');
        }
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Error processing Excel file: ' + err.message);
        setProcessingStep('');
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Format date to a readable format
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().replace('T', ' ').split('.')[0];
    } catch (e) {
      return dateString;
    }
  };

  const formatExcelDate = (excelDate) => {
    if (!excelDate) return '';
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
      return date.toISOString().replace('T', ' ').split('.')[0];
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;
    if (typeof excelDate === 'string' && dateRegex.test(excelDate)) {
      return excelDate.includes(' ') ? excelDate : `${excelDate} 00:00:00`;
    }
    return '';
  };

  const uploadToServer = async (data) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('Sending data to server:', { count: data.length, sample: data[0] });
      
      // Detailed console logging to debug the request
      const requestUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/import-company`;
      console.log('Requesting URL:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });
      
      // Provide more detailed error information
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorDetail = '';
        
        if (contentType && contentType.includes('application/json')) {
          const errorJson = await response.json();
          errorDetail = JSON.stringify(errorJson);
          console.error('Server error response:', errorJson);
        } else {
          errorDetail = await response.text();
          console.error('Server error text:', errorDetail);
        }
        
        throw new Error(`Server responded with ${response.status}: ${errorDetail}`);
      }
      
      const responseData = await response.json();
      console.log('Server response:', responseData);
      return responseData;
    } catch (err) {
      console.error('Upload error:', err);
      
      // Include detailed error information
      let errorMessage = 'Error uploading data to server';
      
      if (err.response) {
        errorMessage += `: ${err.response.status} - ${JSON.stringify(err.response.data)}`;
        console.error('Error details:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      } else if (err.request) {
        errorMessage += ': No response from server';
        console.error('No response:', err.request);
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      throw new Error(errorMessage);
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
        'ID Code',
        'Contact Person #1',
        'Phone #1',
        'Contact Person #2',
        'Phone #2',
        'Contact Person #3',
        'Phone #3',
        'Caller Name',
        'Caller Number',
        'Receiver Name', // Ensuring Receiver Name is included in output
        'Receiver Number', // Ensuring Receiver Number is included in output
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
        row.receiverName || row.receiver_name || '', // Include Receiver Name
        row.receiverNumber || row.receiver_number || '', // Include Receiver Number
        row.callCount || row.call_count || 0,
        row.callDate || row.call_date || '',
        row.callDuration || row.call_duration || '',
        row.callStatus || row.call_status || '',
      ]);

      console.log('Export data prepared:', exportData.length, 'rows');
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);

      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
        );
        return { wch: maxLength + 2 };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Calls');

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;

      const fileName = `call_data_enriched_${dateStr}.xlsx`;
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
          {isAdmin && (
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
              {isLoading ? 'Processing...' : 'Upload Excel'}
            </button>
          )}
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
          Download Enhanced Excel
        </button>
        <FilterForm
          onlyButton={true}
          onToggleFilters={() => setShowFilters(!showFilters)}
          dashboardType="caller"
        />
      </div>
      
      {isLoading && processingStep && (
        <div className="processing-status" style={{ marginTop: 10, color: 'blue' }}>
          <div>{processingStep}</div>
          <div className="progress-bar" style={{ 
            height: '4px',
            width: '100%',
            backgroundColor: '#eee',
            marginTop: '5px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              height: '100%',
              width: '30%',
              backgroundColor: '#337ab7',
              animation: 'progressAnimation 1.5s infinite',
            }}></div>
          </div>
          <style jsx>{`
            @keyframes progressAnimation {
              0% { left: -30%; }
              100% { left: 100%; }
            }
          `}</style>
        </div>
      )}
      
      {error && <div className="error" style={{ marginTop: 10, color: 'red' }}>{error}</div>}
      
      <FilterForm
        data={excelData}
        onFilterApply={onUploadSuccess}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onlyForm={true}
        dashboardType="caller"
      />
    </div>
  );
};

export default UploadExcel;
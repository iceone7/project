import { useRef, useState } from 'react';
import styles from '../css/UploadButton.module.css';
import defaultInstance from '../../api/defaultInstance';

const UploadExcel = ({ onUploadSuccess }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState([]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/caller-excel-preview`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        let message = 'Upload failed';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorJson = await response.json();
            message = errorJson.error || JSON.stringify(errorJson);
          } else {
            message = await response.text();
          }
        } catch (err) {
          setError('Network error: ' + err.message);
        }
        setError(`Error (${response.status}): ${message}`);
        return;
      }

      const json = await response.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const normalizedData = json.data.map((item, index) => ({
          id: item.id || `preview-${index}`,
          companyName: item.company_name || item.companyName || '',
          identificationCode: item.identification_code || item.identificationCode || item.id_code || item.idCode || '',
          contactPerson1: item.contact_person1 || item.contactPerson1 || '',
          tel1: item.tel1 || item.phone1 || '',
          contactPerson2: item.contact_person2 || item.contactPerson2 || '',
          tel2: item.tel2 || item.phone2 || '',
          contactPerson3: item.contact_person3 || item.contactPerson3 || '',
          tel3: item.tel3 || item.phone3 || '',
          callerName: item.caller_name || item.callerName || '',
          callerNumber: item.caller_number || item.callerNumber || '',
          receiverName: item.receiver_name || item.receiverName || '',
          receiverNumber: item.receiver_number || item.receiverNumber || '',
          callCount: item.call_count || item.callCount || 0,
          callDate: item.call_date || item.callDate || '',
          callDuration: item.call_duration || item.callDuration || '',
          callStatus: item.call_status || item.callStatus || '',
        }));
        
        setPreviewData(normalizedData);
        
        // Save the data to the database
        await saveToDatabase(normalizedData);
        
        // Debug log the first row to verify data
        console.log('Normalized caller data first row:', normalizedData[0]);
        
        if (onUploadSuccess) onUploadSuccess(normalizedData); // Pass the normalized data
      } else if (json.data && Array.isArray(json.data) && json.data.length === 0) {
        setError('Excel parsed but no rows found.');
      } else {
        setError('No valid data returned from server');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // New function to save data to the database
  const saveToDatabase = async (data) => {
    try {
      const response = await defaultInstance.post('/caller-excel-uploads', { data });
      
      if (response.status === 200) {
        console.log('Data saved to database successfully');
      } else {
        throw new Error('Failed to save data to database');
      }
    } catch (err) {
      console.error('Error saving data to database:', err);
      setError('Failed to save to database: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div style={{ display: 'block', width: 'auto' }}>
      <button
        className={styles.button}
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        type="button"
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
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {error && <div style={{ color: 'red', marginTop: 5 }}>{error}</div>}
    </div>
  );
};

export default UploadExcel;
import { useRef, useState } from 'react';
import styles from '../css/UploadButton.module.css';

const isAdmin = localStorage.getItem('role') === 'super_admin' || localStorage.getItem('role') === 'admin';

const UploadCompanyExcel = ({ onPreviewSuccess }) => {
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company-excel-preview`, {
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
        // Нормализуем данные
        const normalizedData = json.data.map((item, index) => ({
          id: item.id || `preview-${index}`,
          tenderNumber: item.tender_number || item.tenderNumber || '',
          buyer: item.buyer || '',
          contact1: item.contact1 || item.contact_1 || '',
          phone1: item.phone1 || item.phone_1 || '',
          contact2: item.contact2 || item.contact_2 || '',
          phone2: item.phone2 || item.phone_2 || '',
          email: item.email || '',
          executor: item.executor || '',
          idCode: item.id_code || item.idCode || '',
          contractValue: item.contract_value || item.contractValue || '',
          totalValueGorgia: item.total_value_gorgia || item.totalValueGorgia || '',
          lastPurchaseDateGorgia: item.last_purchase_date_gorgia || item.lastPurchaseDateGorgia || '',
          contractEndDate: item.contract_end_date || item.contractEndDate || '',
          foundationDate: item.foundation_date || item.foundationDate || '',
          manager: item.manager || '',
          status: item.status || '',
        }));
        console.log('Normalized data:', normalizedData); // Для отладки
        if (onPreviewSuccess) await onPreviewSuccess(normalizedData); // Передаем нормализованные данные
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

  return (
    <div style={{ display: 'block', width: '100%' }}>
      {isAdmin && (
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
      )}
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

export default UploadCompanyExcel;
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import defaultInstance from '../../api/defaultInstance';

const CallerExcelUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setError('');
      
      try {
        setIsUploading(true);
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const response = await defaultInstance.post('/caller-excel-preview', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data && response.data.status === 'success') {
          setPreviewData(response.data.data);
        } else {
          setError('Failed to preview file. Please check the file format and try again.');
        }
      } catch (error) {
        console.error('Upload error:', error);
        setError(`Error uploading file: ${error.response?.data?.error || error.message}`);
      } finally {
        setIsUploading(false);
      }
    }
  });

  const handleSave = async () => {
    if (!previewData || previewData.length === 0) {
      setError('No data to save. Please upload a valid Excel file first.');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Сохраняем данные
      const saveResponse = await defaultInstance.post('/caller-excel-uploads', { data: previewData });
      
      if (saveResponse.data && saveResponse.data.status === 'success') {
        console.log('Excel data saved successfully, now processing CDR data...');
        
        // Форматируем даты в формат YYYY-MM-DD
        const formattedStartDate = startDate ? new Date(startDate).toISOString().split('T')[0] : '';
        const formattedEndDate = endDate ? new Date(endDate).toISOString().split('T')[0] : '';
        
        // Обрабатываем CDR данные
        const processResponse = await defaultInstance.post('/process-cdr-data', { 
          data: previewData,
          start_date: formattedStartDate,
          end_date: formattedEndDate
        });
        
        if (processResponse.data && processResponse.data.status === 'success') {
          console.log('CDR data processed successfully');
          
          if (typeof onUploadSuccess === 'function') {
            onUploadSuccess(processResponse.data.data);
          }
          
          setFile(null);
          setPreviewData([]);
        } else {
          setError('Failed to process CDR data.');
        }
      } else {
        setError('Failed to save data.');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setError(`Error processing data: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5>Upload Caller Excel Data</h5>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <div className="mb-3">
          <div {...getRootProps({ className: 'dropzone border rounded p-3 text-center' })}>
            <input {...getInputProps()} />
            {file ? (
              <p>Selected file: {file.name}</p>
            ) : (
              <p>Drag & drop an Excel file here, or click to select one</p>
            )}
          </div>
        </div>
        
        <div className="row mb-3">
          <div className="col-md-5">
            <label htmlFor="startDate" className="form-label">Start Date:</label>
            <input 
              type="date" 
              id="startDate" 
              className="form-control" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-5">
            <label htmlFor="endDate" className="form-label">End Date:</label>
            <input 
              type="date" 
              id="endDate" 
              className="form-control" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button 
              className="btn btn-primary w-100" 
              onClick={handleSave} 
              disabled={!previewData.length || isUploading || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Process & Save'}
            </button>
          </div>
        </div>
        
        {previewData.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>ID Code</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Caller</th>
                  <th>Caller Number</th>
                  <th>Receiver Name</th>
                  <th>Receiver Number</th>
                  <th>Call Count</th>
                  <th>Call Date</th>
                  <th>Call Duration</th>
                  <th>Call Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((item, index) => (
                  <tr key={index}>
                    <td>{item.company_name || ''}</td>
                    <td>{item.identification_code || ''}</td>
                    <td>{item.contact_person1 || ''}</td>
                    <td>{item.tel1 || ''}</td>
                    <td>{item.caller_name || ''}</td>
                    <td>{item.caller_number || ''}</td>
                    <td>{item.receiver_name || ''}</td>
                    <td>{item.receiver_number || ''}</td>
                    <td>{item.call_count || '0'}</td>
                    <td>{item.call_date || ''}</td>
                    <td>{item.call_duration || ''}</td>
                    <td>{item.call_status || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <p className="text-muted">Showing 5 of {previewData.length} records</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallerExcelUploader;
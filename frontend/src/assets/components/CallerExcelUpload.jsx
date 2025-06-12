// import { useState } from 'react';
// import * as XLSX from 'xlsx';
// import defaultInstance from '../../api/defaultInstance';
// import { useLanguage } from '../i18n/LanguageContext';

// const CallerExcelUpload = ({ onDataProcessed, setProcessingStatus }) => {
//   const [file, setFile] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const { t } = useLanguage();

//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     setFile(selectedFile);
//   };

//   const processExcelData = async () => {
//     if (!file) {
//       alert('Please select a file first');
//       return;
//     }

//     try {
//       setUploading(true);
//       setProcessingStatus(true);
      
//       // Read the Excel file
//       const reader = new FileReader();
      
//       reader.onload = async (e) => {
//         try {
//           const data = new Uint8Array(e.target.result);
//           const workbook = XLSX.read(data, { type: 'array' });
//           const sheetName = workbook.SheetNames[0];
//           const worksheet = workbook.Sheets[sheetName];
//           const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
//           // Extract headers and data
//           const headers = jsonData[0];
//           const rows = jsonData.slice(1);
          
//           // Map headers to expected format
//           const headerMap = {
//             'Company Name': 'companyName',
//             'ID Code': 'identificationCode',
//             'Contact Person #1': 'contactPerson1',
//             'Phone #1': 'phone1',
//             'Contact Person #2': 'contactPerson2',
//             'Phone #2': 'phone2',
//             'Contact Person #3': 'contactPerson3',
//             'Phone #3': 'phone3',
//             'Caller Name': 'callerName',
//             'Caller Number': 'callerNumber',
//             'Receiver Name': 'receiverName',
//             'Receiver Number': 'receiverNumber',
//             'Call Count': 'callCount',
//             'Call Date': 'callDate',
//             'Call Duration': 'callDuration',
//             'Call Status': 'callStatus'
//           };
          
//           // Convert headers to expected format
//           const mappedHeaders = headers.map(header => headerMap[header] || header);
          
//           // Convert rows to objects with mapped headers
//           const formattedData = rows.map(row => {
//             const rowData = {};
//             mappedHeaders.forEach((header, index) => {
//               rowData[header] = row[index] !== undefined ? row[index] : '';
//             });
//             return rowData;
//           });
          
//           // Filter out rows without callerNumber
//           const validData = formattedData.filter(item => item.callerNumber);
          
//           if (validData.length === 0) {
//             alert('No valid data with caller numbers found in the file');
//             setUploading(false);
//             setProcessingStatus(false);
//             return;
//           }
          
//           console.log('Sending data to process:', validData);
          
//           // Send data to backend for processing
//           const response = await defaultInstance.post('/cdr/process-excel', {
//             excelData: validData
//           });
          
//           console.log('Processed data:', response.data);
          
//           if (response.data.success) {
//             onDataProcessed(response.data.data);
//           } else {
//             alert('Error processing data: ' + response.data.error);
//           }
//         } catch (error) {
//           console.error('Error processing Excel file:', error);
//           alert('Failed to process Excel file: ' + (error?.message || 'Unknown error'));
//         } finally {
//           setUploading(false);
//           setProcessingStatus(false);
//         }
//       };
      
//       reader.readAsArrayBuffer(file);
      
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       alert('Failed to upload file: ' + (error?.message || 'Unknown error'));
//       setUploading(false);
//       setProcessingStatus(false);
//     }
//   };

//   return (
//     <div className="card mb-4">
//       <div className="card-header">
//         <h5>{t('uploadExcelData')}</h5>
//       </div>
//       <div className="card-body">
//         <div className="mb-3">
//           <label htmlFor="excelFile" className="form-label">
//             {t('selectExcelFile')}
//           </label>
//           <input
//             type="file"
//             className="form-control"
//             id="excelFile"
//             accept=".xlsx,.xls"
//             onChange={handleFileChange}
//             disabled={uploading}
//           />
//           <div className="form-text">
//             {t('excelFormatNote')}
//           </div>
//         </div>
//         <button
//           className="btn btn-primary"
//           onClick={processExcelData}
//           disabled={!file || uploading}
//         >
//           {uploading ? t('processing') : t('processData')}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default CallerExcelUpload;

import { useState, useEffect } from 'react';
import edit_delete from '../css/edit_detele.module.css';
import button_comments from '../css/button_comments.module.css';
import EditModal from './EditModal';
import defaultInstance from '../../api/defaultInstance';
import { useLanguage } from '../i18n/LanguageContext';

const isAdmin = localStorage.getItem('role') === 'super_admin' || localStorage.getItem('role') === 'admin';
const isDepartamentVip = localStorage.getItem('department_id') === '1';
const isDepartamentCraftsmen = localStorage.getItem('department_id') === '2';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit, handleCallerUploadSuccess }) => {
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [calls, setCalls] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCdrId, setCurrentCdrId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [lastExcelDataLength, setLastExcelDataLength] = useState(0);
  // const [startDate, setStartDate] = useState('');
  // const [endDate, setEndDate] = useState('');
  const { t } = useLanguage();

  const recordingsBaseUrl = import.meta.env.VITE_RECORDINGS_URL;

  // Fetch call history data for craftsmen section
  useEffect(() => {
    if (isDepartamentCraftsmen && activeDashboard === 'company') {
      defaultInstance.get(`/cdr`)
        .then(response => {
          console.log('API response for /cdr:', response.data);
          setCalls(response.data);
        })
        .catch(error => {
          console.error('Ошибка при загрузке данных:', error);
        });
    }
  }, [activeDashboard]);

  // Add useEffect to detect new data uploads and trigger refresh once
  useEffect(() => {
    if (activeDashboard === 'caller' && excelData && excelData.length > 0) {
      // Only trigger refresh when data actually changes (after upload)
      if (excelData.length !== lastExcelDataLength) {
        console.log('New data detected, refreshing CDR data...');
        setLastExcelDataLength(excelData.length);
        
        // Small delay to ensure the data is properly loaded
        setTimeout(() => {
          fetchLiveCdrData();
        }, 500);
      }
    }
  }, [excelData, activeDashboard]);

  // Function to format date for API requests (YYYY-MM-DD)
  const formatDateForApi = (dateString) => {
    if (!dateString) return '';
    
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  // Initialize date filters to last month by default
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(1); // First day of last month
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0]; // Today formatted as YYYY-MM-DD
  };
  
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  // Call this function when component mounts - forces initial load with date filters
  useEffect(() => {
    if (activeDashboard === 'caller') {
      fetchCallerData();
    }
  }, [activeDashboard]); // Don't add fetchCallerData as dependency to avoid infinite loop

  // Function to fetch caller data with date filters
  const fetchCallerData = async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters with correctly formatted date filters
      const params = {};
      if (startDate) params.start_date = formatDateForApi(startDate);
      if (endDate) params.end_date = formatDateForApi(endDate);
      
      console.log('Fetching caller data with filters:', params);
      
      const response = await defaultInstance.get('/caller-excel-data', { params });
      
      if (response.data && response.data.status === 'success') {
        console.log('Received filtered data:', response.data.data.length, 'records');
        // Update the data through the parent component
        if (typeof handleCallerUploadSuccess === 'function') {
          handleCallerUploadSuccess(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching filtered caller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle date filter changes
  const handleDateFilterChange = () => {
    console.log('Applying date filters:', { startDate, endDate });
    if (activeDashboard === 'caller') {
      fetchCallerData();
    }
  };

  // Function to fetch live CDR data and update main table
  const fetchLiveCdrData = async () => {
    if (!excelData || excelData.length === 0) return;
    
    try {
      setIsLoading(true);
      // Include date filters in params with proper formatting
      const params = lastUpdateTime ? { since: lastUpdateTime } : {};
      if (startDate) params.start_date = formatDateForApi(startDate);
      if (endDate) params.end_date = formatDateForApi(endDate);
      
      console.log('Fetching live CDR data at:', new Date().toLocaleTimeString(), 'with filters:', params);
      
      const response = await defaultInstance.get('/live-cdr', { params });
      
      if (response.data && response.data.success) {
        // Update the timestamp for next poll
        setLastUpdateTime(response.data.timestamp);
        
        // Process the CDR data to update the Excel data
        const updatedData = processCdrDataWithExcel(excelData, response.data.data);
        
        // Send the updated data back to the parent component
        if (typeof handleCallerUploadSuccess === 'function') {
          handleCallerUploadSuccess(updatedData);
        }
      }
    } catch (error) {
      console.error('Error fetching live CDR data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Process CDR data with Excel data
  const processCdrDataWithExcel = (excelData, cdrData) => {
    // Create a map of all phone numbers in the Excel data
    const phoneMap = {};
    const result = [...excelData];
    
    // First pass: index all phone numbers in the Excel data
    excelData.forEach((row, index) => {
      // Collect all phone numbers in this row
      const phones = [
        normalizePhoneForMatching(row.tel1 || row.phone1),
        normalizePhoneForMatching(row.tel2 || row.phone2),
        normalizePhoneForMatching(row.tel3 || row.phone3),
        normalizePhoneForMatching(row.caller_number || row.callerNumber),
        normalizePhoneForMatching(row.receiver_number || row.receiverNumber)
      ].filter(Boolean);
      
      // Map each phone to this row index
      phones.forEach(phone => {
        if (!phoneMap[phone]) phoneMap[phone] = [];
        phoneMap[phone].push(index);
      });
    });
    
    // Create a map of caller-receiver pairs from CDR data
    const pairMap = {};
    
    // Process CDR data
    cdrData.forEach(cdr => {
      const callerNumber = normalizePhoneForMatching(cdr.callerNumber);
      const receiverNumber = normalizePhoneForMatching(cdr.receiverNumber);
      const pairKey = `${callerNumber}_${receiverNumber}`;
      
      // Initialize or update the pair data
      if (!pairMap[pairKey]) {
        pairMap[pairKey] = {
          count: 1,
          lastCall: cdr,
          calls: [cdr]
        };
      } else {
        pairMap[pairKey].count++;
        pairMap[pairKey].calls.push(cdr);
        
        // Update the last call if this one is newer
        if (new Date(cdr.callDate) > new Date(pairMap[pairKey].lastCall.callDate)) {
          pairMap[pairKey].lastCall = cdr;
        }
      }
    });
    
    // Second pass: update rows with matched CDR data
    Object.keys(pairMap).forEach(pairKey => {
      const [callerNumber, receiverNumber] = pairKey.split('_');
      const pairData = pairMap[pairKey];
      
      // Find rows that contain either the caller or receiver number
      const matchingRowIndices = new Set([
        ...(phoneMap[callerNumber] || []),
        ...(phoneMap[receiverNumber] || [])
      ]);
      
      // Update each matching row
      matchingRowIndices.forEach(index => {
        const row = result[index];
        const rowCallerNumber = normalizePhoneForMatching(row.caller_number || row.callerNumber);
        const rowReceiverNumber = normalizePhoneForMatching(row.receiver_number || row.receiverNumber);
        
        // Check if this row's caller/receiver match our pair
        if (rowCallerNumber === callerNumber && 
           (rowReceiverNumber === receiverNumber || !rowReceiverNumber)) {
          // This is an exact match or we're filling in missing receiver info
          result[index] = {
            ...row,
            receiver_number: pairData.lastCall.receiverNumber,
            receiver_name: pairData.lastCall.receiverName || row.receiver_name || '',
            call_count: pairData.count,
            call_date: pairData.lastCall.callDate,
            call_duration: pairData.lastCall.formattedDuration,
            call_status: pairData.lastCall.callStatus,
            hasRecentCalls: true
          };
        } 
        else if (rowReceiverNumber === receiverNumber && rowCallerNumber === callerNumber) {
          // Both match - update with latest data
          result[index] = {
            ...row,
            call_count: pairData.count,
            call_date: pairData.lastCall.callDate,
            call_duration: pairData.lastCall.formattedDuration,
            call_status: pairData.lastCall.callStatus,
            hasRecentCalls: true
          };
        }
      });
    });
    
    return result;
  };
  
  // Helper function to normalize phone numbers for matching
  const normalizePhoneForMatching = (phoneNumber) => {
    if (!phoneNumber) return '';
    // Remove all non-digit characters
    return phoneNumber.replace(/\D/g, '');
  };

  // Function to get recording path
  const getPath = (recordingfile) => {
    if (!recordingfile) return '';
    const parts = recordingfile.split('-');
    if (parts.length < 5) return recordingfile;
    const dateStr = parts[3];
    if (!/^\d{8}$/.test(dateStr)) return recordingfile;
    const yyyy = dateStr.substring(0, 4);
    const mm = dateStr.substring(4, 6);
    const dd = dateStr.substring(6, 8);
    return `${yyyy}/${mm}/${dd}/${recordingfile}`;
  };

  // Functions for editing
  const startEdit = (row) => {
    setEditRowId(row.id);
    setEditRowData({ ...row, id: row.id });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditRowId(null);
    setEditRowData({});
  };

  const saveEdit = async (updatedData) => {
    try {
      await handleEdit({ ...updatedData, id: editRowId });
      setShowEditModal(false);
      setEditRowId(null);
      setEditRowData({}); 
    } catch (err) {
      alert('Failed to update company: ' + (err?.response?.data?.error || err.message));
    }
  };

  // Fetch comments for a call
  const fetchComments = async (cdrId) => {
    setIsLoading(true);
    try {
      // Normalize the cdrId to ensure consistent handling
      const normalizedCdrId = String(cdrId).trim();
      console.log(`Fetching comments for cdr_id: "${normalizedCdrId}"`);
      
      // Store in localStorage for debugging
      localStorage.setItem('last_fetch_cdr_id', normalizedCdrId);
      
      const response = await defaultInstance.get(`/comments/${encodeURIComponent(normalizedCdrId)}`);
      console.log('Comments response:', response);
      
      if (!Array.isArray(response.data)) {
        console.error('Response is not an array:', response.data);
        setComments([]);
      } else {
        console.log(`Found ${response.data.length} comments`);
        setComments(response.data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setComments([]);
      alert('Failed to load comments: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  // Open comment modal for a call
  const openCommentModal = (cdrId) => {
    if (!cdrId) {
      console.error('No uniqueid provided');
      alert('Error: Record ID not found');
      return;
    }
    
    // Ensure consistent string formatting
    const normalizedCdrId = String(cdrId).trim();
    console.log(`Opening comment modal for cdr_id: "${normalizedCdrId}"`);
    
    // Store in both state and localStorage for persistence
    setCurrentCdrId(normalizedCdrId);
    localStorage.setItem('current_cdr_id', normalizedCdrId);
    
    setComments([]);
    fetchComments(normalizedCdrId);
    setShowCommentModal(true);
  };

  // Close comment modal
  const closeCommentModal = () => {
    setShowCommentModal(false);
    setCurrentCdrId(null);
    setComments([]);
    setNewComment('');
  };

  // Save new comment
  const saveComment = async () => {
    if (!newComment.trim()) {
      alert('Comment cannot be empty');
      return;
    }

    try {
      // Get the cdr_id from state or localStorage
      const savedCdrId = currentCdrId || localStorage.getItem('current_cdr_id');
      
      if (!savedCdrId) {
        console.error('No cdr_id available for saving comment');
        alert('Error: Could not determine record ID. Please try again.');
        return;
      }
      
      console.log(`Saving comment for cdr_id: "${savedCdrId}"`);
      
      const response = await defaultInstance.post('/comments', {
        cdr_id: savedCdrId,
        comment: newComment,
      });
      
      console.log('Comment saved successfully:', response.data);
      
      // Add the new comment to the beginning of the comments array
      setComments(prevComments => [response.data, ...prevComments]);
      setNewComment('');
      
      // Add a delay before refreshing comments to ensure database consistency
      setTimeout(() => {
        console.log('Refreshing comments after save');
        fetchComments(savedCdrId);
      }, 500);
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment: ' + (error?.response?.data?.error || error.message));
    }
  };

  const dataToDisplay = activeDashboard === 'caller' ? excelData : filteredCompanies;

  return (
    <>
      {isDepartamentVip && activeDashboard === 'company' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={activeDashboard} className="animated-section fade-in">
                <div className="card">
                  <h5 className="card-header">Recent Orders</h5>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table">
                        <thead className="bg-light">
                          <tr className="border-0">
                            <th>#</th>
                            <th>{t('tenderNumber')}</th>
                            <th>{t('buyer')}</th>
                            <th>{t('contactPerson1')}</th>
                            <th>{t('phone1')}</th>
                            <th>{t('contactPerson2')}</th>
                            <th>{t('phone2')}</th>
                            <th>{t('contactPerson3')}</th>
                            <th>{t('phone3')}</th>
                            <th>{t('email')}</th>
                            <th>{t('contractor')}</th>
                            <th>{t('idNumber')}</th>
                            <th>{t('contractValue')}</th>
                            <th>{t('gorgiaTotalValue')}</th>
                            <th>{t('gorgiaLastPurchaseDate')}</th>
                            <th>{t('communicationStartDate')}</th>
                            <th>{t('foundationDate')}</th>
                            <th>{t('manager')}</th>
                            <th>{t('managerNumber')}</th>
                            <th>{t('status')}</th>
                            <th>{t('editDelete')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataToDisplay.length > 0 ? (
                            dataToDisplay.map((company, index) => (
                              <tr key={company.id || index}>
                                <td>{index + 1}</td>
                                <td>{company.tenderNumber || company.tender_number || 'N/A'}</td>
                                <td>{company.buyer || 'N/A'}</td>
                                <td>{company.contact1 || company.contact_1 || 'N/A'}</td>
                                <td>{company.phone1 || company.phone_1 || 'N/A'}</td>
                                <td>{company.contact2 || company.contact_2 || 'N/A'}</td>
                                <td>{company.phone2 || company.phone_2 || 'N/A'}</td>
                                <td>{company.contact3 || company.contact_3 || 'N/A'}</td>
                                <td>{company.phone3 || company.phone_3 || 'N/A'}</td>
                                <td>{company.email || 'N/A'}</td>
                                <td>{company.executor || 'N/A'}</td>
                                <td>{company.idCode || company.id_code || 'N/A'}</td>
                                <td>{company.contractValue || company.contract_value || 'N/A'}</td>
                                <td>{company.totalValueGorgia || company.total_value_gorgia || 'N/A'}</td>
                                <td>{company.lastPurchaseDateGorgia || company.last_purchase_date_gorgia || 'N/A'}</td>
                                <td>{company.contractEndDate || company.contract_end_date || 'N/A'}</td>
                                <td>{company.foundationDate || company.foundation_date || 'N/A'}</td>
                                <td>{company.manager || 'N/A'}</td>
                                <td>{company.managerNumber || company.manager_number || 'N/A'}</td>
                                <td>{company.status || 'N/A'}</td>
                                <td className={edit_delete.editdelete}>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteCompany(company.id)}
                                      className={edit_delete.deletebutton}
                                    >
                                      <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                        <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                      </svg>
                                    </button>
                                  )}
                                  <button onClick={() => startEdit(company)} className={edit_delete.editbutton}>
                                    <svg className={edit_delete.editsvgIcon} viewBox="0 0 512 512">
                                      <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="20">No data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeDashboard === 'caller' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={activeDashboard} className="animated-section fade-in">
                <div className="card">
                  <h5 className="card-header">
                    Caller Dashboard
                    {isLoading && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
                    <button
                      className="btn btn-sm btn-outline-primary float-end ms-2"
                      onClick={fetchLiveCdrData}
                      disabled={isLoading}
                    >
                      Refresh Data
                    </button>
                    
                    {/* Date Filter Controls */}
                    <div className="float-end me-3 d-flex align-items-center">
                      <span className="me-2">Filter:</span>
                      <input 
                        type="date" 
                        className="form-control form-control-sm me-2" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date" 
                      />
                      <span className="me-2">to</span>
                      <input 
                        type="date" 
                        className="form-control form-control-sm me-2" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date" 
                      />
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleDateFilterChange}
                        disabled={isLoading}
                      >
                        Apply
                      </button>
                    </div>
                  </h5>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table">
                        <thead className="bg-light">
                          <tr className="border-0">
                            <th>#</th>
                            <th>{t('companyName')}</th>
                            <th>{t('identificationCode')}</th>
                            <th>{t('contactPerson1')}</th>
                            <th>{t('phone1')}</th>
                            <th>{t('contactPerson2')}</th>
                            <th>{t('phone2')}</th>
                            <th>{t('contactPerson3')}</th>
                            <th>{t('phone3')}</th>
                            <th>{t('callerName')}</th>
                            <th>{t('callerNumber')}</th>
                            <th>{t('receiverName')}</th>
                            <th>{t('receiverNumber')}</th>
                            <th>{t('callCount')}</th>
                            <th>{t('callDate')}</th>
                            <th>{t('callDuration')}</th>
                            <th>{t('callStatus')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelData.length > 0 ? (
                            excelData.map((call, index) => (
                              <tr key={call.id || index} className={call.hasRecentCalls ? "table-warning" : ""}>
                                <td>{index + 1}</td>
                                <td>{call.companyName || call.company_name || 'N/A'}</td>
                                <td>{call.identificationCode || call.id || 'N/A'}</td>
                                <td>{call.contactPerson1 || call.contact_person1 || 'N/A'}</td>
                                <td>{call.tel1 || call.contactTel1 || 'N/A'}</td>
                                <td>{call.contactPerson2 || call.contact_person2 || 'N/A'}</td>
                                <td>{call.tel2 || call.contactTel2 || 'N/A'}</td>
                                <td>{call.contactPerson3 || call.contact_person3 || 'N/A'}</td>
                                <td>{call.tel3 || call.contactTel3 || 'N/A'}</td>
                                <td>{call.callerName || call.caller_name || 'N/A'}</td>
                                <td>{call.callerNumber || call.caller_number || 'N/A'}</td>
                                <td>{call.receiverName || call.receiver_name || 'N/A'}</td>
                                <td>{call.receiverNumber || call.receiver_number || 'N/A'}</td>
                                <td>{call.callCount || call.call_count || '0'}</td>
                                <td>
                                  {call.callDate || call.call_date ? 
                                    new Date(call.callDate || call.call_date).toLocaleString() : 
                                    'N/A'}
                                </td>
                                <td>{call.callDuration || call.call_duration || 'N/A'}</td>
                                <td>{call.callStatus || call.call_status || 'N/A'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="17">No data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isDepartamentCraftsmen && activeDashboard === 'company' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={activeDashboard} className="animated-section fade-in">
                <div className="card">
                  <h5 className="card-header">Craftsmen Companies</h5>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table">
                        <thead className="bg-light">
                          <tr className="border-0">
                            <th>#</th>
                            <th>{t('aNumber')}</th>
                            <th>{t('bNumber')}</th>
                            <th>{t('date')}</th>
                            <th>{t('callTime')}</th>
                            <th>{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calls.length > 0 ? (
                            calls.map((call, index) => (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{call.src || 'N/A'}</td>
                                <td>{call.dst || 'N/A'}</td>
                                <td>{call.calldate || 'N/A'}</td>
                                <td>
                                  {call.duration
                                    ? `${Math.floor(Number(call.duration) / 3600)
                                        .toString()
                                        .padStart(2, '0')}:${Math.floor((Number(call.duration) % 3600) / 60)
                                        .toString()
                                        .padStart(2, '0')}:${(Number(call.duration) % 60)
                                        .toString()
                                        .padStart(2, '0')}`
                                    : 'N/A'}
                                </td>
                                <td className={button_comments.actions}>
                                  {call.recordingfile ? (
                                    <audio
                                      controls
                                      onError={(e) => console.error('Audio error for file:', call.recordingfile, e)}
                                    >
                                      <source
                                        src={`${recordingsBaseUrl}/${getPath(call.recordingfile)}`}
                                        type="audio/wav"
                                      />
                                      Ваш браузер не поддерживает аудио или файл недоступен.
                                    </audio>
                                  ) : (
                                    'Нет записи'
                                  )}
                                  <button
                                    onClick={() => openCommentModal(call.uniqueid)}
                                    className={button_comments.commentButton}
                                    style={{display: 'none'}}
                                  >
                                    <svg className={button_comments.commentSvgIcon} viewBox="0 0 512 512">
                                      <path d="M512 240c0 114.9-114.6 208-256 208-37.1 0-72.3-6.4-104.1-17.9-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9-2.5-6-.2-12.3 6.1-17.4 15.3-15.8 35.2-33.2 51.1-45.4C24.2 368.4 0 310.2 0 240 0 125.1 114.6 32 256 32s256 93.1 256 208z"/>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6">No data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal components */}
      {showCommentModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Комментарии для записи #{currentCdrId}</h5>
                <button type="button" className="btn-close" onClick={closeCommentModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <textarea
                    className="form-control"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Введите комментарий..."
                    rows="4"
                  ></textarea>
                </div>
                <button className="btn btn-primary" onClick={saveComment}>
                  Добавить комментарий
                </button>
                <hr />
                <div>
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div key={index} className="mb-2">
                        <p><strong>{comment.user?.name || 'Неизвестный пользователь'}</strong> ({new Date(comment.created_at).toLocaleString()}):</p>
                        <p>{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p>Комментариев пока нет</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeCommentModal}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <EditModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        onSave={saveEdit}
        editData={editRowData}
      />
    </>
  );
};

export default DataTable;
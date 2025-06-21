import { useState, useEffect, useRef } from 'react';
import button_comments from '../assets/css/button_comments.module.css';
import paginationStyles from '../assets/css/pagination.module.css';
import modalStyles from '../assets/css/recordings-modal.module.css';
import defaultInstance from '../api/defaultInstance';
import { useLanguage } from '../assets/i18n/LanguageContext';

const isSuperAdmin = localStorage.getItem('role') === 'super_admin';

// Function to format seconds into HH:MM:SS
const formatCallDuration = (seconds) => {
  if (!seconds) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const VIPCallerDashboard = ({ excelData, handleCallerUploadSuccess }) => {
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);
  const [animatePage, setAnimatePage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [lastExcelDataLength, setLastExcelDataLength] = useState(0);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [recordingComments, setRecordingComments] = useState({});
  const [activeCommentPanel, setActiveCommentPanel] = useState(null);
  const [newRecordingComments, setNewRecordingComments] = useState({});
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [recordingIdForComment, setRecordingIdForComment] = useState(null);
  const isInitialMount = useRef(true);
  const isProcessingCDR = useRef(false);
  const lastProcessedData = useRef([]);
  const paginationRef = useRef(null);
  const { t } = useLanguage();
  const recordingsBaseUrl = import.meta.env.VITE_RECORDINGS_URL;
  const itemsPerPage = 15;

  const formatDateForApi = (dateString) => {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
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

  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data?.slice(startIndex, endIndex) || [];
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagesCount && newPage !== currentPage) {
      setAnimatePage(true);
      setTimeout(() => {
        setCurrentPage(newPage);
        setTimeout(() => {
          setAnimatePage(false);
        }, 300);
      }, 200);
    }
  };

  const fetchCallerData = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (startDate) params.start_date = formatDateForApi(startDate);
      if (endDate) params.end_date = formatDateForApi(endDate);
      const response = await defaultInstance.get('/caller-excel-data', { params });
      if (response.data && response.data.status === 'success') {
        handleCallerUploadSuccess(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching filtered caller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeFromCallData = (callData) => {
    for (const row of callData || []) {
      const dateField = row.callDate || row.call_date || '';
      if (dateField && dateField.includes(' - ')) {
        return dateField;
      }
    }
    return null;
  };

  const fetchLiveCdrData = async () => {
    if (!excelData || excelData.length === 0) {
      isProcessingCDR.current = false;
      return;
    }
    try {
      setIsLoading(true);
      let dateRange = getDateRangeFromCallData(excelData);
      let parsedStartDate = startDate;
      let parsedEndDate = endDate;
      if (dateRange) {
        const [rangeStart, rangeEnd] = dateRange.split(' - ').map(d => d.trim());
        parsedStartDate = formatDateForApi(rangeStart);
        parsedEndDate = formatDateForApi(rangeEnd);
      }
      const params = {
        start_date: parsedStartDate,
        end_date: parsedEndDate
      };
      if (lastUpdateTime) params.since = lastUpdateTime;
      const response = await defaultInstance.get('/live-cdr', { params });
      if (response.data && response.data.success) {
        setLastUpdateTime(response.data.timestamp);
        const updatedData = processCdrDataWithExcel(excelData, response.data.data);
        handleCallerUploadSuccess(updatedData);
      }
    } catch (error) {
      console.error('Error fetching live CDR data:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isProcessingCDR.current = false;
      }, 1000);
    }
  };    const processCdrDataWithExcel = (excelData, cdrData) => {
    const result = [...excelData];
    const phoneToRowsMap = {};
    excelData.forEach((row, index) => {
      const callerNumber = normalizePhoneForMatching(row.caller_number || row.callerNumber);
      if (callerNumber) {
        if (!phoneToRowsMap[callerNumber]) phoneToRowsMap[callerNumber] = [];
        phoneToRowsMap[callerNumber].push(index);
      }
    });
    
    // Create map from caller number to all relevant calls
    const callerToCallsMap = {};
    cdrData.forEach(cdr => {
      const callerNumber = normalizePhoneForMatching(cdr.callerNumber);
      if (!callerToCallsMap[callerNumber]) {
        callerToCallsMap[callerNumber] = [];
      }
      callerToCallsMap[callerNumber].push(cdr);
    });
    
    // Process all calls for each caller to get metrics
    const callerToCDRMap = {};
    Object.entries(callerToCallsMap).forEach(([callerNumber, calls]) => {
      // Sort calls by date descending
      const sortedCalls = [...calls].sort(
        (a, b) => new Date(b.callDate) - new Date(a.callDate)
      );
      
      // Calculate metrics
      let totalAnsweredDuration = 0;
      let answeredCalls = 0;
      let noAnswerCalls = 0;
      let busyCalls = 0;
      
      calls.forEach(call => {
        if (call.callStatus === 'ANSWERED') {
          answeredCalls++;
          // Use billsec if available, otherwise use duration
          const callDuration = call.billsec ? parseInt(call.billsec) : 
                             (call.rawDuration ? parseInt(call.rawDuration) : 0);
          totalAnsweredDuration += callDuration;
        } else if (call.callStatus === 'NO ANSWER') {
          noAnswerCalls++;
        } else if (call.callStatus === 'BUSY') {
          busyCalls++;
        }
      });
      
      // Format the total duration
      const totalDurationFormatted = formatCallDuration(totalAnsweredDuration);
      
      callerToCDRMap[callerNumber] = {
        count: calls.length,
        answeredCalls,
        noAnswerCalls,
        busyCalls,
        totalDuration: totalAnsweredDuration,
        totalDurationFormatted,
        data: sortedCalls[0], // Latest call
      };
    });
    
    const rowCallerMatches = {};
    Object.entries(callerToCDRMap).forEach(([callerNumber, cdrInfo]) => {
      const callerRowIndices = phoneToRowsMap[callerNumber] || [];
      callerRowIndices.forEach(rowIndex => {
        const row = result[rowIndex];
        const rowCallerNumber = normalizePhoneForMatching(row.caller_number || row.callerNumber);
        if (rowCallerNumber !== callerNumber) return;
        if (!rowCallerMatches[rowIndex]) rowCallerMatches[rowIndex] = [];
        rowCallerMatches[rowIndex].push({
          receiverNumber: cdrInfo.data.receiverNumber,
          callCount: cdrInfo.count,
          answeredCalls: cdrInfo.answeredCalls,
          noAnswerCalls: cdrInfo.noAnswerCalls,
          busyCalls: cdrInfo.busyCalls,
          callDate: cdrInfo.data.callDate,
          callDuration: cdrInfo.totalDurationFormatted,
          totalDuration: cdrInfo.totalDuration,
          callStatus: cdrInfo.data.callStatus
        });
      });
    });
    Object.entries(rowCallerMatches).forEach(([rowIndex, matches]) => {
      rowIndex = parseInt(rowIndex);
      matches.sort((a, b) => b.callCount - a.callCount);
      const primaryMatch = matches[0];
      const originalCallDate = result[rowIndex].callDate || result[rowIndex].call_date || '';
        // Format duration considering call status and billsec for actual talk time
      let callDuration = primaryMatch.callDuration || '';
      if (primaryMatch.callStatus === 'NO ANSWER' || primaryMatch.callStatus === 'BUSY') {
        callDuration = '00:00:00';
      }
      
      result[rowIndex] = {
        ...result[rowIndex],
        receiver_number: primaryMatch.receiverNumber || '',
        call_count: primaryMatch.callCount || 0,
        answered_calls: primaryMatch.answeredCalls || 0,
        no_answer_calls: primaryMatch.noAnswerCalls || 0,
        busy_calls: primaryMatch.busyCalls || 0,
        cdr_call_date: primaryMatch.callDate || '',
        call_date: originalCallDate || primaryMatch.callDate || '',
        callDate: originalCallDate || primaryMatch.callDate || '',
        call_duration: callDuration,
        call_status: primaryMatch.callStatus || '',
        hasRecentCalls: true,
        all_matched_calls: matches
      };
    });
    return result;
  };

  const normalizePhoneForMatching = (phoneNumber) => {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\D/g, '');
  };

  const getPath = (recordingfile) => {
    if (!recordingfile) return '';
    try {
      const parts = recordingfile.split('-');
      if (parts.length < 5) return recordingfile;
      const dateStr = parts[3];
      if (!/^\d{8}$/.test(dateStr)) return recordingfile;
      const yyyy = dateStr.substring(0, 4);
      const mm = dateStr.substring(4, 6);
      const dd = dateStr.substring(6, 8);
      return `${yyyy}/${mm}/${dd}/${recordingfile}`;
    } catch (error) {
      console.error('Error formatting recording path:', error);
      return recordingfile;
    }
  };


  const openRecordingsModal = (call) => {
    setSelectedCall(call);
    setShowRecordingsModal(true);
    const callDate = call.call_date || call.callDate || '';
    let rowStartDate, rowEndDate;
    if (callDate && callDate.includes(' - ')) {
      [rowStartDate, rowEndDate] = callDate.split(' - ').map(d => formatDateForApi(d.trim()));
    } else if (callDate) {
      rowStartDate = formatDateForApi(callDate);
      rowEndDate = formatDateForApi(callDate);
    } else {
      rowStartDate = startDate;
      rowEndDate = endDate;
    }
    fetchRecordingsForCaller(call, rowStartDate, rowEndDate);
  };

  const closeRecordingsModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowRecordingsModal(false);
      setSelectedCall(null);
      setRecordings([]);
      setIsClosing(false);
    }, 300);
  };

  const fetchRecordingsForCaller = async (call, rowStartDate, rowEndDate) => {
    if (!call) return;
    const callerNumber = call.callerNumber || call.caller_number || '';
    const receiverNumber = call.receiverNumber || call.receiver_number || '';
    if (!receiverNumber || receiverNumber === 'N/A') {
      setRecordings([]);
      return;
    }
    setIsLoadingRecordings(true);
    try {
      const params = {
        callerNumber: callerNumber,
        receiverNumber: receiverNumber,
        start_date: rowStartDate,
        end_date: rowEndDate
      };
      const response = await defaultInstance.get('/caller-recordings', { params });
      if (response.data && response.data.success) {
        setRecordings(response.data.recordings);
      } else {
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setRecordings([]);
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  const toggleCommentPanel = (recordingId) => {
    if (activeCommentPanel === recordingId) {
      setActiveCommentPanel(null);
    } else {
      setActiveCommentPanel(recordingId);
      fetchRecordingComments(recordingId);
    }
  };

  const fetchRecordingComments = async (recordingId) => {
    try {
      setIsLoading(true);
      const response = await defaultInstance.get(`/recording-comments/${recordingId}`);
      if (Array.isArray(response.data)) {
        setRecordingComments(prev => ({
          ...prev,
          [recordingId]: response.data
        }));
      } else {
        setRecordingComments(prev => ({
          ...prev,
          [recordingId]: []
        }));
      }
    } catch (error) {
      console.error('Error fetching recording comments:', error);
      setRecordingComments(prev => ({
        ...prev,
        [recordingId]: []
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordingCommentChange = (recordingId, value) => {
    setNewRecordingComments(prev => ({
      ...prev,
      [recordingId]: value
    }));
  };

  const saveRecordingComment = async (recordingId) => {
    if (!recordingId || !newRecordingComments[recordingId]?.trim()) {
      alert('Comment cannot be empty');
      return;
    }
    try {
      setIsSavingComment(true);
      const response = await defaultInstance.post('/recording-comments', {
        recording_id: recordingId,
        comment: newRecordingComments[recordingId]
      });
      setNewRecordingComments(prev => ({
        ...prev,
        [recordingId]: ''
      }));
      fetchRecordingComments(recordingId);
    } catch (error) {
      console.error('Error saving recording comment:', error);
      alert('Failed to save comment: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId, recordingId) => {
    if (!isSuperAdmin) return;
    setCommentToDelete(commentId);
    setRecordingIdForComment(recordingId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteComment = async () => {
    try {
      setIsLoading(true);
      const response = await defaultInstance.delete(`/recording-comments/${commentToDelete}`);
      if (response.data && response.data.success) {
        fetchRecordingComments(recordingIdForComment);
      } else {
        alert('Failed to delete comment. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setCommentToDelete(null);
      setRecordingIdForComment(null);
    }
  };

  const cancelDeleteComment = () => {
    setShowDeleteConfirm(false);
    setCommentToDelete(null);
    setRecordingIdForComment(null);
  };

  const handleDownloadAudio = (recordingfile) => {
    if (!recordingfile) return;
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const downloadUrl = `${apiBaseUrl}/recordings/${getPath(recordingfile)}?download=1`;
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.setAttribute('download', recordingfile);
      downloadLink.setAttribute('target', '_blank');
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error initiating download:', error);
      alert('Failed to download the recording. Please try again.');
    }
  };

  useEffect(() => {
    const totalItems = excelData?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    setPagesCount(totalPages);
    setCurrentPage(1);
  }, [excelData]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (excelData && excelData.length > 0) {
      if (excelData.length !== lastExcelDataLength) {
        setLastExcelDataLength(excelData.length);
        if (!isProcessingCDR.current) {
          const dataFingerprint = JSON.stringify(excelData.map(item => item.id));
          const lastFingerprint = JSON.stringify(lastProcessedData.current.map(item => item.id));
          if (dataFingerprint !== lastFingerprint) {
            lastProcessedData.current = excelData;
            isProcessingCDR.current = true;
            setTimeout(() => {
              fetchLiveCdrData();
            }, 500);
          }
        }
      }
    }
  }, [excelData]);

  useEffect(() => {
    fetchCallerData();
  }, []);

  // Log when component mounts/unmounts to help debug race conditions
  useEffect(() => {
    console.log('VIPCallerDashboard mounted');
    
    return () => {
      console.log('VIPCallerDashboard unmounting and cleaning up');
    };
  }, []);
  
  // Log when data changes
  useEffect(() => {
    console.log(`VIPCallerDashboard received ${excelData?.length || 0} records`);
  }, [excelData]);

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
      const delta = 2;
      const pages = [];
      pages.push(1);
      let start = Math.max(2, currentPage - delta);
      let end = Math.min(totalPages - 1, currentPage + delta);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
      return pages;
    };

    if (totalPages <= 1) return null;

    return (
      <nav className={paginationStyles.paginationContainer} ref={paginationRef}>
        <ul className={paginationStyles.paginationList}>
          <li className={paginationStyles.pageItem}>
            <button
              className={`${paginationStyles.pageLink} ${paginationStyles.navigation} ${paginationStyles.prevNav} ${currentPage === 1 ? paginationStyles.disabled : ''}`}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              « Prev
            </button>
          </li>
          {getPageNumbers().map((page, index) => (
            <li
              key={index}
              className={`${paginationStyles.pageItem} ${animatePage ? paginationStyles.scaleUp : ''}`}
            >
              {page === '...' ? (
                <span className={`${paginationStyles.pageLink} ${paginationStyles.ellipsis}`}>
                  …
                </span>
              ) : (
                <button
                  className={`${paginationStyles.pageLink} ${page === currentPage ? `${paginationStyles.active} ${paginationStyles.pulse}` : ''}`}
                  onClick={() => onPageChange(page)}
                  disabled={page === currentPage}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              )}
            </li>
          ))}
          <li className={paginationStyles.pageItem}>
            <button
              className={`${paginationStyles.pageLink} ${paginationStyles.navigation} ${paginationStyles.nextNav} ${currentPage === totalPages ? paginationStyles.disabled : ''}`}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next »
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <div className="ecommerce-widget">
      <div className="row">
        <div className="col-12">
          <div key={`caller-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
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
                        <th>{t('ANSWERED')}</th>
                        <th>{t('NOANSWERED')}</th>
                        <th>{t('BUSY')}</th>
                        <th>{t('callDate')}</th>
                        <th>{t('callDuration')}</th>
                        <th>{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(excelData).length > 0 ? (
                        getPaginatedData(excelData).map((call, index) => (
                          <tr key={call.id || index} className={call.hasRecentCalls ? "table-warning" : ""}>
                            <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                            <td>{call.companyName || call.company_name || 'N/A'}</td>
                            <td>{call.identificationCode || call.identification_code || call.id || 'N/A'}</td>
                            <td>{call.contactPerson1 || call.contact_person1 || 'N/A'}</td>
                            <td>{call.tel1 || call.contactTel1 || 'N/A'}</td>
                            <td>{call.contactPerson2 || call.contact_person2 || 'N/A'}</td>
                            <td>{call.tel2 || call.contactTel2 || 'N/A'}</td>
                            <td>{call.contactPerson3 || call.contact_person3 || 'N/A'}</td>
                            <td>{call.tel3 || call.contactTel3 || 'N/A'}</td>
                            <td>{call.callerName || call.caller_name || 'N/A'}</td>
                            <td>{call.callerNumber || call.caller_number || 'N/A'}</td>
                            <td>{call.receiverName || call.receiver_name || 'N/A'}</td>
                            <td>
                              {(call.receiverNumber === 'N/A' || call.receiver_number === 'N/A') ?
                                'N/A' :
                                (call.receiverNumber || call.receiver_number || 'N/A')}
                            </td>
                            <td>{call.callCount || call.call_count || '0'}</td>
                            <td>{call.answeredCalls || call.answered_calls || '0'}</td>
                            <td>{call.noAnswerCalls || call.no_answer_calls || '0'}</td>
                            <td>{call.busyCalls || call.busy_calls || '0'}</td>
                            <td>{call.callDate || call.call_date || 'N/A'}</td>
                            <td>{call.callDuration || call.call_duration || 'N/A'}</td>
                            <td>
                              <button
                                className={button_comments.callsButton}
                                onClick={() => openRecordingsModal(call)}
                                title="View Call Recordings"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
                                </svg>
                                Calls
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
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagesCount}
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {showRecordingsModal && selectedCall && (
        <div className={`${modalStyles.modalOverlay} ${isClosing ? modalStyles.modalClosing : ''}`}>
          <div className={`${modalStyles.modalContent} ${isClosing ? modalStyles.modalContentClosing : ''}`}>
            <div className={modalStyles.modalHeader}>
              <h5 className={modalStyles.modalTitle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                  <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
                </svg>
                {t('callRecordings')} - {selectedCall.callerNumber || selectedCall.caller_number || ''}
                {selectedCall.receiverNumber && selectedCall.receiverNumber !== 'N/A' ?
                  <span style={{marginLeft: '0px'}}>→ {selectedCall.receiverNumber}</span> : ''}
              </h5>
              <button type="button" className={modalStyles.closeButton} onClick={closeRecordingsModal}>
                ×
              </button>
            </div>
            <div className={modalStyles.modalBody}>
              {isLoadingRecordings ? (
                <div className={modalStyles.loadingContainer}>
                  <div className={modalStyles.spinner}></div>
                  <p>Fetching recordings...</p>
                </div>
              ) : recordings.length > 0 ? (
                <div className={modalStyles.recordingsList}>
                  {recordings.map((recording, index) => (
                    <div
                      key={index}
                      className={modalStyles.recordingItem}
                      style={{"--index": index}}
                    >
                      <div className={modalStyles.recordingInfo}>
                        <div>
                          <span className={modalStyles.infoLabel}>Date & Time</span>
                          <span className={modalStyles.infoValue}>{new Date(recording.calldate).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className={modalStyles.infoLabel}>Duration</span>
                          <span className={modalStyles.infoValue}>{recording.formattedDuration}</span>
                        </div>
                        <div>
                          <span className={modalStyles.infoLabel}>Receiver</span>
                          <span className={modalStyles.infoValue}>{recording.dst}</span>
                        </div>
                        <div>
                          <span className={modalStyles.infoLabel}>Status</span>
                          <span className={`${modalStyles.statusBadge} ${
                            recording.disposition === 'ANSWERED' ? modalStyles.statusAnswered :
                            recording.disposition === 'NO ANSWER' ? modalStyles.statusNoAnswer :
                            recording.disposition === 'BUSY' ? modalStyles.statusBusy : ''
                          }`}>
                            {recording.disposition}
                          </span>
                        </div>
                      </div>
                      {recording.recordingfile && (
                        <div className={modalStyles.audioContainer}>
                          <audio
                            controls
                            className={modalStyles.audioPlayer}
                            onError={(e) => console.error('Audio error:', e)}
                          >
                            <source
                              src={`${recordingsBaseUrl}/${getPath(recording.recordingfile)}`}
                              type="audio/wav"
                            />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                      <div className={modalStyles.commentSection}>
                        <div className={modalStyles.commentSectionMain}>
                          <button
                            className={`${modalStyles.commentToggle} ${
                              activeCommentPanel === recording.recordingfile ? modalStyles.commentToggleActive : ''
                            }`}
                            onClick={() => toggleCommentPanel(recording.recordingfile)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zm0-1A7 7 0 1 0 8 1a7 7 0 0 0 0 14z"/>
                              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            {activeCommentPanel === recording.recordingfile ? t('hideComments') : t('showComments')}
                          </button>
                          <div className={modalStyles.audioControls}>
                            <button
                              className={modalStyles.downloadButton}
                              onClick={() => handleDownloadAudio(recording.recordingfile)}
                              title={t('downloadRecording')}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                              </svg>
                              {t('download')}
                            </button>
                          </div>
                        </div>
                        <div
                          className={`${modalStyles.commentPanel} ${
                            activeCommentPanel === recording.recordingfile ? modalStyles.commentPanelOpen : ''
                          }`}
                        >
                          <div className={modalStyles.commentForm}>
                            <textarea
                              className={modalStyles.commentInput}
                              value={newRecordingComments[recording.recordingfile] || ''}
                              onChange={(e) => handleRecordingCommentChange(recording.recordingfile, e.target.value)}
                              placeholder={t('addCommentForRecording')}
                              rows="3"
                            ></textarea>
                            <button
                              className={modalStyles.commentButton}
                              onClick={() => saveRecordingComment(recording.recordingfile)}
                              disabled={isSavingComment || !(newRecordingComments[recording.recordingfile]?.trim())}
                            >
                              {isSavingComment ? t('saving') : t('addComment')}
                            </button>
                          </div>
                          {recordingComments[recording.recordingfile]?.length > 0 && (
                            <div className={modalStyles.commentsListHeader}>
                              {t('comments')} ({recordingComments[recording.recordingfile]?.length})
                            </div>
                          )}
                          <div className={modalStyles.commentsList}>
                            {recordingComments[recording.recordingfile]?.length > 0 ? (
                              recordingComments[recording.recordingfile].map((comment, idx) => (
                                <div key={idx} className={modalStyles.commentItem}>
                                  <p className={modalStyles.commentAuthor}>
                                    <span className={modalStyles.commentAuthorName}>
                                      {comment.user?.name || t('unknownUser')}
                                    </span>
                                    <span className={modalStyles.commentDate}>
                                      {new Date(comment.created_at).toLocaleString()}
                                    </span>
                                  </p>
                                  <p className={modalStyles.commentText}>{comment.comment}</p>
                                  {isSuperAdmin && (
                                    <div className={modalStyles.commentActions}>
                                      <button
                                        className={modalStyles.deleteCommentButton}
                                        onClick={() => handleDeleteComment(comment.id, recording.recordingfile)}
                                        title={t('deleteComment')}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                        </svg>
                                        {t('deleteComment')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className={modalStyles.noComments}>{t('noCommentsYet')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={modalStyles.noRecordings}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10.404 5.11c.5.502.502 1.313 0 1.815-.503.502-1.312.502-1.815 0-.503-.503-.503-1.313 0-1.816.5-.5 1.312-.5 1.815 0M8 1.11a6.85 6.85 0 0 0-6.894 6.89c0 3.83 3.068 6.894 6.894 6.894A6.889 6.889 0 0 0 14.89 8a6.886 6.886 0 0 0-6.89-6.89m-1.5 2.976c-.5 0-.977.196-1.33.55-.554.554-.694 1.397-.35 2.095.342.7 1.06 1.134 1.838 1.134.507 0 .99-.196 1.348-.55.556-.554.693-1.397.35-2.095-.34-.696-1.063-1.134-1.837-1.134m1.5-1.5c2.483 0 4.5 2.015 4.5 4.5s-2.017 4.5-4.5 4.5-4.5-2.015-4.5-4.5 2.017-4.5 4.5-4.5m7.438 2.343c.32.2.262.484.268.85.003.398.068.576-.077.845-.148.264-.44.46-.44.632 0 .17.29.367.44.63.145.27.08.447.077.846-.006.367-.026.65-.268.85-.244.2-.394.116-.618.116-.225 0-.375.084-.62-.116-.24-.2-.26-.483-.265-.85-.004-.398-.066-.575.075-.845.146-.264.44-.46.44-.63 0-.17-.294-.368-.44-.632-.144-.27-.08-.447-.075-.846.005-.366.025-.65.265-.85.245-.2.395-.116.62-.116.224 0 .374-.083.618.116"/>
                  </svg>
                  <p>No recordings found for this caller during the specified date range.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className={modalStyles.deleteConfirmModal}>
          <div className={modalStyles.deleteConfirmContent}>
            <div className={modalStyles.deleteConfirmHeader}>
              <h4>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0 0 1 0-2z"/>
                </svg>
                {t('deleteComment')}
              </h4>
            </div>
            <div className={modalStyles.deleteConfirmBody}>
              <p>{t('confirmCommentDeletion')}</p>
            </div>
            <div className={modalStyles.deleteConfirmFooter}>
              <button
                className={modalStyles.cancelDeleteBtn}
                onClick={cancelDeleteComment}
              >
                {t('cancel')}
              </button>
              <button
                className={modalStyles.confirmDeleteBtn}
                onClick={confirmDeleteComment}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VIPCallerDashboard;
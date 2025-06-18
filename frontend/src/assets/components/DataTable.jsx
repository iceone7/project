import { useState, useEffect, useRef } from 'react';
import edit_delete from '../css/edit_detele.module.css';
import button_comments from '../css/button_comments.module.css';
import paginationStyles from '../css/pagination.module.css';
import modalStyles from '../css/recordings-modal.module.css'; // Import the new styles
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
  
  // Pagination state
  const itemsPerPage = 15;
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);
  
  // Add refs to prevent request loops
  const isInitialMount = useRef(true);
  const isProcessingCDR = useRef(false);
  const lastProcessedData = useRef([]);
  const { t } = useLanguage();

  const recordingsBaseUrl = import.meta.env.VITE_RECORDINGS_URL;

  // Animation reference for page changes
  const paginationRef = useRef(null);
  const [animatePage, setAnimatePage] = useState(false);

  // Calculate total pages whenever data changes
  useEffect(() => {
    let totalItems = 0;
    if (activeDashboard === 'company' && isDepartamentVip) {
      totalItems = filteredCompanies?.length || 0;
    } else if (activeDashboard === 'caller') {
      totalItems = excelData?.length || 0;
    } else if (activeDashboard === 'company' && isDepartamentCraftsmen) {
      totalItems = calls?.length || 0;
    }
    
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    setPagesCount(totalPages);
    
    // Reset to first page when dashboard changes or when data significantly changes
    setCurrentPage(1);
  }, [activeDashboard, filteredCompanies, excelData, calls]);

  // Pagination handler functions
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagesCount && newPage !== currentPage) {
      setAnimatePage(true);
      
      // Small delay for animation effect before changing page
      setTimeout(() => {
        setCurrentPage(newPage);
        // Reset animation state after changing page
        setTimeout(() => {
          setAnimatePage(false);
        }, 300);
      }, 200);
    }
  };
  
  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data?.slice(startIndex, endIndex) || [];
  };

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
    // Skip on initial mount - only run on subsequent updates
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (activeDashboard === 'caller' && excelData && excelData.length > 0) {
      // Check if the data has changed significantly
      if (excelData.length !== lastExcelDataLength) {
        console.log('New data detected, refreshing CDR data...');
        setLastExcelDataLength(excelData.length);
        
        // Only fetch if not already processing
        if (!isProcessingCDR.current) {
          // Track data fingerprint to avoid duplicate processing
          const dataFingerprint = JSON.stringify(excelData.map(item => item.id));
          const lastFingerprint = JSON.stringify(lastProcessedData.current.map(item => item.id));
          
          if (dataFingerprint !== lastFingerprint) {
            console.log('Processing new unique data set');
            lastProcessedData.current = excelData;
            
            // Set processing flag
            isProcessingCDR.current = true;
            
            // Use setTimeout to ensure the component is fully rendered
            setTimeout(() => {
              fetchLiveCdrData();
            }, 500);
          } else {
            console.log('Skipping duplicate data processing');
          }
        } else {
          console.log('CDR processing already in progress, skipping new request');
        }
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

  // Function to extract date range for display
  const getDateRangeFromCallData = (callData) => {
    // First check if any row has a date range format
    for (const row of callData || []) {
      const dateField = row.callDate || row.call_date || '';
      if (dateField && dateField.includes(' - ')) {
        return dateField; // Return the formatted range
      }
    }
    return null;
  };

  // Function to fetch live CDR data with date filtering support
  const fetchLiveCdrData = async () => {
    if (!excelData || excelData.length === 0) {
      isProcessingCDR.current = false;
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Extract date range from call data if available
      let dateRange = getDateRangeFromCallData(excelData);
      let parsedStartDate = startDate;
      let parsedEndDate = endDate;
      
      // If date range found in call data, parse it
      if (dateRange) {
        const [rangeStart, rangeEnd] = dateRange.split(' - ').map(d => d.trim());
        parsedStartDate = formatDateForApi(rangeStart);
        parsedEndDate = formatDateForApi(rangeEnd);
        console.log(`Using date range from call data: ${parsedStartDate} to ${parsedEndDate}`);
      }
      
      // Always include date filters in params
      const params = {
        start_date: parsedStartDate,
        end_date: parsedEndDate
      };
      
      if (lastUpdateTime) {
        params.since = lastUpdateTime;
      }
      
      console.log('Fetching live CDR data with filters:', params);
      
      const response = await defaultInstance.get('/live-cdr', { params });
      
      if (response.data && response.data.success) {
        setLastUpdateTime(response.data.timestamp);
        console.log(`Received ${response.data.data.length} CDR records with date range:`, response.data.date_range);
        
        // Process the CDR data
        const updatedData = processCdrDataWithExcel(excelData, response.data.data);
        
        if (typeof handleCallerUploadSuccess === 'function') {
          // This would usually trigger the effect again, but we have our flag to prevent loops
          handleCallerUploadSuccess(updatedData);
        }
      }
    } catch (error) {
      console.error('Error fetching live CDR data:', error);
    } finally {
      setIsLoading(false);
      // Reset the processing flag AFTER the request is complete
      setTimeout(() => {
        isProcessingCDR.current = false;
      }, 1000);
    }
  };
  
  // Process CDR data with Excel data - enhanced for accurate call counts without phone matching
  const processCdrDataWithExcel = (excelData, cdrData) => {
    console.log('Processing', cdrData.length, 'CDR records for', excelData.length, 'Excel rows');
    
    const result = [...excelData];
    const phoneToRowsMap = {};
    
    // First pass: create a lookup map of ONLY caller numbers in the Excel data
    excelData.forEach((row, index) => {
      const callerNumber = normalizePhoneForMatching(row.caller_number || row.callerNumber);
      if (callerNumber) {
        if (!phoneToRowsMap[callerNumber]) phoneToRowsMap[callerNumber] = [];
        phoneToRowsMap[callerNumber].push(index);
      }
    });
    
    // Group CDR data by unique caller with status breakdowns
    const callerToCDRMap = {};
    
    cdrData.forEach(cdr => {
      const callerNumber = normalizePhoneForMatching(cdr.callerNumber);
      const callStatus = cdr.callStatus || 'UNKNOWN';
      
      // Initialize counter structure if this is a new caller
      if (!callerToCDRMap[callerNumber]) {
        callerToCDRMap[callerNumber] = {
          count: 0,
          answeredCalls: 0,
          noAnswerCalls: 0,
          busyCalls: 0,
          data: cdr
        };
      }
      
      // Increment total count
      callerToCDRMap[callerNumber].count++;
      
      // Increment specific status counter
      if (callStatus === 'ANSWERED') {
        callerToCDRMap[callerNumber].answeredCalls++;
      } else if (callStatus === 'NO ANSWER') {
        callerToCDRMap[callerNumber].noAnswerCalls++;
      } else if (callStatus === 'BUSY') {
        callerToCDRMap[callerNumber].busyCalls++;
      }
      
      // Update latest call if this one is newer
      if (new Date(cdr.callDate) > new Date(callerToCDRMap[callerNumber].data.callDate)) {
        callerToCDRMap[callerNumber].data = cdr;
      }
    });
    
    console.log('Found', Object.keys(callerToCDRMap).length, 'unique callers');
    
    // Create a map to store matched callers for each row
    const rowCallerMatches = {};
    
    // Update Excel rows with the matching CDR data
    Object.entries(callerToCDRMap).forEach(([callerNumber, cdrInfo]) => {
      // Find rows with this caller number
      const callerRowIndices = phoneToRowsMap[callerNumber] || [];
      
      callerRowIndices.forEach(rowIndex => {
        const row = result[rowIndex];
        const rowCallerNumber = normalizePhoneForMatching(row.caller_number || row.callerNumber);
        
        // Verify the caller number matches
        if (rowCallerNumber !== callerNumber) return;
        
        // Initialize caller matches for this row if needed
        if (!rowCallerMatches[rowIndex]) {
          rowCallerMatches[rowIndex] = [];
        }
        
        // Store this match
        rowCallerMatches[rowIndex].push({
          receiverNumber: cdrInfo.data.receiverNumber,
          callCount: cdrInfo.count,
          answeredCalls: cdrInfo.answeredCalls,
          noAnswerCalls: cdrInfo.noAnswerCalls,
          busyCalls: cdrInfo.busyCalls,
          callDate: cdrInfo.data.callDate,
          callDuration: cdrInfo.data.formattedDuration,
          callStatus: cdrInfo.data.callStatus
        });
      });
    });
    
    // Update rows with their caller match data
    Object.entries(rowCallerMatches).forEach(([rowIndex, matches]) => {
      rowIndex = parseInt(rowIndex);
      
      // Sort matches by total call count (highest first)
      matches.sort((a, b) => b.callCount - a.callCount);
      
      // Use the caller with most calls as primary
      const primaryMatch = matches[0];
      
      // Preserve the original call date from Excel
      const originalCallDate = result[rowIndex].callDate || result[rowIndex].call_date || '';
      
      // Update this row with the call data
      result[rowIndex] = {
        ...result[rowIndex],
        receiver_number: primaryMatch.receiverNumber || '',
        call_count: primaryMatch.callCount || 0,
        answered_calls: primaryMatch.answeredCalls || 0,
        no_answer_calls: primaryMatch.noAnswerCalls || 0,
        busy_calls: primaryMatch.busyCalls || 0,
        
        // Store CDR date in a separate field, don't overwrite original
        cdr_call_date: primaryMatch.callDate || '',
        
        // Only update call_date if it wasn't present in Excel
        call_date: originalCallDate || primaryMatch.callDate || '',
        callDate: originalCallDate || primaryMatch.callDate || '',
        
        call_duration: primaryMatch.callDuration || '',
        call_status: primaryMatch.callStatus || '',
        hasRecentCalls: true,
        all_matched_calls: matches  // Store all matched calls
      };
    });
    
    return result;
  };
  
  // Helper function to normalize phone numbers for matching
  const normalizePhoneForMatching = (phoneNumber) => {
    if (!phoneNumber) return '';
    // Remove all non-digit characters
    return phoneNumber.replace(/\D/g, '');
  };

  // Improved path formatting function with better error handling
  const getPath = (recordingfile) => {
    if (!recordingfile) return '';
    try {
      const parts = recordingfile.split('-');
      if (parts.length < 5) return recordingfile;

      const dateStr = parts[3]; // например: 20250429
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

  // Add a function to handle audio errors more gracefully
  const handleAudioError = (e, recordingfile) => {
    console.error('Audio error for file:', recordingfile, e);
    
    // Log additional information for debugging
    const audioSrc = `${recordingsBaseUrl}/${getPath(recordingfile)}`;
    console.log('Attempted to load audio from:', audioSrc);
    
    // You could update UI state here to show a user-friendly error message
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

  // Get data for current dashboard and apply pagination
  const dataToDisplay = activeDashboard === 'caller' ? excelData : filteredCompanies;
  const paginatedData = getPaginatedData(dataToDisplay);
  const paginatedCalls = getPaginatedData(calls);

  // Enhanced Pagination component with beautiful design and animations
  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
      const delta = 2; // Number of pages to show before and after current page
      const pages = [];
      
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of page range around current page
      let start = Math.max(2, currentPage - delta);
      let end = Math.min(totalPages - 1, currentPage + delta);
      
      // Adjust to show consistent number of pages
      if (start > 2) pages.push('...');
      
      // Add pages in range
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis if needed
      if (end < totalPages - 1) pages.push('...');
      
      // Always show last page if more than 1 page
      if (totalPages > 1) pages.push(totalPages);
      
      return pages;
    };
    
    if (totalPages <= 1) return null; // Don't show pagination if there's only one page

    return (
      <nav 
        aria-label="Data pagination" 
        className={paginationStyles.paginationContainer}
        ref={paginationRef}
      >
        <ul className={paginationStyles.paginationList}>
          <li className={`${paginationStyles.pageItem}`}>
            <button 
              className={`${paginationStyles.pageLink} ${paginationStyles.navigation} ${paginationStyles.prevNav} ${currentPage === 1 ? paginationStyles.disabled : ''}`}
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              &laquo; Prev
            </button>
          </li>
          
          {getPageNumbers().map((page, index) => (
            <li 
              key={index} 
              className={`${paginationStyles.pageItem} ${animatePage ? paginationStyles.scaleUp : ''}`}
            >
              {page === '...' ? (
                <span className={`${paginationStyles.pageLink} ${paginationStyles.ellipsis}`}>
                  &hellip;
                </span>
              ) : (
                <button 
                  className={`${paginationStyles.pageLink} ${page === currentPage ? `${paginationStyles.active} ${paginationStyles.pulse}` : ''}`}
                  onClick={() => onPageChange(page)}
                  disabled={page === currentPage}
                  aria-label={`Page ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              )}
            </li>
          ))}
          
          <li className={`${paginationStyles.pageItem}`}>
            <button 
              className={`${paginationStyles.pageLink} ${paginationStyles.navigation} ${paginationStyles.nextNav} ${currentPage === totalPages ? paginationStyles.disabled : ''}`}
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next &raquo;
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  // Add new state variables for the recordings modal
  const [showRecordingsModal, setShowRecordingsModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);

  // Add new state variables for modal animation
  const [isClosing, setIsClosing] = useState(false);
  
  // Function to format call duration from seconds to HH:MM:SS
  const formatCallDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    
    const secondsNum = parseInt(seconds, 10);
    if (isNaN(secondsNum)) return '00:00:00';
    
    const hours = Math.floor(secondsNum / 3600);
    const minutes = Math.floor((secondsNum / 60) % 60);
    const secs = secondsNum % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to open the recordings modal
  const openRecordingsModal = (call) => {
    setSelectedCall(call);
    setShowRecordingsModal(true);
    
    // Extract date range from the call data
    const callDate = call.call_date || call.callDate || '';
    let rowStartDate, rowEndDate;
    
    // Check if the call_date contains a range (format: "2023-01-01 - 2023-01-31")
    if (callDate && callDate.includes(' - ')) {
      [rowStartDate, rowEndDate] = callDate.split(' - ').map(d => formatDateForApi(d.trim()));
      console.log(`Extracted date range from call_date: ${rowStartDate} to ${rowEndDate}`);
    } else if (callDate) {
      // If it's a single date, use it as both start and end date
      rowStartDate = formatDateForApi(callDate);
      rowEndDate = formatDateForApi(callDate);
      console.log(`Using single date from call_date: ${rowStartDate}`);
    } else {
      // Fallback to global date filters if no call date is available
      rowStartDate = startDate;
      rowEndDate = endDate;
      console.log(`Using global date filters: ${rowStartDate} to ${rowEndDate}`);
    }
    
    // Fetch recordings with the specific date range from this call
    fetchRecordingsForCaller(call, rowStartDate, rowEndDate);
  };

  // Modified function to close the recordings modal with animation
  const closeRecordingsModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowRecordingsModal(false);
      setSelectedCall(null);
      setRecordings([]);
      setIsClosing(false);
    }, 300); // Match this to the animation duration
  };

  // Function to fetch recordings for the selected call
  const fetchRecordingsForCaller = async (call, rowStartDate, rowEndDate) => {
    if (!call) return;
    
    const callerNumber = call.callerNumber || call.caller_number || '';
    const receiverNumber = call.receiverNumber || call.receiver_number || '';
    
    if (!receiverNumber || receiverNumber === 'N/A') {
      console.error('No valid receiver number provided');
      setRecordings([]);
      return;
    }
    
    setIsLoadingRecordings(true);
    try {
      console.log(`Fetching recordings for caller: ${callerNumber}, receiver: ${receiverNumber}, date range: ${rowStartDate} to ${rowEndDate}`);
      
      // Use the date range from the row instead of global filters
      const params = {
        callerNumber: callerNumber,
        receiverNumber: receiverNumber,
        start_date: rowStartDate, // Use row-specific date
        end_date: rowEndDate     // Use row-specific date
      };
      
      // Log date range being used
      console.log('Using row-specific date range for recordings:', params.start_date, 'to', params.end_date);
      
      // Use a dedicated endpoint to get matching recordings
      const response = await defaultInstance.get('/caller-recordings', { params });
      
      if (response.data && response.data.success) {
        console.log(`Found ${response.data.recordings.length} recordings for caller-receiver pair in date range`);
        setRecordings(response.data.recordings);
      } else {
        console.error('Error in recordings response:', response.data);
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setRecordings([]);
    } finally {
      setIsLoadingRecordings(false);
    }
  };
  
  // Extract caller number from clid or src field
  const extractCallerNumber = (cdrRecord) => {
    if (!cdrRecord) return '';
    
    // First try to extract from clid (format: "Name" <number>)
    if (cdrRecord.clid && cdrRecord.clid.includes('<') && cdrRecord.clid.includes('>')) {
      const match = cdrRecord.clid.match(/<([^>]+)>/);
      if (match && match[1]) {
        return normalizePhoneForMatching(match[1]);
      }
    }
    
    // Otherwise use src field
    return normalizePhoneForMatching(cdrRecord.src || '');
  };

  // We can keep these state variables but won't need the comment input ones
  const [recordingComments, setRecordingComments] = useState({});
  const [activeCommentPanel, setActiveCommentPanel] = useState(null);

  // Toggle comment panel for a recording
  const toggleCommentPanel = (recordingId) => {
    if (activeCommentPanel === recordingId) {
      setActiveCommentPanel(null);
    } else {
      setActiveCommentPanel(recordingId);
      fetchRecordingComments(recordingId);
    }
  };

  // Fetch comments for a recording
  const fetchRecordingComments = async (recordingId) => {
    try {
      setIsLoading(true);
      
      console.log(`Fetching comments for recording: ${recordingId}`);
      const response = await defaultInstance.get(`/recording-comments/${recordingId}`);
      
      if (Array.isArray(response.data)) {
        console.log(`Found ${response.data.length} comments for recording ${recordingId}`);
        setRecordingComments(prev => ({
          ...prev,
          [recordingId]: response.data
        }));
      } else {
        console.error('Invalid comments response format:', response.data);
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

  // Add the following state variables with your other state declarations (around line 40-50)
  const [newRecordingComments, setNewRecordingComments] = useState({});
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Add this function to handle input changes for recording comments
  const handleRecordingCommentChange = (recordingId, value) => {
    setNewRecordingComments(prev => ({
      ...prev,
      [recordingId]: value
    }));
  };

  // Add this function to save recording comments
  const saveRecordingComment = async (recordingId) => {
    if (!recordingId || !newRecordingComments[recordingId]?.trim()) {
      alert('Comment cannot be empty');
      return;
    }

    try {
      setIsSavingComment(true);
      
      console.log(`Saving comment for recording: ${recordingId}`);
      
      const response = await defaultInstance.post('/recording-comments', {
        recording_id: recordingId,
        comment: newRecordingComments[recordingId]
      });
      
      console.log('Recording comment saved successfully:', response.data);
      
      // Clear the input after saving
      setNewRecordingComments(prev => ({
        ...prev,
        [recordingId]: ''
      }));
      
      // Update the comments list
      fetchRecordingComments(recordingId);
      
    } catch (error) {
      console.error('Error saving recording comment:', error);
      alert('Failed to save comment: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsSavingComment(false);
    }
  };

  // Modify this function to handle audio file download
  const handleDownloadAudio = (recordingfile) => {
    if (!recordingfile) return;
    
    try {
      // Instead of using the direct recordings URL, use our backend API route
      // which already handles proxying to the recording server
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const downloadUrl = `${apiBaseUrl}/recordings/${getPath(recordingfile)}?download=1`;
      
      console.log('Initiating download from:', downloadUrl);
      
      // Create anchor element to trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.setAttribute('download', recordingfile); // Suggest filename
      downloadLink.setAttribute('target', '_blank'); // Open in new tab as fallback
      
      // Append to body, trigger click, then remove
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      console.log('Download initiated for:', recordingfile);
    } catch (error) {
      console.error('Error initiating download:', error);
      alert('Failed to download the recording. Please try again.');
    }
  };

  return (
    <>
      {isDepartamentVip && activeDashboard === 'company' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={`${activeDashboard}-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
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
                          {paginatedData.length > 0 ? (
                            paginatedData.map((company, index) => (
                              <tr key={company.id || index}>
                                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
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
        </div>
      )}
      
      {activeDashboard === 'caller' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={`${activeDashboard}-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
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
                                <td>
                                  {call.callDate || call.call_date || 'N/A'}
                                </td>
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
        </div>
      )}
      
      {isDepartamentCraftsmen && activeDashboard === 'company' && (
        <div className="ecommerce-widget">
          <div className="row">
            <div className="col-12">
              <div key={`${activeDashboard}-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
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
                          {paginatedCalls.length > 0 ? (
                            paginatedCalls.map((call, index) => (
                              <tr key={index}>
                                <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                <td>{call.clid || 'N/A'}</td>
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
                                      onError={(e) => handleAudioError(e, call.recordingfile)}
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
      
      {/* Recordings Modal - Updated with new styles */}
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
                  <span style={{marginLeft: '4px'}}>→ {selectedCall.receiverNumber}</span> : ''}
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
                          <span className={modalStyles.infoValue}>{formatCallDuration(recording.duration)}</span>
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
                      
                      {/* Update the comment section in the recordings modal */}
                      <div className={modalStyles.commentSection}>
                        <div className={modalStyles.commentSectionMain}>
                          <button 
                            className={`${modalStyles.commentToggle} ${
                              activeCommentPanel === recording.recordingfile ? modalStyles.commentToggleActive : ''
                            }`}
                            onClick={() => toggleCommentPanel(recording.recordingfile)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
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
                          {/* Add the comment input form */}
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
                              disabled={isSavingComment}
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
            {/* <div className={modalStyles.modalFooter}>
              <button type="button" className={modalStyles.closeModalBtn} onClick={closeRecordingsModal}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
                Close
              </button>
            </div> */}
          </div>
        </div>
      )}
    </>
  );
};

export default DataTable;
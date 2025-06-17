import styles from '../css/CreateButton.module.css';
import download_button from '../css/UploadButton.module.css';
import FilterForm from './FilterForm';
import UploadExcel from './UploadExcel';
import UploadCompanyExcel from './UploadCompanyExcel';
import * as XLSX from 'xlsx';
import { useState, useEffect, useRef } from 'react';
import defaultInstance from '../../api/defaultInstance';
import { useLanguage } from '../i18n/LanguageContext';

const isDepartamentCraftsmen = localStorage.getItem('department_id') === '2';

const ButtonsPanel = ({
  activeDashboard,
  handleOpenModal,
  handleDownloadExcel,
  filteredCompanies,
  setShowFilters,
  showFilters,
  onUploadSuccess,
  excelData,
  onCompanyUploadSuccess,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);
  const { t } = useLanguage();
  const [buttonScale, setButtonScale] = useState(1);
  const [animateButton, setAnimateButton] = useState(false);
  const [showFullscreenAnimation, setShowFullscreenAnimation] = useState(false);
  const [animationState, setAnimationState] = useState('hidden'); // 'hidden', 'entering', 'visible', 'exiting'
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef(null);
  
  // Custom tooltip styles
  const tooltipStyle = {
    container: {
      position: 'relative',
      display: 'inline-block',
    },
    tooltip: {
      position: 'absolute',
      bottom: '80%',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#333',
      color: '#fff',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      opacity: 0,
      visibility: 'hidden',
      transition: 'opacity 0.3s, visibility 0.3s, transform 0.3s',
      zIndex: 100,
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      marginBottom: '5px',
    },
    tooltipVisible: {
      opacity: 1,
      visibility: 'visible',
      transform: 'translateX(-50%) translateY(-5px)',
    },
    arrow: {
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderWidth: '5px',
      borderStyle: 'solid',
      borderColor: '#333 transparent transparent transparent',
    }
  };
  
  // Download button animation styles
  const buttonAnimationStyle = {
    transform: `scale(${buttonScale})`,
    transition: 'transform 0.3s ease, background-color 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  // Animation effect when starting download
  const startDownloadAnimation = () => {
    setAnimateButton(true);
    setButtonScale(0.95); // Slight scale down effect
    setShowFullscreenAnimation(true);
    setAnimationState('entering');
    setDownloadProgress(0);
    
    // Simulate progress for visual feedback
    const progressInterval = setInterval(() => {
      setDownloadProgress(prevProgress => {
        const newProgress = prevProgress + (Math.random() * 15);
        return newProgress >= 90 ? 90 : newProgress; // Cap at 90% until completed
      });
    }, 200);
    
    // Store interval ID for cleanup
    sessionStorage.setItem('progressInterval', progressInterval);
    
    setTimeout(() => {
      setButtonScale(1); // Return to original size
      setAnimationState('visible');
    }, 200);
  };
  
  // Function to complete the download animation
  const completeDownloadAnimation = () => {
    // Clear the progress interval
    const intervalId = sessionStorage.getItem('progressInterval');
    if (intervalId) clearInterval(Number(intervalId));
    
    // Set progress to 100%
    setDownloadProgress(100);
    
    // Show confetti
    setShowConfetti(true);
    
    // Begin exit sequence after showing completion state
    setTimeout(() => {
      setAnimationState('exiting'); // Start exit animation
      
      // Only hide completely after exit animation finishes
      setTimeout(() => {
        setShowFullscreenAnimation(false);
        setAnimationState('hidden');
        // Reset state after animation is hidden
        setTimeout(() => {
          setDownloadProgress(0);
          setShowConfetti(false);
        }, 100);
      }, 800); // Match this duration with the fadeOut animation duration
      
    }, 2500);
  };

  // Stop the animation when download completes
  useEffect(() => {
    if (!isExporting && showFullscreenAnimation) {
      completeDownloadAnimation();
      
      // Add a small delay before stopping animation to ensure smooth transition
      const timeout = setTimeout(() => {
        setAnimateButton(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [isExporting, animateButton, showFullscreenAnimation]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      const intervalId = sessionStorage.getItem('progressInterval');
      if (intervalId) clearInterval(Number(intervalId));
    };
  }, []);

  // Handle data download based on active dashboard - this function was missing
  const handleExportData = () => {
    console.log('Export Data clicked, dashboard type:', activeDashboard);
    console.log('Data to export:', activeDashboard === 'caller' ? excelData?.length : filteredCompanies?.length, 'records');
    
    if (activeDashboard === 'caller') {
      // For caller dashboard, use handleExportCallerData instead of handleDownloadExcel
      handleExportCallerData();
    } else {
      // For company dashboard, use filteredCompanies
      handleDownloadExcel(filteredCompanies);
    }
  };

  // Enhanced download function that ensures data availability
  const handleDownloadAllData = async () => {
    startDownloadAnimation(); // Start animation
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Directly fetch data from API to ensure we have the latest
      const response = await defaultInstance.get('/company-excel-uploads');
      const companies = response.data.data || [];
      
      if (!companies || companies.length === 0) {
        alert('No data available to download');
        setIsExporting(false);
        return;
      }
      
      console.log(`Fetched ${companies.length} companies for export`);
      
      // Define new headers based on the mapping requirement
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
        'Answered Calls',
        'No Answer Calls',
        'Busy Calls',
        'Call Date',
        'Call Duration'
      ];
      
      // Map data according to the specified field mapping
      const exportData = companies.map(company => {
        // Helper function to safely extract values with multiple possible field names
        const getValue = (possibleKeys, defaultValue = '') => {
          for (const key of possibleKeys) {
            if (company[key] !== undefined && company[key] !== null) {
              return company[key];
            }
          }
          return defaultValue;
        };
        
        return [
          // Company Name ← from → Buyer
          getValue(['buyer', 'Buyer']),
          
          // ID Code ← from → ID Number
          getValue(['idCode', 'id_code', 'idNumber', 'id_number']),
          
          // Contact Person #1 ← from → Contact Person #1
          getValue(['contact1', 'contact_1', 'contactPerson1', 'contact_person1']),
          
          // Phone #1 ← from → Phone #1
          getValue(['phone1', 'phone_1', 'tel1', 'tel_1']),
          
          // Contact Person #2 ← from → Contact Person #2
          getValue(['contact2', 'contact_2', 'contactPerson2', 'contact_person2']),
          
          // Phone #2 ← from → Phone #2
          getValue(['phone2', 'phone_2', 'tel2', 'tel_2']),
          
          // Contact Person #3 ← from → Contact Person #3
          getValue(['contact3', 'contact_3', 'contactPerson3', 'contact_person3']),
          
          // Phone #3 ← from → Phone #3
          getValue(['phone3', 'phone_3', 'tel3', 'tel_3']),
          
          // Caller Name ← from → Manager
          getValue(['manager', 'Manager']),
          
          // Caller Number ← from → Manager Number
          getValue(['managerNumber', 'manager_number']),
          
          // Empty columns for the rest
          '', // Receiver Name
          '', // Receiver Number
          '', // Call Count
          '', // Answered Calls
          '', // No Answer Calls
          '', // Busy Calls
          '', // Call Date
          ''  // Call Duration
        ];
      });
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      
      // Set column widths
      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? String(row[colIndex]).length : 0))
        );
        return { wch: maxLength + 2 }; // Add some padding
      });
      worksheet['!cols'] = colWidths;
      
      // Create workbook and append worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
      
      // Generate filename with current date
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${yyyy}`;
      const fileName = `company_data_${dateStr}.xlsx`;
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, fileName);
      console.log('Company data export successful with transformed mapping');
    } catch (err) {
      console.error('Error exporting company data:', err);
      setExportError('Failed to download data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // Enhanced function to handle caller data export with better data normalization
  const handleExportCallerData = () => {
    startDownloadAnimation();
    setIsExporting(true);
    setExportError(null);

    try {
      if (!excelData || excelData.length === 0) {
        alert('No caller data available to export');
        setIsExporting(false);
        return;
      }

      console.log(`Preparing to export ${excelData.length} caller records`);

      // Remove 'Call Status' from headers
      const headers = [
        'Company Name', 'ID Code', 'Contact Person #1', 'Phone #1',
        'Contact Person #2', 'Phone #2', 'Contact Person #3', 'Phone #3',
        'Caller Name', 'Caller Number', 'Receiver Name', 'Receiver Number',
        'Call Count', 'Answered Calls', 'No Answer Calls', 'Busy Calls',
        'Call Date', 'Call Duration'
      ];

      const safeExtract = (item, keys, defaultValue = '') => {
        if (!item) return defaultValue;
        for (const key of keys) {
          const value = item[key];
          if (value !== undefined && value !== null && value !== 'undefined') {
            if (typeof value === 'number') return value.toString();
            if (value === 0) return '0';
            if (Array.isArray(value)) return value.join(', ');
            if (typeof value === 'object' && value !== null) return JSON.stringify(value);
            if (value === true) return 'Yes';
            if (value === false) return 'No';
            return value.toString();
          }
        }
        return defaultValue;
      };

      const exportData = excelData.map((item) => [
        safeExtract(item, ['companyName', 'company_name']),
        safeExtract(item, ['identificationCode', 'identification_code', 'idCode', 'id_code', 'id']),
        safeExtract(item, ['contactPerson1', 'contact_person1']),
        safeExtract(item, ['tel1', 'phone1']),
        safeExtract(item, ['contactPerson2', 'contact_person2']),
        safeExtract(item, ['tel2', 'phone2']),
        safeExtract(item, ['contactPerson3', 'contact_person3']),
        safeExtract(item, ['tel3', 'phone3']),
        safeExtract(item, ['callerName', 'caller_name']),
        safeExtract(item, ['callerNumber', 'caller_number']),
        safeExtract(item, ['receiverName', 'receiver_name']),
        safeExtract(item, ['receiverNumber', 'receiver_number']),
        safeExtract(item, ['callCount', 'call_count'], '0'),
        safeExtract(item, ['answeredCalls', 'answered_calls'], '0'),
        safeExtract(item, ['noAnswerCalls', 'no_answer_calls'], '0'),
        safeExtract(item, ['busyCalls', 'busy_calls'], '0'),
        safeExtract(item, ['callDate', 'call_date']),
        safeExtract(item, ['callDuration', 'call_duration'])
        // Removed call status extraction
      ]);
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exportData]);
      
      // Set column widths
      const colWidths = headers.map((h, colIndex) => {
        const maxLength = Math.max(
          h.length,
          ...exportData.map(row => (row[colIndex] ? String(row[colIndex]).length : 0))
        );
        return { wch: maxLength + 2 }; // Add padding
      });
      worksheet['!cols'] = colWidths;
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Caller Data');
      
      // Generate filename
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const fileName = `caller_data_${dateStr}.xlsx`;
      
      // Write file and download
      XLSX.writeFile(workbook, fileName);
      console.log('Caller data export successful');
    } catch (err) {
      console.error('Error exporting caller data:', err);
      setExportError('Failed to export data: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // Simplified template download function
  const handleDownloadTemplate = () => {
    startDownloadAnimation(); // Start animation
    setIsExporting(true);
    setExportError(null);
    
    try {
      // Define the template headers based on the dashboard type
      const headerObj = {};
      
      if (activeDashboard === 'caller') {
        // Headers for caller dashboard template
        headerObj['Company Name'] = '';
        headerObj['ID Code'] = '';
        headerObj['Contact Person #1'] = '';
        headerObj['Phone #1'] = '';
        headerObj['Contact Person #2'] = '';
        headerObj['Phone #2'] = '';
        headerObj['Contact Person #3'] = '';
        headerObj['Phone #3'] = '';
        headerObj['Caller Name'] = '';
        headerObj['Caller Number'] = '';
        headerObj['Receiver Name'] = '';
        headerObj['Receiver Number'] = '';
        headerObj['Call Count'] = '';
        headerObj['Call Date'] = '';
        headerObj['Call Duration'] = '';
      } else {
        // Headers for company dashboard template (Georgian)
        headerObj['ტენდერის N'] = '';
        headerObj['შემსყიდველი'] = '';
        headerObj['საკ. პირი #1'] = '';
        headerObj['ტელ #1'] = '';
        headerObj['საკ. პირი #2'] = '';
        headerObj['ტელ #2'] = '';
        headerObj['საკ. პირი #3'] = '';
        headerObj['ტელ #3'] = '';
        headerObj['ელ-ფოსტა'] = '';
        headerObj['შემსრულებელი'] = '';
        headerObj['ს/კ -ID'] = '';
        headerObj['ხელშ. ღირებ.'] = '';
        headerObj['გორგიაში შესყ. ჯამურ. ღირ'] = '';
        headerObj['გორგიაში ბოლო შესყ. თარ.'] = '';
        headerObj['დაკონტ. საორ. თარიღი'] = '';
        headerObj['დაფუძ. თარიღი'] = '';
        headerObj['მენეჯერი'] = '';
        headerObj['მენეჯერის ნომერი'] = '';
        headerObj['სტატუსი'] = '';
      }
      
      // Create worksheet with empty rows
      const data = [headerObj, {}, {}, {}];  // Header row and 3 empty rows
      const worksheet = XLSX.utils.json_to_sheet(data, { header: Object.keys(headerObj) });
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      // Generate filename with current date
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Set filename based on dashboard type
      const fileName = activeDashboard === 'caller' 
        ? `caller_template_${dateStr}.xlsx` 
        : `company_template_${dateStr}.xlsx`;
      
      // Write to file and trigger download
      XLSX.writeFile(workbook, fileName);
      console.log(`${activeDashboard.charAt(0).toUpperCase() + activeDashboard.slice(1)} template download successful`);
    } catch (err) {
      console.error('Error creating template:', err);
      setExportError('Failed to create template: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // Use handleDownloadAllData for the main download button, 
  // and handleDownloadExcel for filtered data
  
  const [showTooltip, setShowTooltip] = useState(false);
  
  const renderDownloadButton = (onClick, isExporting, text, disabled = false) => {
    return (
      <button
        className={download_button.DownloadButton}
        onClick={onClick}
        disabled={disabled || isExporting}
        style={{
          ...buttonAnimationStyle,
          opacity: isExporting ? 0.9 : 1,
          background: isExporting ? '#0056b3' : '',
          transition: 'all 0.3s ease, opacity 0.5s ease, transform 0.3s ease',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="16"
          width="20"
          viewBox="0 0 640 512"
          style={{
            marginRight: '5px',
            transform: isExporting ? 'translateY(2px)' : '',
            transition: 'transform 0.3s ease',
          }}
        >
          <path
            d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
            fill="white"
          />
        </svg>
        <span style={{
          position: 'relative',
          display: 'inline-block',
          transition: 'all 0.3s ease',
        }}>
          {isExporting ? 'Exporting...' : text}
        </span>
        {animateButton && (
          <span 
            className="button-ripple-effect"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
            }} 
          />
        )}
      </button>
    );
  };

  return (
    <div className="buttons" style={{ marginBottom: '20px' }}>
      {/* Full-screen download animation overlay - enhanced with exit animation */}
      {showFullscreenAnimation && (
        <div 
          className={`download-animation-overlay ${animationState}`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}
        >
          {/* Canvas for confetti animation */}
          {showConfetti && (
            <canvas 
              ref={confettiRef} 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 10000
              }} 
            />
          )}
          
          {/* Download animation */}
          <div className="download-icon-container" style={{
            position: 'relative',
            width: '150px', // Increased from 120px to 150px
            height: '150px', // Increased from 120px to 150px
            marginBottom: '30px' // Increased from 20px to 30px
          }}>
            {/* Animated cloud with download arrow */}
            <div className="cloud-download-icon" style={{
              position: 'relative',
              width: '100%',
              height: '100%'
            }}>
              <div className="cloud-base" style={{
                position: 'absolute',
                width: '130px', // Increased from 100px to 130px
                height: '78px', // Increased from 60px to 78px
                backgroundColor: '#ffffff',
                borderRadius: '39px', // Increased from 30px to 39px
                top: '50px', // Adjusted from 40px to 50px
                left: '10px',
                boxShadow: '0 8px 25px rgba(0,0,0,0.4)', // Enhanced shadow
                animation: showConfetti ? 'none' : 'pulse 2s infinite'
              }}></div>
              <div className="cloud-top1" style={{
                position: 'absolute',
                width: '65px', // Increased from 50px to 65px
                height: '65px', // Increased from 50px to 65px
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                top: '30px', // Adjusted from 25px to 30px
                left: '30px', // Adjusted from 25px to 30px
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)', // Added shadow
              }}></div>
              <div className="cloud-top2" style={{
                position: 'absolute',
                width: '52px', // Increased from 40px to 52px
                height: '52px', // Increased from 40px to 52px
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                top: '25px', // Adjusted from 20px to 25px
                left: '75px', // Adjusted from 60px to 75px
                boxShadow: '0 5px 15px rgba(0,0,0,0.2)', // Added shadow
              }}></div>
              
              {/* Download arrow */}
              <div className="download-arrow" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '52px', // Increased from 40px to 52px
                height: '52px', // Increased from 40px to 52px
                animation: !showConfetti ? 'bounce 1.5s infinite' : 'none', // Added bounce animation
              }}>
                <div style={{
                  width: '10px', // Increased from 8px to 10px
                  height: '38px', // Increased from 30px to 38px
                  backgroundColor: showConfetti ? '#4CAF50' : '#2196F3',
                  margin: '0 auto',
                  transition: 'background-color 0.5s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // Added shadow
                }}></div>
                <div style={{
                  width: '0',
                  height: '0',
                  borderLeft: '16px solid transparent', // Increased from 12px to 16px
                  borderRight: '16px solid transparent', // Increased from 12px to 16px
                  borderTop: `20px solid ${showConfetti ? '#4CAF50' : '#2196F3'}`, // Increased from 16px to 20px
                  margin: '0 auto',
                  transition: 'border-top-color 0.5s ease',
                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))', // Added shadow
                }}></div>
              </div>
            </div>
            
            {/* Circles animation */}
            {!showConfetti && (
              <>
                <div className="circle-1" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '140%', // Increased from 100% to 140%
                  height: '140%', // Increased from 100% to 140%
                  border: '5px solid rgba(33, 150, 243, 0.3)', // Increased from 4px to 5px
                  borderRadius: '50%',
                  animation: 'ripple 2s linear infinite'
                }}></div>
                <div className="circle-2" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '120%', // Increased from 100% to 120%
                  height: '120%', // Increased from 100% to 120%
                  border: '5px solid rgba(33, 150, 243, 0.3)', // Increased from 4px to 5px
                  borderRadius: '50%',
                  animation: 'ripple 2s linear 0.5s infinite'
                }}></div>
                
                {/* Added third circle for more visual effect */}
                <div className="circle-3" style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '160%',
                  height: '160%',
                  border: '5px solid rgba(33, 150, 243, 0.2)',
                  borderRadius: '50%',
                  animation: 'ripple 2s linear 1s infinite'
                }}></div>
              </>
            )}
            
            {/* Success checkmark */}
            {showConfetti && (
              <div className="success-checkmark" style={{
                position: 'absolute',
                top: '-40px', // Adjusted from -30px to -40px
                right: '-40px', // Adjusted from -30px to -40px
                width: '80px', // Increased from 60px to 80px
                height: '80px', // Increased from 60px to 80px
                backgroundColor: '#4CAF50',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)', // Enhanced shadow
                animation: 'scaleIn 0.5s forwards, pulse 2s 0.5s infinite' // Added additional pulse effect
              }}>
                <div style={{
                  width: '40px', // Increased from 30px to 40px
                  height: '25px', // Increased from 20px to 25px
                  borderBottom: '7px solid white', // Increased from 5px to 7px
                  borderLeft: '7px solid white', // Increased from 5px to 7px
                  transform: 'rotate(-45deg) translate(2px, -5px)'
                }}></div>
              </div>
            )}
          </div>
          
          {/* Status text */}
          <h2 style={{
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            margin: '0',
            textAlign: 'center',
            fontWeight: 300,
            fontSize: '36px', // Increased from 28px to 36px
            textShadow: '0 2px 4px rgba(0,0,0,0.2)', // Added text shadow
            animation: 'fadeInUp 0.8s forwards' // Added animation
          }}>
            {showConfetti ? t('downloadComplete') : t('downloading')}
          </h2>
          
          {/* Progress bar */}
          {!showConfetti && (
            <div style={{
              width: '400px', // Increased from 300px to 400px
              height: '10px', // Increased from 8px to 10px
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              marginTop: '30px', // Increased from 20px to 30px
              borderRadius: '5px',
              overflow: 'hidden',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)' // Added shadow for depth
            }}>
              <div style={{
                height: '100%',
                backgroundColor: '#2196F3',
                width: `${downloadProgress}%`,
                borderRadius: '5px',
                transition: 'width 0.3s ease',
                background: 'linear-gradient(90deg, #2196F3, #64B5F6)', // Added gradient for more appeal
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.3)' // Inner highlight
              }}></div>
            </div>
          )}
          
          {/* Progress percentage */}
          {!showConfetti && (
            <div style={{
              color: '#ffffff',
              marginTop: '15px', // Increased from 10px to 15px
              fontSize: '20px', // Increased from 16px to 20px
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold', // Added bold for better visibility
              textShadow: '0 1px 2px rgba(0,0,0,0.3)' // Added text shadow
            }}>
              {Math.round(downloadProgress)}%
            </div>
          )}
          
          {/* Completion message */}
          {showConfetti && (
            <p style={{
              color: '#ffffff',
              marginTop: '20px', // Increased from 15px to 20px
              fontSize: '18px', // Increased from 16px to 18px
              maxWidth: '500px', // Increased from 400px to 500px
              textAlign: 'center',
              animation: 'fadeInUp 0.8s 0.3s forwards', // Added delay to sequence animations
              opacity: 0,
              lineHeight: '1.5', // Added line height for readability
              textShadow: '0 1px 2px rgba(0,0,0,0.3)', // Added text shadow
              padding: '0 20px' // Added padding for mobile devices
            }}>
              {t('downloadSuccessMessage')}
            </p>
          )}
        </div>
      )}

      {activeDashboard === 'company' && !isDepartamentCraftsmen && (
        <div className="fade-in" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="create">
            <button className={styles.button} onClick={handleOpenModal}>
              <span className={styles.text}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M0 0h24v24H0z" fill="none"></path>
                  <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z" fill="currentColor"></path>
                </svg>
                Create
              </span>
            </button>
          </div>
          <UploadCompanyExcel onPreviewSuccess={onCompanyUploadSuccess} />
          <div style={tooltipStyle.container}
               onMouseEnter={() => setShowTooltip(true)}
               onMouseLeave={() => setShowTooltip(false)}>
            <button
              className={download_button.DownloadButton}
              onClick={handleDownloadAllData}
              disabled={isExporting}
              style={{
                ...buttonAnimationStyle,
                opacity: isExporting ? 0.9 : 1,
                background: isExporting ? '#0056b3' : '',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="16"
                width="20"
                viewBox="0 0 640 512"
                style={{
                  marginRight: '5px',
                  transform: isExporting ? 'translateY(2px)' : '',
                  transition: 'transform 0.3s ease',
                }}
              >
                <path
                  d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                  fill="white"
                />
              </svg>
              <span style={{
                position: 'relative',
                display: 'inline-block',
                transition: 'all 0.3s ease',
              }}>
                {isExporting ? 'Downloading...' : 'Download'}
              </span>
              {animateButton && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  animation: 'ripple 0.6s linear',
                }} />
              )}
            </button>
            <div
              style={{
                ...tooltipStyle.tooltip,
                ...(showTooltip ? tooltipStyle.tooltipVisible : {})
              }}
            >
              {t('exportCallInformation')}
              <div style={tooltipStyle.arrow}></div>
            </div>
          </div>

          <FilterForm
            onlyButton={true}
            onToggleFilters={() => setShowFilters(!showFilters)}
            dashboardType="company"
            onDownloadFiltered={handleDownloadExcel} // Pass download function
          />
          
          {exportError && <div style={{ color: 'red', marginLeft: '10px' }}>{exportError}</div>}
        </div>
      )}
      {activeDashboard === 'caller' && (
        <div className="caller-dashboard fade-in" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <UploadExcel
            onUploadSuccess={onUploadSuccess}
            excelData={excelData}
          />
          <div style={tooltipStyle.container}
               onMouseEnter={() => setShowTooltip(true)}
               onMouseLeave={() => setShowTooltip(false)}>
            {renderDownloadButton(
              handleExportCallerData, 
              isExporting, 
              'Export Data', 
              !excelData || excelData.length === 0
            )}
            <div
              style={{
                ...tooltipStyle.tooltip,
                ...(showTooltip ? tooltipStyle.tooltipVisible : {})
              }}
            >
              {t('exportCallInformation')}
              <div style={tooltipStyle.arrow}></div>
            </div>
          </div>
          <FilterForm
            onlyButton={true}
            onToggleFilters={() => setShowFilters(!showFilters)}
            dashboardType="caller"
            onDownloadFiltered={handleDownloadExcel} // Pass download function
          />
          {exportError && <div style={{ color: 'red', marginLeft: '10px' }}>{exportError}</div>}
        </div>
      )}
      <style jsx="true">{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .download-animation-overlay {
          transition: opacity 0.8s ease;
        }
        
        .download-animation-overlay.entering {
          animation: fadeIn 0.6s forwards;
        }
        
        .download-animation-overlay.exiting {
          animation: fadeOut 0.8s forwards;
        }
        
        @keyframes ripple {
          0% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(0.6);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes rippleEffect {
          0% {
            transform: scale(0.7);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .button-ripple-effect {
          animation: rippleEffect 1.2s ease-out;
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translate(-50%, -50%);
          }
          50% {
            transform: translate(-50%, -40%);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ButtonsPanel;
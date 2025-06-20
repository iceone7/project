import { useState, useEffect, useRef } from 'react';
import button_comments from '../assets/css/button_comments.module.css';
import paginationStyles from '../assets/css/pagination.module.css';
import defaultInstance from '../api/defaultInstance';
import { useLanguage } from '../assets/i18n/LanguageContext';

const Worker = () => {
  const isDepartamentCraftsmen = localStorage.getItem('department_id') === '2' || 
                               localStorage.getItem('role') === 'super_admin'; // Allow super_admin to see data

  const [calls, setCalls] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);
  const [animatePage, setAnimatePage] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [loadError, setLoadError] = useState(null); // Add error state
  const paginationRef = useRef(null);
  const { t } = useLanguage();
  const recordingsBaseUrl = import.meta.env.VITE_RECORDINGS_URL;
  const itemsPerPage = 15;

  useEffect(() => {
    console.log('Worker component mounted');
    return () => console.log('Worker component unmounted');
  }, []);

  useEffect(() => {
    // Always try to fetch data, but handle permissions in the UI
    setIsLoading(true);
    setLoadError(null);
    
    // Log the current department setting
    console.log(`Fetching CDR data, department status: ${isDepartamentCraftsmen ? 'Craftsmen' : 'Not Craftsmen'}`);
    
    defaultInstance.get(`/cdr`)
      .then(response => {
        console.log(`CDR data fetched successfully, ${response.data.length} records`);
        setCalls(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching calls:', error);
        setLoadError(error.message || 'Failed to load data');
        setIsLoading(false);
      });
  }, [isDepartamentCraftsmen]); // Re-fetch if department changes

  useEffect(() => {
    const totalItems = calls?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    setPagesCount(totalPages);
    setCurrentPage(1);
  }, [calls]);

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

  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data?.slice(startIndex, endIndex) || [];
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

  const handleAudioError = (e, recordingfile) => {
    console.error('Audio error for file:', recordingfile, e);
  };

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

  const paginatedCalls = getPaginatedData(calls);

  // Enhanced rendering with loading state
  return (
    <div className="ecommerce-widget">
      <div className="row">
        <div className="col-12">
          <div key={`worker-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
            <div className="card">
              <h5 className="card-header">
                Craftsmen Companies
                {isLoading && <span className="spinner-border spinner-border-sm ms-2" role="status"></span>}
              </h5>
              <div className="card-body p-0">
                {isLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading call data...</p>
                  </div>
                ) : loadError ? (
                  <div className="text-center py-5 text-danger">
                    <p>Error: {loadError}</p>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => window.location.reload()}>
                      Retry
                    </button>
                  </div>
                ) : !isDepartamentCraftsmen ? (
                  <div className="text-center py-5">
                    <p>You don't have permission to view this content.</p>
                  </div>
                ) : (
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
                    <Pagination
                      currentPage={currentPage}
                      totalPages={pagesCount}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Worker;
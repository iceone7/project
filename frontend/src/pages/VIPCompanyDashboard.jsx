import { useState, useEffect } from 'react';
import edit_delete from '../assets/css/edit_detele.module.css';
import button_comments from '../assets/css/button_comments.module.css';
import paginationStyles from '../assets/css/pagination.module.css';
import EditModal from '../assets/components/EditModal';
import CompanyCommentsModal from '../assets/components/CompanyCommentsModal';
import { useLanguage } from '../assets/i18n/LanguageContext';

const isSuperAdmin = localStorage.getItem('role') === 'super_admin';
const isAdmin = isSuperAdmin || localStorage.getItem('role') === 'admin';
const isDepartamentVip = localStorage.getItem('department_id') === '1';

const VIPCompanyDashboard = ({ filteredCompanies, handleDeleteCompany, handleEdit }) => {
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompanyCommentsModal, setShowCompanyCommentsModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCount, setPagesCount] = useState(1);
  const [animatePage, setAnimatePage] = useState(false);
  const { t } = useLanguage();
  const itemsPerPage = 15;

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

  const openCompanyCommentsModal = (company) => {
    setSelectedCompanyId(company.id);
    setSelectedCompanyName(company.buyer || company.executor || `Company #${company.id}`);
    setShowCompanyCommentsModal(true);
  };

  const closeCompanyCommentsModal = () => {
    setShowCompanyCommentsModal(false);
    setSelectedCompanyId(null);
    setSelectedCompanyName('');
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

  const getPaginatedData = (data) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data?.slice(startIndex, endIndex) || [];
  };

  useEffect(() => {
    const totalItems = filteredCompanies?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    setPagesCount(totalPages);
    setCurrentPage(1);
  }, [filteredCompanies]);

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
      <nav className={paginationStyles.paginationContainer}>
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

  const paginatedData = getPaginatedData(filteredCompanies);

  return (
    isDepartamentVip && (
      <div className="ecommerce-widget">
        <div className="row">
          <div className="col-12">
            <div key={`company-${currentPage}`} className={`animated-section ${animatePage ? paginationStyles.fadeIn : 'fade-in'}`}>
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
                                <button
                                  onClick={() => openCompanyCommentsModal(company)}
                                  className={button_comments.commentButton}
                                  title={t('companyComments')}
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
        <EditModal
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSave={saveEdit}
          editData={editRowData}
        />
        {showCompanyCommentsModal && (
          <CompanyCommentsModal
            isOpen={showCompanyCommentsModal}
            onClose={closeCompanyCommentsModal}
            companyId={selectedCompanyId}
            companyName={selectedCompanyName}
          />
        )}
      </div>
    )
  );
};

export default VIPCompanyDashboard;
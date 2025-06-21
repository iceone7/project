import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from './Header';
import AddCallerModal from './AddCallerModal';
import AddCompanyModal from './AddCompanyModal';

const DashboardContent = ({
  activeDashboard,
  handleOpenModal,
  setExcelData,
  showCallerModal,
  showCompanyModal,
  handleAddCaller,
  handleAddCompany,
  editingItem,
  editMode,
  setShowCallerModal,
  setShowCompanyModal,
  companies = [],
  handleDeleteCompany,
  handleEdit,
  edit_delete,
  companyDetails, 
}) => {
  const fetchCallerData = async () => {
    try {
      const response = await axios.get('/api/get-imported-companies');
      const normalizedData = response.data.data.map((item) => ({
        id: item.id,
        companyName: item.company_name || '',
        identificationCode: item.identification_code || '',
        contactPerson1: item.contact_person1 || '',
        tel1: item.tel1 || '',
        contactPerson2: item.contact_person2 || '',
        tel2: item.tel2 || '',
        contactPerson3: item.contact_person3 || '',
        tel3: item.tel3 || '',
        callerName: item.caller_name || '',
        callerNumber: item.caller_number || '',
        receiverName: item.receiver_name || '',
        receiverNumber: item.receiver_number || '',
        callCount: item.call_count || 0,
        callDate: item.call_date || '',
        callDuration: item.call_duration || '',
        callStatus: item.call_status || '',
      }));
      
      console.log('Fetched and normalized caller data:', normalizedData);
      return normalizedData;
    } catch (error) {
      console.error('Error fetching caller data:', error);
      return [];
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-ecommerce">
        <div className="container-fluid dashboard-content">
          <div className="row">
            <div className="col-12">
              <Header
                activeDashboard={activeDashboard}
                handleOpenModal={handleOpenModal}
                setExcelData={setExcelData}
              />

              {showCallerModal && (
                <AddCallerModal
                  onClose={() => setShowCallerModal(false)}
                  onSave={handleAddCaller}
                  editingItem={editingItem}
                  editMode={editMode}
                />
              )}

              {showCompanyModal && (
                <AddCompanyModal
                  onClose={() => setShowCompanyModal(false)}
                  onSave={handleAddCompany}
                  editingItem={editingItem}
                  editMode={editMode}
                />
              )}

              <div key={activeDashboard} className="animated-section fade-in">
                <div className="card">
                  <h5 className="card-header">Recent Orders</h5>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table">
                        <thead className="bg-light">
                          {activeDashboard === 'caller' ? (
                            <tr className="border-0">
                              <th>#</th>
                              <th>Company Name</th>
                              <th>Identification Code or ID</th>
                              <th>Contact Person #1</th>
                              <th>Tel</th>
                              <th>Contact Person #2</th>
                              <th>Tel</th>
                              <th>Contact Person #3</th>
                              <th>Tel</th>
                              <th>Caller Name</th>
                              <th>Caller Number</th>
                              <th>Receiver Name</th>
                              <th>Receiver Number</th>
                              <th>Call Count</th>
                              <th>Call Date</th>
                              <th>Call Duration</th>
                              <th>Call Status</th>
                              <th>Call count</th>
                            </tr>
                          ) : (
                            <tr className="border-0">
                              <th>#</th>
                              <th>ტენდერის N</th>
                              <th>შემსყიდველი</th>
                              <th>საკ. პირი #1</th>
                              <th>ტელ</th>
                              <th>საკ.პირი #2</th>
                              <th>ტელ</th>
                              <th>ელ-ფოსტა</th>
                              <th>შემსრულებელი</th>
                              <th>ს/კ -ID</th>
                              <th>ხელშ. ღირებ.</th>
                              <th>გორგიაში შესყ. ჯამურ. ღირ</th>
                              <th>გორგიაში ბოლო შესყ. თარ.</th>
                              <th>დაკონტ. საორ. თარიღი</th>
                              <th>დაფუძ. თარიღი</th>
                              <th>მენეჯერი</th>
                              <th>სტატუსი</th>
                              <th>Edit / Delete / Comment</th>
                            </tr>
                          )}
                        </thead>

                        <tbody>
                          {activeDashboard === 'caller' ? (
                            companyDetails.length > 0 ? (
                              companyDetails.map((call, index) => (
                                <tr key={index}>
                                  <td>{index + 1}</td>
                                  <td>{call.company_name}</td>
                                  <td>{call.identification_code || call.id}</td>
                                  <td>{call.contact_person1}</td>
                                  <td>{call.tel1}</td>
                                  <td>{call.contact_person2}</td>
                                  <td>{call.tel2}</td>
                                  <td>{call.contact_person3}</td>
                                  <td>{call.tel3}</td>
                                  <td>{call.caller_name}</td>
                                  <td>{call.caller_number}</td>
                                  <td>{call.receiver_name}</td>
                                  <td>{call.receiver_number}</td>
                                  <td>{call.call_count}</td>
                                  <td>{call.call_date}</td>
                                  <td>{call.call_duration}</td>
                                  <td>{call.call_status}</td>
                                  <td>{call.unique_calls}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="18" className="text-center">Нет данных</td>
                              </tr>
                            )
                          ) : (
                            companies.map((company, index) => (
                              <tr key={company.id || index}>
                                <td>{index + 1}</td>
                                <td>{company.tenderNumber || 'N/A'}</td>
                                <td>{company.buyer || 'N/A'}</td>
                                <td>{company.contact1 || 'N/A'}</td>
                                <td>{company.phone1 || 'N/A'}</td>
                                <td>{company.contact2 || 'N/A'}</td>
                                <td>{company.phone2 || 'N/A'}</td>
                                <td>{company.email || 'N/A'}</td>
                                <td>{company.executor || 'N/A'}</td>
                                <td>{company.idCode || 'N/A'}</td>
                                <td>{company.contractValue || 'N/A'}</td>
                                <td>{company.totalValueGorgia || 'N/A'}</td>
                                <td>{company.lastPurchaseDateGorgia || 'N/A'}</td>
                                <td>{company.contractEndDate || 'N/A'}</td>
                                <td>{company.foundationDate || 'N/A'}</td>
                                <td>{company.manager || 'N/A'}</td>
                                <td>{company.status || 'N/A'}</td>
                                <td className={edit_delete?.editdelete}>                                
                                  <button 
                                    onClick={() => handleDeleteCompany(company.id)} 
                                    className={edit_delete?.deletebutton}
                                  >
                                    <svg className={edit_delete?.deletesvgIcon} viewBox="0 0 448 512">
                                      <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>
                                    </svg>
                                  </button>
                                  <button onClick={() => handleEdit(company)} className={edit_delete?.editbutton}>
                                    <svg className={edit_delete?.editsvgIcon} viewBox="0 0 512 512">
                                      <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231z"/>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))
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
      </div>
    </div>
  );
};

export default DashboardContent;

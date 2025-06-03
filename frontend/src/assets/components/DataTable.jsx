import { useState } from 'react';
import edit_delete from '../css/edit_detele.module.css';
import EditModal from './EditModal';

const isAdmin = localStorage.getItem('role') === 'super_admin' || localStorage.getItem('role') === 'admin';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit }) => {
  const [editRowId, setEditRowId] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  const startEdit = (row) => {
    // Always use the real DB id if available
    setEditRowId(row.id);
    setEditRowData({ ...row, id: row.id }); // Ensure id is present
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditRowId(null);
    setEditRowData({});
  };

  const saveEdit = async (updatedData) => {
    try {
      // Always pass the id to handleEdit
      await handleEdit({ ...updatedData, id: editRowId });
      setShowEditModal(false);
      setEditRowId(null);
      setEditRowData({});
    } catch (err) {
      alert('Failed to update company: ' + (err?.response?.data?.error || err.message));
    }
  };

  const dataToDisplay = activeDashboard === 'caller' ? excelData : filteredCompanies;

  return (
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
                          <th>Receiver Number</th>
                          <th>Call Count</th>
                          <th>Call Date</th>
                          <th>Call Duration</th>
                          <th>Call Status</th>
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
                          <th>Edit / Delete</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {activeDashboard === 'caller' ? (
                        dataToDisplay.length > 0 ? (
                          dataToDisplay.map((call, index) => (
                            <tr key={call.id || index}>
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
                              <td>{call.receiverNumber || call.receiver_number || 'N/A'}</td>
                              <td>{call.callCount || call.call_count || '0'}</td>
                              <td>{call.callDate || call.call_date || 'N/A'}</td>
                              <td>{call.callDuration || call.call_duration || 'N/A'}</td>
                              <td>{call.callStatus || call.call_status || 'N/A'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="16">No data available</td>
                          </tr>
                        )
                      ) : (
                        dataToDisplay.length > 0 ? (
                          dataToDisplay.map((company, index) => (
                            <tr key={company.id || index}>
                              <td>{index + 1}</td>
                              <td>{company.tenderNumber || company.tender_number || 'N/A'}</td>
                              <td>{company.buyer || 'N/A'}</td>
                              <td>{company.contact1 || company.contact_1 || 'N/A'}</td>
                              <td>{company.phone1 || company.phone_1 || 'N/A'}</td>
                              <td>{company.contact2 || company.contact_2 || 'N/A'}</td>
                              <td>{company.phone2 || company.phone_2 || 'N/A'}</td>
                              <td>{company.email || 'N/A'}</td>
                              <td>{company.executor || 'N/A'}</td>
                              <td>{company.idCode || company.id_code || 'N/A'}</td>
                              <td>{company.contractValue || company.contract_value || 'N/A'}</td>
                              <td>{company.totalValueGorgia || company.total_value_gorgia || 'N/A'}</td>
                              <td>{company.lastPurchaseDateGorgia || company.last_purchase_date_gorgia || 'N/A'}</td>
                              <td>{company.contractEndDate || company.contract_end_date || 'N/A'}</td>
                              <td>{company.foundationDate || company.foundation_date || 'N/A'}</td>
                              <td>{company.manager || 'N/A'}</td>
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
                            <td colSpan="18">No data available</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
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
    </div>
  );
};

export default DataTable;
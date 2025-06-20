import Worker from '../../pages/Worker';
import VIPCompanyDashboard from '../../pages/VIPCompanyDashboard';
import VIPCallerDashboard from '../../pages/VIPCallerDashboard';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit, handleCallerUploadSuccess }) => {
  return (
    <>
      {activeDashboard === 'worker' && <Worker />}
      {activeDashboard === 'company' && (
        <VIPCompanyDashboard
          filteredCompanies={filteredCompanies}
          handleDeleteCompany={handleDeleteCompany}
          handleEdit={handleEdit}
        />
      )}
      {activeDashboard === 'caller' && (
        <VIPCallerDashboard
          excelData={excelData}
          handleCallerUploadSuccess={handleCallerUploadSuccess}
        />
      )}
    </>
  );
};

export default DataTable;
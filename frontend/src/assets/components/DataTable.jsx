import Worker from '../../pages/Worker';
import VIPCompanyDashboard from '../../pages/VIPCompanyDashboard';
import VIPCallerDashboard from '../../pages/VIPCallerDashboard';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit, handleCallerUploadSuccess }) => {
  return (
    <>
      {activeDashboard === 'worker' && (
        <Worker key={`worker-dashboard-${Date.now()}`} />
      )}
      {activeDashboard === 'company' && (
        <VIPCompanyDashboard
          key={`company-dashboard-${Date.now()}`}
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
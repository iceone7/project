import { useEffect } from 'react';
import Worker from '../../pages/Worker';
import VIPCompanyDashboard from '../../pages/VIPCompanyDashboard';
import VIPCallerDashboard from '../../pages/VIPCallerDashboard';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit, handleCallerUploadSuccess }) => {
  useEffect(() => {
    console.log(`DataTable activeDashboard changed to: ${activeDashboard}`);
  }, [activeDashboard]);

  return (
    <>
      {activeDashboard === 'worker' && <Worker key={`worker-dash-${Date.now()}`} />}
      {activeDashboard === 'company' && (
        <VIPCompanyDashboard
          key={`company-dash-${Date.now()}`}
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
import { useEffect } from 'react';
import Worker from '../../pages/Worker';
import VIPCompanyDashboard from '../../pages/VIPCompanyDashboard';
import VIPCallerDashboard from '../../pages/VIPCallerDashboard';

const DataTable = ({ activeDashboard, excelData, filteredCompanies, handleDeleteCompany, handleEdit, handleCallerUploadSuccess }) => {
  // Log when activeDashboard changes to help debug
  useEffect(() => {
    console.log(`DataTable activeDashboard changed to: ${activeDashboard}`);
  }, [activeDashboard]);

  // Force remount of child components by adding activeDashboard to the key
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
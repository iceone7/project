import styles from '../css/CreateButton.module.css';
import download_button from '../css/UploadButton.module.css';
import FilterForm from './FilterForm';
import UploadExcel from './UploadExcel';
import UploadCompanyExcel from './UploadCompanyExcel';

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
  // companyExcelData,
  // setCompanyExcelData,
}) => {
  return (
    <div className="buttons" style={{ marginBottom: '20px' }}>
      {activeDashboard === 'company' && (
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
          <button
            className={download_button.DownloadButton}
            onClick={handleDownloadExcel}
            disabled={!filteredCompanies?.length}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="16"
              width="20"
              viewBox="0 0 640 512"
            >
              <path
                d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z"
                fill="white"
              />
            </svg>
            Download
          </button>
          <FilterForm
            onlyButton={true}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
          <UploadCompanyExcel onPreviewSuccess={onCompanyUploadSuccess} />
        </div>
      )}
      {activeDashboard === 'caller' && (
        <div className="caller-dashboard fade-in">
          <UploadExcel onUploadSuccess={onUploadSuccess} excelData={excelData} />
        </div>
      )}
    </div>
  );
};

export default ButtonsPanel;
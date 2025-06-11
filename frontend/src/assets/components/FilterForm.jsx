import { useState, useEffect } from 'react';
import filterStyles from '../css/FilterModal.module.css';
import styles from '../css/UploadButton.module.css';
import { useLanguage } from '../i18n/LanguageContext';

const initialFilters = {
  companyName: '',
  identificationCode: '',
  contactPerson1: '',
  tel1: '',
  contactPerson2: '',
  tel2: '',
  contactPerson3: '',
  tel3: '',
  callerName: '',
  callerNumber: '',
  receiverNumber: '',
  callCountMin: '',
  callCountMax: '',
  callDateStart: '',
  callDateEnd: '',
  callStatus: '',
  tenderNumber: '',
  buyer: '',
  contact1: '',
  phone1: '',
  contact2: '',
  phone2: '',
  contact3: '',
  phone3: '',
  email: '',
  executor: '',
  idCode: '',
  contractValueMin: '',
  contractValueMax: '',
  totalValueGorgiaMin: '',
  totalValueGorgiaMax: '',
  lastPurchaseDateStart: '',
  lastPurchaseDateEnd: '',
  contractEndDateStart: '',
  contractEndDateEnd: '',
  foundationDateStart: '',
  foundationDateEnd: '',
  manager: '',
  managerNumber: '', // Added manager number for company dashboard
  status: '',
  src: '', // A ნომერი (Caller Number for craftsmen)
  dst: '', // B ნომერი (Receiver Number for craftsmen)
  callDate: '', // თარიღი (Call Date for craftsmen)
  duration: '', // საუბრის დრო (Call Duration for craftsmen)
};

const FilterForm = ({
  data,
  onFilterApply,
  showFilters,
  onToggleFilters,
  onlyButton = false,
  onlyForm = false,
  dashboardType = 'caller',
  onDownloadFiltered, // Add new prop for download function
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const {t} = useLanguage();
  

  useEffect(() => {
    if (isInitialLoad && data && data.length > 0) {
      setIsInitialLoad(false);
      onFilterApply(data); // Apply initial data
    }
  }, [data, isInitialLoad, onFilterApply]);

  const getFilteredData = () => {
    const dataArr = Array.isArray(data) ? data : [];
    return applyFilters(dataArr);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const matchesText = (field, filter) => {
    if (!filter) return true;
    if (field == null) return false;
    return String(field).toLowerCase().includes(filter.toLowerCase().trim());
  };

  const matchesNumberRange = (value, min, max) => {
    if (value == null || value === '') return true;
    const numValue = Number(value);
    const numMin = min !== '' ? Number(min) : null;
    const numMax = max !== '' ? Number(max) : null;
    
    if (isNaN(numValue)) return false;
    if (numMin !== null && numValue < numMin) return false;
    if (numMax !== null && numValue > numMax) return false;
    return true;
  };

  const matchesDateRange = (date, start, end) => {
    if (!date) return true;
    let dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;
    
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    if (startDate && dateObj < startDate) return false;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (dateObj > endOfDay) return false;
    }
    return true;
  };

  const matchesStatus = (status, filter) => {
    if (!filter) return true;
    if (!status) return false;
    return String(status).toLowerCase().trim() === filter.toLowerCase().trim();
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  };

  const applyFilters = (dataArr) => {
    if (!Array.isArray(dataArr)) {
      console.log('applyFilters: dataArr is not an array', dataArr);
      return [];
    }
    const filtered = dataArr.filter((row) => {
      try {
        if (dashboardType === 'caller') {
          return (
            matchesText(row.companyName || row.company_name, filters.companyName) &&
            matchesText(row.identificationCode || row.identification_code, filters.identificationCode) &&
            matchesText(row.contactPerson1 || row.contact_person1, filters.contactPerson1) &&
            matchesText(row.tel1 || row.contactTel1 || row.tel || row.contact_tel1, filters.tel1) &&
            matchesText(row.contactPerson2 || row.contact_person2, filters.contactPerson2) &&
            matchesText(row.tel2 || row.contactTel2 || row.tel_2 || row.contact_tel2, filters.tel2) &&
            matchesText(row.contactPerson3 || row.contact_person3, filters.contactPerson3) &&
            matchesText(row.tel3 || row.contactTel3 || row.tel_3 || row.contact_tel3, filters.tel3) &&
            matchesText(row.callerName || row.caller_name, filters.callerName) &&
            matchesText(row.callerNumber || row.caller_number, filters.callerNumber) &&
            matchesText(row.receiverNumber || row.receiver_number, filters.receiverNumber) &&
            matchesNumberRange(row.callCount || row.call_count, filters.callCountMin, filters.callCountMax) &&
            matchesDateRange(row.callDate || row.call_date, filters.callDateStart, filters.callDateEnd) &&
            matchesStatus(row.callStatus || row.call_status, filters.callStatus)
          );
        } else if (dashboardType === 'company') {
          return (
            matchesText(row.tenderNumber || row.tender_number, filters.tenderNumber) &&
            matchesText(row.buyer, filters.buyer) &&
            matchesText(row.contact1, filters.contact1) &&
            matchesText(row.phone1, filters.phone1) &&
            matchesText(row.contact2, filters.contact2) &&
            matchesText(row.phone2, filters.phone2) &&
            matchesText(row.contact3, filters.contact3) &&
            matchesText(row.phone3, filters.phone3) &&
            matchesText(row.email, filters.email) &&
            matchesText(row.executor, filters.executor) &&
            matchesText(row.idCode || row.id_code, filters.idCode) &&
            matchesNumberRange(row.contractValue || row.contract_value, filters.contractValueMin, filters.contractValueMax) &&
            matchesNumberRange(row.totalValueGorgia || row.total_value_gorgia, filters.totalValueGorgiaMin, filters.totalValueGorgiaMax) &&
            matchesDateRange(row.lastPurchaseDateGorgia || row.last_purchase_date_gorgia, filters.lastPurchaseDateStart, filters.lastPurchaseDateEnd) &&
            matchesDateRange(row.contractEndDate || row.contract_end_date, filters.contractEndDateStart, filters.contractEndDateEnd) &&
            matchesDateRange(row.foundationDate || row.foundation_date, filters.foundationDateStart, filters.foundationDateEnd) &&
            matchesText(row.manager, filters.manager) &&
             matchesText(row.manager, filters.managerNumber) &&
            matchesStatus(row.status, filters.status)
          );
        } else if (dashboardType === 'craftsmen') {
          return (
            matchesText(row.src, filters.src) &&
            matchesText(row.dst, filters.dst) &&
            matchesText(row.calldate, filters.callDate) &&
            (filters.duration === '' || (row.duration && formatDuration(Number(row.duration)).includes(filters.duration)))
          );
        }
        return true;
      } catch (err) {
        console.error('Filter error for row:', row, err);
        return false;
      }
    });
    console.log('Filtered data:', filtered);
    return filtered;
  };

  const handleApplyFilters = () => {
    const filteredData = getFilteredData();
    console.log('Filtered data:', filteredData);
    onFilterApply(filteredData);
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
    onFilterApply(Array.isArray(data) ? data : []);
  };

  const handleDownloadFiltered = () => {
    const filteredData = getFilteredData();
    if (filteredData.length > 0) {
      onDownloadFiltered(filteredData);
    } else {
      alert('No data to download after filtering');
    }
  };

  if (onlyButton) {
    return (
      <button
        title="Filter"
        className={styles.filter}
        onClick={onToggleFilters}
      >
        <svg viewBox="0 0 512 512" height="1em">
          <path d="M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z" />
        </svg>
      </button>
    );
  }

  if (onlyForm) {
    if (!showFilters) return null;
    return (
      <div className={filterStyles.filterContainer} style={{ marginBottom: '20px' }}>
        <h3 className={filterStyles.filterTitle}>
          {dashboardType === 'caller' ?  t('callFilter') : dashboardType === 'craftsmen' ? t('craftsmanFilter') : t('companyFilter')}
        </h3>
        <div className={filterStyles.filterGrid}>
          {dashboardType === 'caller' ? (
            <>
              <input
                type="text"
                name="companyName"
                placeholder={t('companyName')}
                value={filters.companyName}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="identificationCode"
                placeholder={t('identificationCode')}
                value={filters.identificationCode}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contactPerson1"
                placeholder={t('contactPerson1')}
                value={filters.contactPerson1}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="tel1"
                placeholder={t('phone1')}
                value={filters.tel1}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contactPerson2"
                placeholder={t('contactPerson2')}
                value={filters.contactPerson2}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="tel2"
                placeholder={t('phone2')}
                value={filters.tel2}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contactPerson3"
                placeholder={t('contactPerson3')}
                value={filters.contactPerson3}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="tel3"
                placeholder={t('phone3')}
                value={filters.tel3}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="callerName"
                placeholder={t('callerName')}
                value={filters.callerName}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="callerNumber"
                placeholder={t('callerNumber')}
                value={filters.callerNumber}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="receiverNumber"
                placeholder={t('receiverNumber')}
                value={filters.receiverNumber}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <div className={filterStyles.inputGroup}>
                <input
                  type="number"
                  name="callCountMin"
                  placeholder={t('callCountMin')}
                  value={filters.callCountMin}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="number"
                  name="callCountMax"
                  placeholder={t('callCountMax')}
                  value={filters.callCountMax}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>
              <div className={filterStyles.inputGroup}>
                <input
                  type="date"
                  name="callDateStart"
                  placeholder={t('callDateStart')}
                  value={filters.callDateStart}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="date"
                  name="callDateEnd"
                  placeholder={t('callDateEnd')}
                  value={filters.callDateEnd}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>
              <select
                name="callStatus"
                value={filters.callStatus}
                onChange={handleFilterChange}
                className={filterStyles.select}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="answered">{t('answered')}</option>
                <option value="no answer">{t('noAnswer')}</option>
                <option value="busy">{t('busy')}</option>
                <option value="failed">{t('failed')}</option>
              </select>
            </>
          ) : dashboardType === 'company' ? (
            <>
              <input
                type="text"
                name="tenderNumber"
                placeholder={t('tenderNumber')}
                value={filters.tenderNumber}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="buyer"
                placeholder={t('buyer')}
                value={filters.buyer}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contact1"
                placeholder={t('contactPerson1')}
                value={filters.contact1}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="phone1"
                placeholder={t('phone1')}
                value={filters.phone1}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contact2"
                placeholder={t('contactPerson2')}
                value={filters.contact2}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="phone2"
                placeholder={t('phone2')}
                value={filters.phone2}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="contact3"
                placeholder={t('contactPerson3')}
                value={filters.contact3}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="phone3"
                placeholder={t('phone3')}
                value={filters.phone3}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="email"
                placeholder={t('email')}
                value={filters.email}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="executor"
                placeholder={t('executor')}
                value={filters.executor}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="idCode"
                placeholder={t('idCode')}
                value={filters.idCode}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />

              <div className={filterStyles.inputGroup}>
                <input
                  type="number"
                  name="contractValueMin"
                  placeholder={t('contractValueMin')}
                  value={filters.contractValueMin}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="number"
                  name="contractValueMax"
                  placeholder={t('contractValueMax')}
                  value={filters.contractValueMax}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>

              <div className={filterStyles.inputGroup}>
                <input
                  type="number"
                  name="totalValueGorgiaMin"
                  placeholder={t('totalValueGorgiaMin')}
                  value={filters.totalValueGorgiaMin}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="number"
                  name="totalValueGorgiaMax"
                  placeholder={t('totalValueGorgiaMax')}
                  value={filters.totalValueGorgiaMax}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>

              <div className={filterStyles.inputGroup}>
                <input
                  type="date"
                  name="lastPurchaseDateStart"
                  placeholder={t('lastPurchaseDateStart')}
                  value={filters.lastPurchaseDateStart}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="date"
                  name="lastPurchaseDateEnd"
                  placeholder={t('lastPurchaseDateEnd')}
                  value={filters.lastPurchaseDateEnd}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>

              <div className={filterStyles.inputGroup}>
                <input
                  type="date"
                  name="contractEndDateStart"
                  placeholder={t('contractEndDateStart')}
                  value={filters.contractEndDateStart}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="date"
                  name="contractEndDateEnd"
                  placeholder={t('contractEndDateEnd')}
                  value={filters.contractEndDateEnd}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>

              <div className={filterStyles.inputGroup}>
                <input
                  type="date"
                  name="foundationDateStart"
                  placeholder={t('foundationDateStart')}
                  value={filters.foundationDateStart}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="date"
                  name="foundationDateEnd"
                  placeholder={t('foundationDateEnd')}
                  value={filters.foundationDateEnd}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </div>

              <input
                type="text"
                name="manager"
                placeholder={t('manager')}
                value={filters.manager}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />

              <input
                type="text"
                name="manager number"
                placeholder={t('manager number')}
                value={filters.managerNumber}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />

              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className={filterStyles.select}
              >
                <option value="">{t('allStatuses')}</option>
                <option value="შესრულებულია">{t('შესრულებულია')}</option>
                <option value="მიმდინარეა">{t('მიმდინარეა')}</option>
                <option value="გაუქმებულია">{t('გაუქმებულია')}</option>
              </select>

            </>
          ) : dashboardType === 'craftsmen' ? (
            <>
              <input
                type="text"
                name="src"
                placeholder="A ნომერი"
                value={filters.src}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="dst"
                placeholder="B ნომერი"
                value={filters.dst}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="date"
                name="callDate"
                placeholder="თარიღი"
                value={filters.callDate}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
              <input
                type="text"
                name="duration"
                placeholder="საუბრის დრო"
                value={filters.duration}
                onChange={handleFilterChange}
                className={filterStyles.input}
              />
            </>
          ) : null}
        </div>
        <div>
          <div className={filterStyles.buttonGroup}>
            <button
              className={[filterStyles.button, filterStyles.applyButton].join(' ')}
              onClick={handleApplyFilters}
            >
              Apply Filters
            </button>
            <button
              className={[filterStyles.button, filterStyles.clearButton].join(' ')}
              onClick={handleClearFilters}
            >
              <span className="label">Clear Filters</span>
            </button>
            {/* Add new download button for company dashboard */}
            {dashboardType === 'company' && onDownloadFiltered && (
              <button
                className={[filterStyles.button, styles.filterDownloadBtn].join(' ')}
                onClick={handleDownloadFiltered}
                disabled={getFilteredData().length === 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                  <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z" />
                </svg>
                Download
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        title="Filter"
        className={styles.filter}
        onClick={onToggleFilters}
      >
        <svg viewBox="0 0 512 512" height="1em">
          <path d="M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z" />
        </svg>
      </button>
      {showFilters && (
        <div className={filterStyles.filterContainer}>
          <h3 className={filterStyles.filterTitle}>
            {dashboardType === 'caller' ? 'ზარების ფილტრი' : dashboardType === 'craftsmen' ? 'ხელოსნების ფილტრი' : 'კომპანიის ფილტრი'}
          </h3>
          <div className={filterStyles.filterGrid}>
            {dashboardType === 'caller' ? (
              <>
                <input type="text" name="companyName" placeholder="Company Name" value={filters.companyName} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="identificationCode" placeholder="Identification Code" value={filters.identificationCode} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contactPerson1" placeholder="Contact Person #1" value={filters.contactPerson1} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="tel1" placeholder="Phone #1" value={filters.tel1} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contactPerson2" placeholder="Contact Person #2" value={filters.contactPerson2} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="tel2" placeholder="Phone #2" value={filters.tel2} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contactPerson3" placeholder="Contact Person #3" value={filters.contactPerson3} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="tel3" placeholder="Phone #3" value={filters.tel3} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="callerName" placeholder="Caller Name" value={filters.callerName} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="callerNumber" placeholder="Caller Number" value={filters.callerNumber} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="receiverNumber" placeholder="Receiver Number" value={filters.receiverNumber} onChange={handleFilterChange} className={filterStyles.input} />
                <div className={filterStyles.inputGroup}>
                  <input type="number" name="callCountMin" placeholder="Min. Call Count" value={filters.callCountMin} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="number" name="callCountMax" placeholder="Max. Call Count" value={filters.callCountMax} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="date" name="callDateStart" placeholder="Start Date" value={filters.callDateStart} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="date" name="callDateEnd" placeholder="End Date" value={filters.callDateEnd} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <select name="callStatus" value={filters.callStatus} onChange={handleFilterChange} className={filterStyles.select}>
                  <option value="">All Statuses</option>
                  <option value="answered">Answered</option>
                  <option value="no answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="failed">Failed</option>
                </select>
              </>
            ) : dashboardType === 'company' ? (
              <>
                <input type="text" name="tenderNumber" placeholder="Tender Number" value={filters.tenderNumber} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="buyer" placeholder="Buyer" value={filters.buyer} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contact1" placeholder="Contact Person #1" value={filters.contact1} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="phone1" placeholder="Phone #1" value={filters.phone1} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contact2" placeholder="Contact Person #2" value={filters.contact2} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="phone2" placeholder="Phone #2" value={filters.phone2} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="contact3" placeholder="Contact Person #3" value={filters.contact3} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="phone3" placeholder="Phone #3" value={filters.phone3} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="email" placeholder="Email" value={filters.email} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="executor" placeholder="Executor" value={filters.executor} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="idCode" placeholder="ID Code" value={filters.idCode} onChange={handleFilterChange} className={filterStyles.input} />
                <div className={filterStyles.inputGroup}>
                  <input type="number" name="contractValueMin" placeholder="Min. Contract Value" value={filters.contractValueMin} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="number" name="contractValueMax" placeholder="Max. Contract Value" value={filters.contractValueMax} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="number" name="totalValueGorgiaMin" placeholder="Min. Total Value Gorgia" value={filters.totalValueGorgiaMin} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="number" name="totalValueGorgiaMax" placeholder="Max. Total Value Gorgia" value={filters.totalValueGorgiaMax} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="date" name="lastPurchaseDateStart" placeholder="Last Purchase Start Date" value={filters.lastPurchaseDateStart} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="date" name="lastPurchaseDateEnd" placeholder="Last Purchase End Date" value={filters.lastPurchaseDateEnd} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="date" name="contractEndDateStart" placeholder="Contract End Start Date" value={filters.contractEndDateStart} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="date" name="contractEndDateEnd" placeholder="Contract End End Date" value={filters.contractEndDateEnd} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="date" name="foundationDateStart" placeholder="Foundation Start Date" value={filters.foundationDateStart} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="date" name="foundationDateEnd" placeholder="Foundation End Date" value={filters.foundationDateEnd} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <input type="text" name="manager" placeholder="Manager" value={filters.manager} onChange={handleFilterChange} className={filterStyles.input} />
                <input type="text" name="manager" placeholder="Manager" value={filters.managerNumber} onChange={handleFilterChange} className={filterStyles.input} />
                <select name="status" value={filters.status} onChange={handleFilterChange} className={filterStyles.select}>
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </>
            ) : dashboardType === 'craftsmen' ? (
              <>
                <input
                  type="text"
                  name="src"
                  placeholder="A ნომერი"
                  value={filters.src}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="text"
                  name="dst"
                  placeholder="B ნომერი"
                  value={filters.dst}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="date"
                  name="callDate"
                  placeholder="თარიღი"
                  value={filters.callDate}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
                <input
                  type="text"
                  name="duration"
                  placeholder="საუბრის დრო"
                  value={filters.duration}
                  onChange={handleFilterChange}
                  className={filterStyles.input}
                />
              </>
            ) : null}
          </div>
          <div>
            <div className={filterStyles.buttonGroup}>
              <button
                className={[filterStyles.button, filterStyles.applyButton].join(' ')}
                onClick={handleApplyFilters}
              >
                Apply Filters
              </button>
              <button
                className={[filterStyles.button, filterStyles.clearButton].join(' ')}
                onClick={handleClearFilters}
              >
                <span className="label">Clear Filters</span>
              </button>
              {/* Add new download button for company dashboard */}
              {dashboardType === 'company' && onDownloadFiltered && (
                <button
                  className={[filterStyles.button, styles.filterDownloadBtn].join(' ')}
                  onClick={handleDownloadFiltered}
                  disabled={getFilteredData().length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                    <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z" />
                  </svg>
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FilterForm;
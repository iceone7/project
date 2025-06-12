import { useState, useEffect } from 'react';
import styles from '../css/Modal.module.css';
import defaultInstance from '../../api/defaultInstance';
import confirmStyles from '../css/ConfirmModal.module.css';
import { useLanguage } from '../i18n/LanguageContext';


function AddCompanyModal({ onClose, editingItem, editMode }) {
  const {t} = useLanguage();

  const [activeTab, setActiveTab] = useState(1);
  const [formData, setFormData] = useState({
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
    contractValue: '',
    totalValueGorgia: '',
    lastPurchaseDateGorgia: '',
    contractEndDate: '',
    foundationDate: '',
    manager: '',
    managerNumber: '',
    status: '',
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [isClosing, setIsClosing] = useState(false);


  useEffect(() => {
    if (editMode && editingItem) {
      setFormData({
        tenderNumber: editingItem.tenderNumber || '',
        buyer: editingItem.buyer || '',
        contact1: editingItem.contact1 || '',
        phone1: editingItem.phone1 || '',
        contact2: editingItem.contact2 || '',
        phone2: editingItem.phone2 || '',
        contact3: editingItem.contact3 || '',
        phone3: editingItem.phone3 || '',
        email: editingItem.email || '',
        executor: editingItem.executor || '',
        idCode: editingItem.idCode || '',
        contractValue: editingItem.contractValue || '',
        totalValueGorgia: editingItem.totalValueGorgia || '',
        lastPurchaseDateGorgia: editingItem.lastPurchaseDateGorgia || '',
        contractEndDate: editingItem.contractEndDate || '',
        foundationDate: editingItem.foundationDate || '',
        manager: editingItem.manager || '',
        managerNumber: editingItem.managerNumber || '',
        status: editingItem.status || '',
      });
    }
  }, [editMode, editingItem]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: '' });
    }, 3000);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      let response;
      if (editMode && editingItem) {
        const res = await defaultInstance.put(`/company-excel-uploads/${editingItem.id}`, formData);
        response = res.data;
      } else {
        const res = await defaultInstance.post('/company-excel-uploads', { data: [formData] });
        response = res.data;
      }
      if (response.success || response.status === 'success' || response.message) {
        setIsClosing(true);
        setTimeout(() => {
          setIsClosing(false);
          setShowSaved(true);
          setTimeout(() => {
            setShowSaved(false);
            onClose();
          }, 2000);
        }, 400); // match modal fade-out duration
      } else {
        showToast('Error: ' + JSON.stringify(response.message || response), 'error');
        setIsSaving(false);
      }
    } catch (error) {
      let msg = error?.response?.data?.message || error.message;
      showToast('Fetch failed: ' + msg, 'error');
      setIsSaving(false);
    }
  };

  return (
    <>
      {!showSaved && (
        <div
          className={`${styles.overlay} ${isClosing ? confirmStyles.fadeOut : ''}`}
        >
          <div className={`${styles.modal} ${isClosing ? confirmStyles.modalFadeOut : ''}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.title}>{t('addCompany')}</h3>
              <button 
                className={styles.closeButton} 
                onClick={onClose}
                disabled={isSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.tabButtons}>
              {[1, 2, 3].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab ? styles.activeTab : ''}
                  disabled={isSaving}
                >
                  {tab === 1 && t('main')}
                  {tab === 2 && t('contacts')}
                  {tab === 3 && t('dates')}
                </button>
              ))}
            </div>

            {activeTab === 1 && (
              <>
                <Input label={t('tenderNumber')} value={formData.tenderNumber} onChange={v => handleChange('tenderNumber', v)} />
                <Input label={t('buyer')} value={formData.buyer} onChange={v => handleChange('buyer', v)} />
                <Input label={t('executor')} value={formData.executor} onChange={v => handleChange('executor', v)} />
                <Input label={t('idCode')} value={formData.idCode} onChange={v => handleChange('idCode', v)} />
                <Input label={t('email')} type="email" value={formData.email} onChange={v => handleChange('email', v)} />
              </>
            )}

            {activeTab === 2 && (
              <>
                <Input label={t('contactPerson1')} value={formData.contact1} onChange={v => handleChange('contact1', v)} />
                <Input label={t('phone1')} value={formData.phone1} onChange={v => handleChange('phone1', v)} />
                <Input label={t('contactPerson2')} value={formData.contact2} onChange={v => handleChange('contact2', v)} />
                <Input label={t('phone2')} value={formData.phone2} onChange={v => handleChange('phone2', v)} />
                <Input label={t('contactPerson3')} value={formData.contact3} onChange={v => handleChange('contact3', v)} />
                <Input label={t('phone3')} value={formData.phone3} onChange={v => handleChange('phone3', v)} />
                <Input label={t('manager')} value={formData.manager} onChange={v => handleChange('manager', v)} />
                <Input label={t('managerNumber')} value={formData.managerNumber} onChange={v => handleChange('managerNumber', v)} />
              </>
            )}

            {activeTab === 3 && (
              <>
                <Input label={t('contractValue')} value={formData.contractValue} onChange={v => handleChange('contractValue', v)} />
                <Input label={t('totalValueGorgia')} value={formData.totalValueGorgia} onChange={v => handleChange('totalValueGorgia', v)} />
                <Input label={t('lastPurchaseDateGorgia')} value={formData.lastPurchaseDateGorgia} onChange={v => handleChange('lastPurchaseDateGorgia', v)} />
                <Input label={t('contractEndDate')} value={formData.contractEndDate} onChange={v => handleChange('contractEndDate', v)} />
                <Input label={t('foundationDate')} value={formData.foundationDate} onChange={v => handleChange('foundationDate', v)} />
                <Input label={t('status')} value={formData.status} onChange={v => handleChange('status', v)} />
              </>
            )}

            <div className={styles.buttonGroup}>
              {activeTab < 3 ? (
                <button
                  onClick={() => setActiveTab(prev => prev + 1)}
                  className={styles.nextBtn}
                  disabled={isSaving}
                >
                  {t('next')}
                </button>
              ) : (
                <button onClick={handleSubmit} className={styles.saveBtn} disabled={isSaving}>
                  {isSaving ? t('saving') : t('save')}
                </button>
              )}
              <button onClick={onClose} className={styles.cancelBtn} disabled={isSaving}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSaved && (
        <div className={confirmStyles.savedPopup}>
          <svg className={confirmStyles.savedCheck} viewBox="0 0 52 52">
            <circle className={confirmStyles.savedCircle} cx="26" cy="26" r="25" fill="none" />
            <path className={confirmStyles.savedCheckmark} fill="none" d="M14 27l7 7 16-16" />
          </svg>
          <span className={confirmStyles.savedText}>Saved!</span>
        </div>
      )}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          backgroundColor: toast.type === 'success' ? '#4BB543' : '#FF4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          opacity: toast.visible ? 1 : 0,
          pointerEvents: toast.visible ? 'auto' : 'none',
          transition: 'opacity 0.3s ease-in-out',
          zIndex: 1000,
          fontWeight: 'bold',
          minWidth: 200,
          textAlign: 'center',
        }}
      >
        {toast.message}
      </div>
    </>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div className={styles.inputGroup}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.input}
      />
    </div>
  );
}

export default AddCompanyModal;
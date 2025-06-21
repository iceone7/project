import React, { useState, useEffect } from 'react';
import styles from '../css/Modal.module.css';
import defaultInstance from '../../api/defaultInstance';
import confirmStyles from '../css/ConfirmModal.module.css';

function EditModal({ isOpen, onClose, onSave, editData }) {
  const [showSaved, setShowSaved] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
    status: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        tenderNumber: editData.tenderNumber || editData.tender_number || '',
        buyer: editData.buyer || '',
        contact1: editData.contact1 || '',
        phone1: editData.phone1 || '',
        contact2: editData.contact2 || '',
        phone2: editData.phone2 || '',
        contact3: editData.contact3 || '',
        phone3: editData.phone3 || '',
        email: editData.email || '',
        executor: editData.executor || '',
        idCode: editData.idCode || editData.id_code || '',
        contractValue: editData.contractValue || editData.contract_value || '',
        totalValueGorgia: editData.totalValueGorgia || editData.total_value_gorgia || '',
        lastPurchaseDateGorgia: editData.lastPurchaseDateGorgia || editData.last_purchase_date_gorgia || '',
        contractEndDate: editData.contractEndDate || editData.contract_end_date || '',
        foundationDate: editData.foundationDate || editData.foundation_date || '',
        manager: editData.manager || '',
        status: editData.status || '',
      });
    }
  }, [editData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const normalizeForBackend = (data) => ({
    tender_number: data.tenderNumber,
    buyer: data.buyer,
    contact1: data.contact1,
    phone1: data.phone1,
    contact2: data.contact2,
    phone2: data.phone2,
    contact3: data.contact3,
    phone3: data.phone3,
    email: data.email,
    executor: data.executor,
    id_code: data.idCode,
    contract_value: data.contractValue,
    total_value_gorgia: data.totalValueGorgia,
    last_purchase_date_gorgia: data.lastPurchaseDateGorgia,
    contract_end_date: data.contractEndDate,
    foundation_date: data.foundationDate,
    manager: data.manager,
    status: data.status,
    id: editData.id,
  });

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = normalizeForBackend(formData);
      await defaultInstance.put(`/company-excel-uploads/${editData.id}`, payload);
      onSave({ ...formData, id: editData.id });
      setIsClosing(true);
      setTimeout(() => {
        setIsClosing(false);
        setShowSaved(true);
        setTimeout(() => {
          setShowSaved(false);
          onClose();
        }, 2000);
      }, 400);
    } catch (error) {
      let msg = error?.response?.data?.error || error.message;
      alert('Failed to update company: ' + msg);
      setIsSaving(false);
    }
  };

  if (!isOpen && !showSaved) return null;

  return (
    <>
      {!showSaved && isOpen && (
        <div
          className={`${styles.overlay} ${isClosing ? confirmStyles.fadeOut : ''}`}
        >
          <div
            className={`${styles.modal} ${isClosing ? confirmStyles.modalFadeOut : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.title}>Edit Company</h3>
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
                  className={`${activeTab === tab ? styles.activeTab : ''}`}
                  disabled={isSaving}
                >
                  {tab === 1 && 'ძირითადი'}
                  {tab === 2 && 'საკონტაქტო'}
                  {tab === 3 && 'თარიღები'}
                </button>
              ))}
            </div>
            {activeTab === 1 && (
              <>
                <Input label="ტენდერის N" value={formData.tenderNumber} onChange={v => handleChange('tenderNumber', v)} />
                <Input label="შემსყიდველი" value={formData.buyer} onChange={v => handleChange('buyer', v)} />
                <Input label="შემსრულებელი" value={formData.executor} onChange={v => handleChange('executor', v)} />
                <Input label="ს/კ -ID" value={formData.idCode} onChange={v => handleChange('idCode', v)} />
                <Input label="ელ-ფოსტა" type="email" value={formData.email} onChange={v => handleChange('email', v)} />
              </>
            )}

            {activeTab === 2 && (
              <>
                <Input label="საკ. პირი #1" value={formData.contact1} onChange={v => handleChange('contact1', v)} />
                <Input label="ტელ #1" value={formData.phone1} onChange={v => handleChange('phone1', v)} />
                <Input label="საკ. პირი #2" value={formData.contact2} onChange={v => handleChange('contact2', v)} />
                <Input label="ტელ #2" value={formData.phone2} onChange={v => handleChange('phone2', v)} />
                <Input label="საკ. პირი #3" value={formData.contact3} onChange={v => handleChange('contact3', v)} />
                <Input label="ტელ #3" value={formData.phone3} onChange={v => handleChange('phone3', v)} />
                <Input label="მენეჯერი" value={formData.manager} onChange={v => handleChange('manager', v)} />
              </>
            )}

            {activeTab === 3 && (
              <>
                <Input label="ხელშ. ღირებ." value={formData.contractValue} onChange={v => handleChange('contractValue', v)} />
                <Input label="გორგიაში შესყ. ჯამურ. ღირ" value={formData.totalValueGorgia} onChange={v => handleChange('totalValueGorgia', v)} />
                <Input label="გორგიაში ბოლო შესყ. თარ." value={formData.lastPurchaseDateGorgia} onChange={v => handleChange('lastPurchaseDateGorgia', v)} />
                <Input label="დაკონტ. საორ. თარიღი" value={formData.contractEndDate} onChange={v => handleChange('contractEndDate', v)} />
                <Input label="დაფუძ. თარიღი" value={formData.foundationDate} onChange={v => handleChange('foundationDate', v)} />
                <Input label="სტატუსი" value={formData.status} onChange={v => handleChange('status', v)} />
              </>
            )}

            <div className={styles.buttonGroup}>
              {activeTab < 3 ? (
                <button
                  onClick={() => setActiveTab(prev => prev + 1)}
                  className={styles.nextBtn}
                  disabled={isSaving}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className={styles.saveBtn}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={isSaving}
              >
                Cancel
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
          <span className={confirmStyles.savedText}>UpDate!</span>
        </div>
      )}
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

export default EditModal;
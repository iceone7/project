import React, { useState, useEffect } from 'react';
import styles from '../css/Modal.module.css';
import defaultInstance from '../../api/defaultInstance';

function EditModal({ isOpen, onClose, onSave, editData }) {
  const [activeTab, setActiveTab] = useState(1);
  const [formData, setFormData] = useState({
    tenderNumber: '',
    buyer: '',
    contact1: '',
    phone1: '',
    contact2: '',
    phone2: '',
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

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      setFormData({
        tenderNumber: editData.tenderNumber || '',
        buyer: editData.buyer || '',
        contact1: editData.contact1 || '',
        phone1: editData.phone1 || '',
        contact2: editData.contact2 || '',
        phone2: editData.phone2 || '',
        email: editData.email || '',
        executor: editData.executor || '',
        idCode: editData.idCode || '',
        contractValue: editData.contractValue || '',
        totalValueGorgia: editData.totalValueGorgia || '',
        lastPurchaseDateGorgia: editData.lastPurchaseDateGorgia || '',
        contractEndDate: editData.contractEndDate || '',
        foundationDate: editData.foundationDate || '',
        manager: editData.manager || '',
        status: editData.status || '',
      });
    }
  }, [editData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await defaultInstance.put(`/company-excel-uploads/${editData.id}`, formData);
      onSave(formData); // Передаем обновленные данные в DataTable
      alert('Company updated successfully!');
      onClose();
    } catch (error) {
      let msg = error?.response?.data?.error || error.message;
      alert('Failed to update company: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Edit Company</h3>

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
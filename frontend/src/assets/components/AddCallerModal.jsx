import { useState } from 'react';
import styles from '../css/Modal.module.css';

function AddCallerModal({ onClose, onSave }) {
  const [activeTab, setActiveTab] = useState(1);
  const [formData, setFormData] = useState({
    companyName: '',
    identificationCode: '',
    contactPerson1: '',
    contactTel1: '',
    contactPerson2: '',
    contactTel2: '',
    contactPerson3: '',
    contactTel3: '',
    callerName: '',
    callerNumber: '',
    receiverNumber: '',
    callCount: '',
    callDate: '',
    callDuration: '',
    callStatus: 'Answered',
  });

  const tabs = [
    {
      id: 1,
      label: 'Company',
      fields: [
        { label: "Company Name", name: "companyName" },
        { label: "Identification Code or ID", name: "identificationCode" },
        { label: "Contact Person #1", name: "contactPerson1" },
        { label: "Tel #1", name: "contactTel1" },
        { label: "Contact Person #2", name: "contactPerson2" },
        { label: "Tel #2", name: "contactTel2" },
        { label: "Contact Person #3", name: "contactPerson3" },
        { label: "Tel #3", name: "contactTel3" },
      ],
    },
    {
      id: 2,
      label: 'Call',
      fields: [
        { label: "Caller Name", name: "callerName" },
        { label: "Caller Number", name: "callerNumber" },
        { label: "Receiver Number", name: "receiverNumber" },
        { label: "Call Count", name: "callCount", type: "number" },
        { label: "Call Date", name: "callDate", type: "date" },
        { label: "Call Duration (minutes)", name: "callDuration", type: "number" },
        { label: "Call Status", name: "callStatus", type: "select", options: ["Answered", "No Answer", "Busy", "Failed"] }
      ],
    }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(response => {
        if (response.status === 'success') {
          onSave(formData);
          alert("Call saved successfully!");
        } else {
          alert("Error: " + response.message);
        }
      })
      .catch(error => {
        alert("Fetch failed: " + error.message);
      });
  };

  const activeTabFields = tabs.find(tab => tab.id === activeTab).fields;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && activeTab === 2) {
      handleSubmit();
    }
  };


  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>Add Call</h3>

        <div className={styles.tabButtons}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.form}>
          {activeTabFields.map(({ label, name, type = 'text', options }) => (
            <div className={styles.inputGroup} key={name}>
              <label>{label}</label>
              {type === 'select' ? (
                <select
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  className={styles.input}
                >
                  {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className={styles.input}
                />
              )}
            </div>
          ))}
        </div>

        <div className={styles.buttonGroup}>
            {activeTab < 2 ? (
                <button
                onClick={() => setActiveTab(prev => prev + 1)}
                className={styles.nextBtn}
                >
                Next
                </button>
            ) : (
                <button onClick={handleSubmit} className={styles.saveBtn}>
                Save
                </button>
            )}
            <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default AddCallerModal;

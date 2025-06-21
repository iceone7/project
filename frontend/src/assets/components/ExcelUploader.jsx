import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';

const processExcelData = (data) => {
  return data.map(row => {
    return {
      companyName: row['Company Name'] || '',
      identificationCode: row['Identification Code'] || '',
      contactPerson1: row['Contact Person 1'] || '',
      tel1: row['Phone 1'] || '',
      contactPerson2: row['Contact Person 2'] || '',
      tel2: row['Phone 2'] || '',
      contactPerson3: row['Contact Person 3'] || '',
      tel3: row['Phone 3'] || '',
      callerName: row['Caller Name'] || '',
      callerNumber: row['Caller Number'] || '',
      receiverName: row['Receiver Name'] || '',
      receiverNumber: row['Receiver Number'] || '',
      callCount: row['Call Count'] || 0,
      callDate: row['Call Date'] || '',
      callDuration: row['Call Duration'] || '',
      callStatus: row['Call Status'] || '',
    };
  });
};

const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  
  reader.onload = async (evt) => {
    const fileData = evt.target.result;
    const workbook = XLSX.read(fileData, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(sheet);
    console.log('Raw Excel data:', rawData);
    
    const processedData = processExcelData(rawData);
    console.log('Processed data:', processedData);
    
    try {
      const response = await axios.post('/api/import-excel', {
        data: processedData
      });
      console.log('Upload successful:', response.data);
    } catch (error) {
      console.error('Error uploading Excel file:', error);
    }
  };
  
  reader.readAsBinaryString(file);
};
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import filterStyles from '../css/FilterModal.module.css';
import styles from '../css/UploadButton.module.css';
import { useLanguage } from '../i18n/LanguageContext';

// Initial filter state
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

// Enhanced nested property access with more complete data analysis
const getNestedProperty = (obj, possibleKeys) => {
  if (!obj) return '';
  
  // Try direct property access first with proper trimming
  for (const key of possibleKeys) {
    const value = key.includes('.')
      ? key.split('.').reduce((o, k) => (o || {})[k], obj)
      : obj[key];
    if (value !== undefined && value !== null) return value;
  }
  
  // Try case-insensitive properties as fallback with more aggressive matching
  try {
    const lowercaseKeys = Object.keys(obj).map(k => k.toLowerCase());
    for (const key of possibleKeys) {
      const lowKey = key.toLowerCase();
      
      // Try exact match first
      const matchIndex = lowercaseKeys.findIndex(k => k === lowKey);
      if (matchIndex >= 0) {
        const actualKey = Object.keys(obj)[matchIndex];
        if (obj[actualKey] !== undefined && obj[actualKey] !== null) {
          return obj[actualKey];
        }
      }
      
      // Then try partial match (for abbreviated fields)
      const partialMatchIndex = lowercaseKeys.findIndex(k => k.includes(lowKey) || lowKey.includes(k));
      if (partialMatchIndex >= 0) {
        const actualKey = Object.keys(obj)[partialMatchIndex];
        if (obj[actualKey] !== undefined && obj[actualKey] !== null) {
          return obj[actualKey];
        }
      }
    }
  } catch (err) {
    console.error('Error in flexible property matching:', err);
  }
  
  return '';
};

const FilterForm = ({
  data,
  onFilterApply,
  showFilters,
  onToggleFilters,
  onlyButton = false,
  onlyForm = false,
  dashboardType = 'caller',
  onDownloadFiltered,
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState(initialFilters);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Add state to track when filters are cleared
  const [isFilterCleared, setIsFilterCleared] = useState(false);
  const { t } = useLanguage();
  
  // Add a ref to store the original dataset
  const originalDataRef = useRef([]);
  
  // Add new state to force refresh
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Add state for export date range
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // New state for download tooltip
  const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);
  
  // Debounce filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [filters]);
  
  // Apply filters when debounced values change
  useEffect(() => {
    if (!isInitialLoad) {
      // Log what filter values changed
      console.log('Applying filters with debounced values:', debouncedFilters);
      const filteredData = getFilteredData();
      onFilterApply(filteredData);
    }
  }, [debouncedFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial data setup - store original data
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`Storing original dataset of ${data.length} records`);
      // Make a deep copy to ensure we don't have reference issues
      originalDataRef.current = JSON.parse(JSON.stringify(data));
      
      if (isInitialLoad) {
        setIsInitialLoad(false);
        // Use the original data without any filtering
        onFilterApply([...data]);
      }
      
      // Reset filter cleared flag when new data is received
      if (isFilterCleared) {
        setIsFilterCleared(false);
      }
    }
  }, [data, isInitialLoad, onFilterApply, isFilterCleared]);

  // Improved normalize string function with better international character handling
  const normalizeString = useCallback((value) => {
    if (value === null || value === undefined) return '';
    
    // Handle numeric values
    if (typeof value === 'number') return String(value).toLowerCase().trim();
    
    // Convert to string, lowercase, and trim whitespace
    try {
      // Force to string and normalize
      const normalizedString = String(value)
        .toLowerCase()
        .trim()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics if needed
    
      return normalizedString;
    } catch (err) {
      console.error('Error normalizing string value:', value, err);
      return '';
    }
  }, []);

  // Enhanced text matching with better debugging and more lenient matching
  const matchesText = useCallback((field, filter) => {
    if (!filter) return true;
    if (field === undefined || field === null) return false;

    // Normalize both strings for comparison
    const normalizedField = normalizeString(field);
    const normalizedFilter = normalizeString(filter);
    
    // Debug specific field issues with values
    const fieldMatches = normalizedField.includes(normalizedFilter);
    
    // Extra logging for identification code searches
    if (filter && (
        normalizedFilter.includes('415595699') || 
        (normalizedField && normalizedField.length > 0 && !fieldMatches)
    )) {
      console.debug(`Field matching: "${field}" (${typeof field}) against "${filter}" (${typeof filter}): 
        normalized: "${normalizedField}".includes("${normalizedFilter}") = ${fieldMatches}`);
    }
    
    return fieldMatches;
  }, [normalizeString]);

  // Check if number is within range
  const matchesNumberRange = useCallback((value, min, max) => {
    if (value == null || value === '') return true;
    
    // Try to convert to number, handling various formats
    let numValue;
    if (typeof value === 'string') {
      // Remove any non-numeric chars except decimal point
      const cleanValue = value.replace(/[^\d.-]/g, '');
      numValue = parseFloat(cleanValue);
    } else {
      numValue = Number(value);
    }
    
    if (isNaN(numValue)) return false;
    
    const numMin = min !== '' ? Number(min) : null;
    const numMax = max !== '' ? Number(max) : null;
    
    if (numMin !== null && !isNaN(numMin) && numValue < numMin) return false;
    if (numMax !== null && !isNaN(numMax) && numValue > numMax) return false;
    
    return true;
  }, []);

  // Check if date is within range (with timezone safety)
  const matchesDateRange = useCallback((dateValue, start, end) => {
    if (!dateValue) return true;
    
    // Try to parse the date safely
    let dateObj;
    try {
      // Handle different date formats
      if (typeof dateValue === 'string') {
        // Try parsing as ISO format first
        dateObj = new Date(dateValue);
        
        // If invalid, try DD/MM/YYYY format
        if (isNaN(dateObj.getTime()) && dateValue.includes('/')) {
          const [day, month, year] = dateValue.split('/');
          dateObj = new Date(`${year}-${month}-${day}`);
        }
        
        // If still invalid, return false
        if (isNaN(dateObj.getTime())) return false;
      } else if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else {
        return false;
      }
    } catch (e) {
      console.error('Date parsing error:', e);
      return false;
    }
    
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    // Set hours to beginning/end of day for consistent comparison
    if (dateObj) dateObj.setHours(12, 0, 0, 0);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    
    if (startDate && dateObj < startDate) return false;
    
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      if (dateObj > endDate) return false;
    }
    
    return true;
  }, []);

  // Check if status matches
  const matchesStatus = useCallback((status, filter) => {
    if (!filter) return true;
    if (!status) return false;
    return normalizeString(status) === normalizeString(filter);
  }, [normalizeString]);

  // Format duration string
  const formatDuration = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(unit => String(unit).padStart(2, '0'))
      .join(':');
  }, []);

  // Create memoized filter functions for each dashboard type with enhanced property matching
  const filterFunctions = useMemo(() => ({
    caller: (row) => {
      try {
        // Extract values more carefully with fallbacks
        const companyName = getNestedProperty(row, [
          'companyName', 'company_name', 'Company Name', 'CompanyName', 
          'company', 'name', 'organization', 'company-name',
          'buyer', 'შემსყიდველი', // Georgian fields
          'companyname', 'client', 'clientName', 'client_name' // More variations
        ]);
        
        const identificationCode = getNestedProperty(row, [
          'identificationCode', 'identification_code', 'idCode', 'id_code', 'ID Code', 'id', 'code',
          'identificationnumber', 'identification_number', 'idnumber', 'idNumber', 'identification',
          'ს/კ', 'სკ', 'ს/კოდი', 'კოდი' // Georgian versions
        ]);
        
        const callerNumber = getNestedProperty(row, [
          'callerNumber', 'caller_number', 'Caller Number', 'caller', 'caller_num', 'callerNum', 'src', 'source',
          'დამრეკის', 'დამრეკისნომერი', 'დამრეკავი' // Georgian versions
        ]);
        
        const receiverNumber = getNestedProperty(row, [
          'receiverNumber', 'receiver_number', 'Receiver Number', 'receiver', 'receiver_num', 'receiverNum', 'dst', 'destination',
          'მიმღების', 'მიმღებისნომერი' // Georgian versions
        ]);
        
        // Clean the filter values to ensure no issues with whitespace
        const cleanCompanyNameFilter = filters.companyName.trim();
        const cleanIdCodeFilter = filters.identificationCode.trim();
        const cleanContactPerson1Filter = filters.contactPerson1.trim();
        const cleanTel1Filter = filters.tel1.trim();
        // ... other filters
        
        // Do the actual matching with trimmed values
        const matchesCompanyName = !cleanCompanyNameFilter || 
          matchesText(companyName, cleanCompanyNameFilter);
        
        const matchesIdentificationCode = !cleanIdCodeFilter || 
          matchesText(identificationCode, cleanIdCodeFilter);
        
        const matchesContactPerson1 = !cleanContactPerson1Filter || 
          matchesText(
            getNestedProperty(row, [
              'contactPerson1', 'contact_person1', 'contact1', 'contact_1', 
              'contactname1', 'contact_name_1', 'საკ. პირი #1', 'საკპირი1'
            ]), 
            cleanContactPerson1Filter
          );
        
        const matchesTel1 = !cleanTel1Filter || 
          matchesText(
            getNestedProperty(row, [
              'tel1', 'phone1', 'phone_1', 'contactTel1', 'contact_tel1', 
              'telephone1', 'tel_1', 'ტელ1', 'ტელეფონი1'
            ]), 
            cleanTel1Filter
          );
        
        // ...other matches with similar pattern
        
        // Final combined match result
        return (
          matchesCompanyName &&
          matchesIdentificationCode &&
          matchesContactPerson1 &&
          matchesTel1 &&
          // ...rest of the conditions
          true // Ensure the function returns a value even if some conditions are omitted
        );
      } catch (err) {
        console.error('Filter error for caller row:', err);
        return false;
      }
    },
    company: (row) => {
      try {
        // Debug log for the row being processed when manager filter is active
        const isManagerFilterActive = filters.manager && filters.manager.trim() !== '';
        
        // Get manager value for this row
        const managerValue = getNestedProperty(row, [
          'manager', 'Manager', 'managerName', 'manager_name',
          'მენეჯერი', 'managername', 'MANAGER'
        ]);
        
        // Check if manager matches
        const matchesManager = filters.manager === '' ||
          matchesText(managerValue, filters.manager) ||
          (row.executor && matchesText(row.executor, filters.manager));
        
        // If we're filtering for manager and this row matches, do detailed debugging
        if (isManagerFilterActive && matchesManager) {
          console.debug(`Row ${row.id} matches manager "${filters.manager}": ${managerValue}`);
          
          // Create an object to track which filters pass/fail for this row
          const filterResults = {
            tenderNumber: matchesText(getNestedProperty(row, ['tenderNumber', 'tender_number']), filters.tenderNumber),
            buyer: matchesText(getNestedProperty(row, ['buyer']), filters.buyer),
            contact1: matchesText(getNestedProperty(row, ['contact1', 'contact_1']), filters.contact1),
            phone1: matchesText(getNestedProperty(row, ['phone1', 'phone_1']), filters.phone1),
            contact2: matchesText(getNestedProperty(row, ['contact2', 'contact_2']), filters.contact2),
            phone2: matchesText(getNestedProperty(row, ['phone2', 'phone_2']), filters.phone2), 
            contact3: matchesText(getNestedProperty(row, ['contact3', 'contact_3']), filters.contact3),
            phone3: matchesText(getNestedProperty(row, ['phone3', 'phone_3']), filters.phone3),
            email: matchesText(getNestedProperty(row, ['email']), filters.email),
            executor: matchesText(getNestedProperty(row, ['executor']), filters.executor),
            idCode: matchesText(getNestedProperty(row, ['idCode', 'id_code']), filters.idCode),
            contractValue: matchesNumberRange(getNestedProperty(row, ['contractValue', 'contract_value']), filters.contractValueMin, filters.contractValueMax),
            totalValueGorgia: matchesNumberRange(getNestedProperty(row, ['totalValueGorgia', 'total_value_gorgia']), filters.totalValueGorgiaMin, filters.totalValueGorgiaMax),
            lastPurchaseDate: matchesDateRange(getNestedProperty(row, ['lastPurchaseDateGorgia', 'last_purchase_date_gorgia']), filters.lastPurchaseDateStart, filters.lastPurchaseDateEnd),
            contractEndDate: matchesDateRange(getNestedProperty(row, ['contractEndDate', 'contract_end_date']), filters.contractEndDateStart, filters.contractEndDateEnd),
            foundationDate: matchesDateRange(getNestedProperty(row, ['foundationDate', 'foundation_date']), filters.foundationDateStart, filters.foundationDateEnd),
            manager: matchesManager,
            managerNumber: matchesText(getNestedProperty(row, ['managerNumber', 'manager_number']), filters.managerNumber),
            status: matchesStatus(getNestedProperty(row, ['status']), filters.status)
          };
          
          // Find failing filters
          const failingFilters = Object.entries(filterResults)
            .filter(([_, passes]) => !passes)
            .map(([name]) => name);
          
          if (failingFilters.length > 0) {
            console.debug(`Row ${row.id} failed on filters: ${failingFilters.join(', ')}`);
            
            // Print the expected vs actual values for failing filters
            failingFilters.forEach(filter => {
              const filterValue = filters[filter];
              const rowValue = getNestedProperty(row, [filter, `${filter}_number`, filter.replace('Number', '_number')]);
              console.debug(`  Filter ${filter}: Expected "${filterValue}", Got "${rowValue}"`);
            });
          }
          
          // Overall result is the AND of all filter results
          const result = Object.values(filterResults).every(Boolean);
          return result;
        }

        // Standard filter logic without detailed debugging for non-matching rows
        const result = (
          matchesText(getNestedProperty(row, ['tenderNumber', 'tender_number']), filters.tenderNumber) &&
          matchesText(getNestedProperty(row, ['buyer']), filters.buyer) &&
          matchesText(getNestedProperty(row, ['contact1', 'contact_1']), filters.contact1) &&
          matchesText(getNestedProperty(row, ['phone1', 'phone_1']), filters.phone1) &&
          matchesText(getNestedProperty(row, ['contact2', 'contact_2']), filters.contact2) &&
          matchesText(getNestedProperty(row, ['phone2', 'phone_2']), filters.phone2) &&
          matchesText(getNestedProperty(row, ['contact3', 'contact_3']), filters.contact3) &&
          matchesText(getNestedProperty(row, ['phone3', 'phone_3']), filters.phone3) &&
          matchesText(getNestedProperty(row, ['email']), filters.email) &&
          matchesText(getNestedProperty(row, ['executor']), filters.executor) &&
          matchesText(getNestedProperty(row, ['idCode', 'id_code']), filters.idCode) &&
          matchesNumberRange(getNestedProperty(row, ['contractValue', 'contract_value']), filters.contractValueMin, filters.contractValueMax) &&
          matchesNumberRange(getNestedProperty(row, ['totalValueGorgia', 'total_value_gorgia']), filters.totalValueGorgiaMin, filters.totalValueGorgiaMax) &&
          matchesDateRange(getNestedProperty(row, ['lastPurchaseDateGorgia', 'last_purchase_date_gorgia']), filters.lastPurchaseDateStart, filters.lastPurchaseDateEnd) &&
          matchesDateRange(getNestedProperty(row, ['contractEndDate', 'contract_end_date']), filters.contractEndDateStart, filters.contractEndDateEnd) &&
          matchesDateRange(getNestedProperty(row, ['foundationDate', 'foundation_date']), filters.foundationDateStart, filters.foundationDateEnd) &&
          matchesManager && // Use the consolidated manager matching logic
          matchesText(getNestedProperty(row, ['managerNumber', 'manager_number']), filters.managerNumber) &&
          matchesStatus(getNestedProperty(row, ['status']), filters.status)
        );

        return result;
      } catch (err) {
        console.error('Filter error for company row:', row, err);
        return false;
      }
    },
    craftsmen: (row) => {
      try {
        return (
          matchesText(row.src, filters.src) &&
          matchesText(row.dst, filters.dst) &&
          matchesText(row.calldate, filters.callDate) &&
          (filters.duration === '' || 
           (row.duration && formatDuration(Number(row.duration)).includes(filters.duration)))
        );
      } catch (err) {
        console.error('Filter error for craftsmen row:', row, err);
        return false;
      }
    }
  }), [
    filters, matchesText, matchesNumberRange, matchesDateRange, 
    matchesStatus, formatDuration
  ]);
  
  // Modified approach for getFilteredData
  const getFilteredData = useCallback(() => {
    // If we just cleared filters, return the original data
    if (isFilterCleared) {
      console.log("Filter was just cleared, returning original dataset");
      return originalDataRef.current;
    }

    if (!Array.isArray(data)) {
      console.log('getFilteredData: data is not an array', data);
      return [];
    }
    
    // Sample the data structure to understand what we're working with
    if (data.length > 0) {
      const sampleRow = data[0];
      console.log(`Sample data structure for ${dashboardType}:`, 
        Object.keys(sampleRow), 
        `First few values: ${Object.entries(sampleRow).slice(0,5).map(([k,v]) => `${k}=${v}`).join(', ')}`
      );
      
      // Special diagnostic for company name
      if (filters.companyName) {
        const possibleCompanyNameFields = [
          'companyName', 'company_name', 'Company Name', 'CompanyName', 
          'company', 'name', 'organization', 'company-name',
          'buyer', 'შემსყიდველი' // Additional possible fields in Georgian data
        ];
        
        console.log('Diagnostic for company name field:');
        possibleCompanyNameFields.forEach(field => {
          const value = sampleRow[field];
          if (value !== undefined) {
            console.log(`  Field "${field}" exists with value: "${value}"`);
          }
        });
      }
    }
    
    // Check if all filters are empty (equal to initialFilters)
    const hasActiveFilters = Object.keys(filters).some(key => {
      // Skip empty string values which are the default for text filters
      if (filters[key] === '') return false;
      
      // Check if the filter value differs from initial value
      return filters[key] !== initialFilters[key];
    });
    
    console.log(`Filter status check - Has active filters: ${hasActiveFilters}`);
    
    // If no active filters, return the original dataset
    if (!hasActiveFilters) {
      console.log(`No active filters, returning original dataset (${originalDataRef.current.length} records)`);
      return originalDataRef.current;
    }
    
    // For debugging - log active filters
    const activeFilters = Object.entries(filters)
      .filter(([key, value]) => value !== initialFilters[key] && value !== '')
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
    
    if (Object.keys(activeFilters).length > 0) {
      console.log('Active filters:', activeFilters);
    }
    
    console.log(`Filtering ${data.length} ${dashboardType} records...`);
    
    // Standard filtering using the filter functions
    const filterFunction = filterFunctions[dashboardType] || (() => true);
    
    // Apply filter function to each item and count matches for debugging
    const filtered = [];
    let matches = 0;
    let total = 0;
    
    for (const item of data) {
      total++;
      
      // For companyName filter, do extra debugging on first few items
      if (filters.companyName && total <= 3) {
        // Extract the value using our function and directly
        const extractedCompanyName = getNestedProperty(item, [
          'companyName', 'company_name', 'Company Name', 'CompanyName', 
          'company', 'name', 'organization', 'company-name',
          'buyer', 'შემსყიდველი' // Additional possible fields in Georgian data
        ]);
        
        console.log(`Row ${total} company name:`, {
          extracted: extractedCompanyName,
          directFields: {
            companyName: item.companyName,
            company_name: item.company_name,
            buyer: item.buyer,
            // Add any other direct access to potential company name fields
          },
          filterValue: filters.companyName,
          normalizedExtracted: normalizeString(extractedCompanyName),
          normalizedFilter: normalizeString(filters.companyName),
          matches: normalizeString(extractedCompanyName).includes(normalizeString(filters.companyName))
        });
      }
      
      const itemMatches = filterFunction(item);
      if (itemMatches) {
        matches++;
        filtered.push(item);
      }
    }
    
    // Log filter effectiveness
    console.log(`Filter matched ${matches}/${total} records (${total > 0 ? (matches/total*100).toFixed(1) : 'NaN'}%)`);
    
    // If no matches found, show detailed debug info for the first few items
    if (matches === 0 && total > 0) {
      console.log('No matches found! Debugging first item:');
      const item = data[0];
      
      // Dump the structure of the item to console
      console.log('Item structure:', item);
      console.log('Available fields:', Object.keys(item).join(', '));
      
      const debugFilters = Object.entries(activeFilters);
      
      debugFilters.forEach(([filterName, filterValue]) => {
        // Find all properties that might match this filter
        const flattenedProperties = [];
        
        // Flatten the object to find all properties at any nesting level
        const flattenObject = (obj, prefix = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          for (const key in obj) {
            try {
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                flattenObject(obj[key], `${prefix}${key}.`);
              } else {
                flattenedProperties.push({
                  path: `${prefix}${key}`,
                  value: String(obj[key]),
                  normalized: normalizeString(String(obj[key]))
                });
              }
            } catch (err) {
              console.error(`Error accessing property ${key}:`, err);
            }
          }
        };
        
        flattenObject(item);
        const normalizedFilterValue = normalizeString(filterValue);
        
        console.log(`Looking for matches for filter "${filterName}" with value "${filterValue}" (normalized: "${normalizedFilterValue}"):`);
        
        // Find properties whose values contain the filter value
        const matchingProps = flattenedProperties.filter(p => 
          p.normalized.includes(normalizedFilterValue)
        );
        
        console.log(matchingProps.length > 0 ? 
          matchingProps : 
          'No properties with matching values found');
        
        // Special handling for companyName to guide the user
        if (filterName === 'companyName' && matchingProps.length === 0) {
          console.log('Suggestion: Check if your company name might be in a different field. Common fields are:');
          const commonCompanyFields = ['buyer', 'name', 'company', 'organization', 'შემსყიდველი'];
          commonCompanyFields.forEach(field => {
            if (item[field]) {
              console.log(`  - ${field}: "${item[field]}"`);
            }
          });
        }
      });
    }
    
    return filtered;
  }, [data, dashboardType, filterFunctions, filters, originalDataRef, normalizeString, isFilterCleared]);

  // Handle input changes with validation and proper trimming for whitespace
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // Always trim values when setting filters to avoid whitespace issues
    const cleanValue = value.trim();
    
    console.log(`Filter changed: ${name} = "${cleanValue}" (original: "${value}")`);
    
    // For number inputs, validate to prevent invalid entries that could break comparisons
    if (name.includes('Min') || name.includes('Max')) {
      // Allow empty string or valid numbers only
      if (cleanValue === '' || !isNaN(cleanValue)) {
        setFilters((prev) => ({ ...prev, [name]: cleanValue }));
      }
    } else {
      setFilters((prev) => ({ ...prev, [name]: cleanValue }));
    }
  };

  // Apply filters immediately (bypass debounce) when clicking Apply
  const handleApplyFilters = () => {
    console.log('Manually applying filters...');
    
    // Force re-evaluation of filtered data
    const filteredData = getFilteredData();
    
    // Log results
    console.log(`Filter application complete: Found ${filteredData.length} matching records`);
    
    // Reset cleared flag when explicitly applying filters
    setIsFilterCleared(false);
    
    // Update state
    setDebouncedFilters({...filters}); 
    
    // Pass filtered data to parent component
    onFilterApply(filteredData);
  };

  // Clear all filters - improved to ensure data is properly restored
  const handleClearFilters = () => {
    console.log(`Clearing filters, restoring ${originalDataRef.current.length} records`);
    
    // Set the filter cleared flag
    setIsFilterCleared(true);
    
    // Reset filter states
    setFilters({...initialFilters});
    setDebouncedFilters({...initialFilters});
    
    // Try to get the original data with a few backup approaches
    let originalData;
    
    // First, check if we have data in the originalDataRef
    if (originalDataRef.current && originalDataRef.current.length > 0) {
      console.log(`Using ${originalDataRef.current.length} records from originalDataRef`);
      // Deep clone to avoid reference issues
      originalData = JSON.parse(JSON.stringify(originalDataRef.current));
    } 
    // Fallback to the latest data prop
    else if (data && data.length > 0) {
      console.log(`Fallback: Using ${data.length} records from data prop`);
      originalData = [...data];
    }
    // Ultimate fallback - empty array
    else {
      console.log('Warning: No original data found to restore');
      originalData = [];
    }
    
    // Pass the original data back to the parent
    console.log(`Restoring original data with ${originalData.length} records`);
    
    // Use direct callback to parent and bypass state setting
    setRefreshKey(prev => prev + 1);
    
    // Force immediate refresh of table data - using both approaches for robustness
    onFilterApply(originalData);
    
    // For good measure, set a timeout to ensure the UI updates
    setTimeout(() => {
      if (originalData.length > 0) {
        console.log(`Re-applying original data after timeout (${originalData.length} records)`);
        onFilterApply([...originalData]);
      }
    }, 100);
  };

  // Handle download of filtered data with custom format
  const handleDownloadFiltered = () => {
    // Check if only date range is selected (no other filters)
    const hasOtherFilters = Object.entries(filters).some(([key, value]) => {
      // Skip empty values and date-related filters
      return value && 
             !['callDateStart', 'callDateEnd', 'lastPurchaseDateStart', 
                'lastPurchaseDateEnd', 'contractEndDateStart', 'contractEndDateEnd', 
                'foundationDateStart', 'foundationDateEnd'].includes(key);
    });
    
    // Use all data if only date range is selected, otherwise use filtered data
    const dataToProcess = hasOtherFilters ? getFilteredData() : (Array.isArray(data) ? data : []);
    
    if (dataToProcess.length === 0) {
      alert('No data to download');
      return;
    }
    
    console.log("Preparing download with", dataToProcess.length, "records");
    console.log("Using date range:", exportDateRange);
    
    // Format date string nicely if available
    const formattedDate = exportDateRange.startDate ? 
      (exportDateRange.endDate ? 
        `${exportDateRange.startDate} - ${exportDateRange.endDate}` : 
        exportDateRange.startDate) : 
      "";
    
    // Transform data according to requested mapping
    const transformedData = dataToProcess.map((row, index) => {
      // Log occasionally for debugging
      if (index % 500 === 0) {
        console.log(`Processing row ${index}`);
      }
      
      const transformedRow = {
        "Company Name": getNestedProperty(row, ['buyer']),
        "ID Code": getNestedProperty(row, ['idCode', 'id_code']),
        "Contact Person #1": getNestedProperty(row, ['contact1', 'contact_1']),
        "Phone #1": getNestedProperty(row, ['phone1', 'phone_1']),
        "Contact Person #2": getNestedProperty(row, ['contact2', 'contact_2']),
        "Phone #2": getNestedProperty(row, ['phone2', 'phone_2']),
        "Contact Person #3": getNestedProperty(row, ['contact3', 'contact_3']),
        "Phone #3": getNestedProperty(row, ['phone3', 'phone_3']),
        "Caller Name": getNestedProperty(row, ['manager']),
        "Caller Number": getNestedProperty(row, ['managerNumber', 'manager_number']),
        
        // Empty columns as requested
        "Receiver Name": "",
        "Receiver Number": "",
        "Call Count": "",
        "Answered Calls": "",
        "No Answer Calls": "",
        "Busy Calls": "",
        "Call Date": formattedDate, // Single date field with formatted date range
        "Call Duration": ""
      };
      
      return transformedRow;
    });
    
    console.log("Transformed data ready for download:", transformedData.length, "records");
    
    // Pass transformed data to download handler
    onDownloadFiltered([...transformedData]);
  };
  
  // Handle date range changes for export
  const handleExportDateChange = (e) => {
    const { name, value } = e.target;
    setExportDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Only button mode (just show filter toggle)
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

  // Only form mode (just show filter form if enabled)
  if (onlyForm) {
    if (!showFilters) return null;
    
    // Return the filter form - the rest of the component remains the same
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
              {/* <div className={filterStyles.inputGroup}>
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
              </div> */}
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
                name="managerNumber"
                placeholder={t('managerNumber')}
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
          {/* Modified download section with date selection */}
            {dashboardType === 'company' && onDownloadFiltered && (
              <div className={filterStyles.downloadSection}>
                <div className={filterStyles.dateSelectionGroup}>
                  <label className={filterStyles.dateLabel}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                      <path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm64 80v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm128 0v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H208c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H336z"/>
                    </svg>
                    {t('callDateRangeExport') || 'Call Date Range for Export:'}
                  </label>
                  <div className={filterStyles.dateInputs}>
                    <input
                      type="date"
                      name="startDate"
                      placeholder="Start Date"
                      value={exportDateRange.startDate}
                      onChange={handleExportDateChange}
                      className={filterStyles.input}
                    />
                    <input
                      type="date"
                      name="endDate"
                      placeholder="End Date"
                      value={exportDateRange.endDate}
                      onChange={handleExportDateChange}
                      className={filterStyles.input}
                    />
                  </div>
                </div>
                <div className={filterStyles.tooltipContainer}
                     onMouseEnter={() => setShowDownloadTooltip(true)}
                     onMouseLeave={() => setShowDownloadTooltip(false)}>
                  <div className={`${filterStyles.tooltip} ${showDownloadTooltip ? filterStyles.tooltipVisible : ''}`}>
                    {t('downloadCustomFormat') || 'Download data with the selected date range in a custom format'}
                  </div>
                </div>
              </div>
            )}
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
              data-refresh-key={refreshKey} // Add this to force re-render
            >
              <span className="label">{t('clearFilters') || 'Clear Filters'}</span>
            </button>
            {dashboardType === 'company' && onDownloadFiltered && (
            <button
              className={filterStyles.downloadButton}
              onClick={handleDownloadFiltered}
              disabled={Array.isArray(data) ? data.length === 0 : true}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z" fill="white"/>
              </svg>
              {t('downloadWithCustomFormat') || 'Download With Custom Format'}
            </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full component (both button and form)
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
                {/* <div className={filterStyles.inputGroup}>
                  <input type="number" name="callCountMin" placeholder="Min. Call Count" value={filters.callCountMin} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="number" name="callCountMax" placeholder="Max. Call Count" value={filters.callCountMax} onChange={handleFilterChange} className={filterStyles.input} />
                </div>
                <div className={filterStyles.inputGroup}>
                  <input type="date" name="callDateStart" placeholder="Start Date" value={filters.callDateStart} onChange={handleFilterChange} className={filterStyles.input} />
                  <input type="date" name="callDateEnd" placeholder="End Date" value={filters.callDateEnd} onChange={handleFilterChange} className={filterStyles.input} />
                </div> */}
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
                  name="managerNumber"
                  placeholder={t('managerNumber')}
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
                {t('applyFilters') || 'Apply Filters'}
              </button>
              <button
                className={[filterStyles.button, filterStyles.clearButton].join(' ')}
                onClick={handleClearFilters}
                data-refresh-key={refreshKey} // Add this to force re-render
              >
                <span className="label">{t('clearFilters') || 'Clear Filters'}</span>
              </button>
              
              {/* Modified download section with date selection */}
              {dashboardType === 'company' && onDownloadFiltered && (
                <div className={filterStyles.downloadSection}>
                  <div className={filterStyles.dateSelectionGroup}>
                    <label className={filterStyles.dateLabel}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                        <path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm64 80v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm128 0v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H208c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H336z"/>
                      </svg>
                      {t('callDateRangeExport') || 'Call Date Range for Export:'}
                    </label>
                    <div className={filterStyles.dateInputs}>
                      <input
                        type="date"
                        name="startDate"
                        placeholder="Start Date"
                        value={exportDateRange.startDate}
                        onChange={handleExportDateChange}
                        className={filterStyles.input}
                      />
                      <input
                        type="date"
                        name="endDate"
                        placeholder="End Date"
                        value={exportDateRange.endDate}
                        onChange={handleExportDateChange}
                        className={filterStyles.input}
                      />
                    </div>
                  </div>
                  <div className={filterStyles.tooltipContainer}
                       onMouseEnter={() => setShowDownloadTooltip(true)}
                       onMouseLeave={() => setShowDownloadTooltip(false)}>
                    <div className={`${filterStyles.tooltip} ${showDownloadTooltip ? filterStyles.tooltipVisible : ''}`}>
                      {t('downloadCustomFormat') || 'Download data with the selected date range in a custom format'}
                    </div>
                    <button
                      className={filterStyles.downloadButton}
                      onClick={handleDownloadFiltered}
                      disabled={Array.isArray(data) ? data.length === 0 : true}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                        <path d="M144 480C64.5 480 0 415.5 0 336c0-62.8 40.2-116.2 96.2-135.9c-.1-2.7-.2-5.4-.2-8.1c0-88.4 71.6-160 160-160c59.3 0 111 32.2 138.7 80.2C409.9 102 428.3 96 448 96c53 0 96 43 96 96c0 12.2-2.3 23.8-6.4 34.6C596 238.4 640 290.1 640 352c0 70.7-57.3 128-128 128H144zm79-167l80 80c9.4 9.4 24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-39 39V184c0-13.3-10.7-24-24-24s-24 10.7-24 24V318.1l-39-39c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9z" fill="white"/>
                      </svg>
                      {t('downloadWithCustomFormat') || 'Download With Custom Format'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FilterForm;
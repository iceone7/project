<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CompanyExcelUpload;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CompanyExcelUploadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        try {
            // Log that we're attempting to fetch data
            \Log::info('Fetching company excel uploads');
            
            // Try a simple query first to check basic connectivity
            $count = CompanyExcelUpload::count();
            \Log::info('Found ' . $count . ' company records');
            
            // Now fetch all with error handling
            $data = CompanyExcelUpload::all()->map(function($item) {
                // Make sure contact3 and phone3 are set
                if (!isset($item->contact3)) {
                    $item->contact3 = null;
                }
                if (!isset($item->phone3)) {
                    $item->phone3 = null;
                }
                return $item;
            });
            
            \Log::info('Successfully fetched all company data');
            
            return response()->json([
                'data' => $data
            ], 200);
        } catch (\PDOException $e) {
            \Log::error('Database error when fetching companies: ' . $e->getMessage());
            return response()->json([
                'error' => 'Database connection error',
                'message' => $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Error fetching company uploads: ' . $e->getMessage());
            \Log::error('Error trace: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to fetch data', 
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            // Log the full request data for debugging
            \Log::info('Received data structure:', [
                'has_data_array' => $request->has('data'),
                'data_count' => $request->has('data') ? count($request->input('data')) : 0,
                'first_row' => $request->has('data') && count($request->input('data')) > 0 ? 
                    array_keys($request->input('data')[0]) : []
            ]);
            
            // Log the first row if available for detailed inspection
            if ($request->has('data') && count($request->input('data')) > 0) {
                \Log::info('First row sample:', $request->input('data')[0]);
            }

            $request->validate([
                'data' => 'required|array',
                'data.*.tenderNumber' => 'nullable|string|max:255',
                'data.*.buyer' => 'nullable|string|max:255',
                'data.*.contact1' => 'nullable|string|max:255',
                'data.*.phone1' => 'nullable|string|max:255',
                'data.*.contact2' => 'nullable|string|max:255',
                'data.*.phone2' => 'nullable|string|max:255',
                'data.*.contact3' => 'nullable|string|max:255',
                'data.*.phone3' => 'nullable|string|max:255',
                'data.*.email' => 'nullable|string|max:255',
                'data.*.executor' => 'nullable|string|max:255',
                'data.*.idCode' => 'nullable|string|max:255',
                'data.*.contractValue' => 'nullable|string|max:255',
                'data.*.totalValueGorgia' => 'nullable|string|max:255',
                'data.*.lastPurchaseDateGorgia' => 'nullable|string|max:255',
                'data.*.contractEndDate' => 'nullable|string|max:255',
                'data.*.foundationDate' => 'nullable|string|max:255',
                'data.*.manager' => 'nullable|string|max:255',
                'data.*.managerNumber' => 'nullable|string|max:255',
                'data.*.status' => 'nullable|string|max:255',
            ]);

            // If this is an Excel upload (not a single create), truncate before insert
            $isExcelUpload = count($request->input('data', [])) > 1;

            if ($isExcelUpload) {
                CompanyExcelUpload::truncate();
            }

            foreach ($request->input('data') as $index => $row) {
                // Sanitize the data
                $sanitizedData = $this->sanitizeRow($row);
                
                // Special logging for special fields
                \Log::info("Row $index - Creating record with: ", [
                    'contact3' => $sanitizedData['contact3'] ?? 'NULL',
                    'phone3' => $sanitizedData['phone3'] ?? 'NULL',
                    'managerNumber' => $sanitizedData['managerNumber'] ?? 'NULL',
                ]);
                
                CompanyExcelUpload::create([
                    'tender_number' => $sanitizedData['tenderNumber'] ?? null,
                    'buyer' => $sanitizedData['buyer'] ?? null,
                    'contact1' => $sanitizedData['contact1'] ?? null,
                    'phone1' => $sanitizedData['phone1'] ?? null,
                    'contact2' => $sanitizedData['contact2'] ?? null,
                    'phone2' => $sanitizedData['phone2'] ?? null,
                    'contact3' => $sanitizedData['contact3'] ?? '',  // Empty string instead of null
                    'phone3' => $sanitizedData['phone3'] ?? '',      // Empty string instead of null
                    'email' => $sanitizedData['email'] ?? null,
                    'executor' => $sanitizedData['executor'] ?? null,
                    'id_code' => $sanitizedData['idCode'] ?? null,
                    'contract_value' => $sanitizedData['contractValue'] ?? null,
                    'total_value_gorgia' => $sanitizedData['totalValueGorgia'] ?? null,
                    'last_purchase_date_gorgia' => $sanitizedData['lastPurchaseDateGorgia'] ?? null,
                    'contract_end_date' => $sanitizedData['contractEndDate'] ?? null,
                    'foundation_date' => $sanitizedData['foundationDate'] ?? null,
                    'manager' => $sanitizedData['manager'] ?? null,
                    'manager_number' => $sanitizedData['managerNumber'] ?? null,
                    'status' => $sanitizedData['status'] ?? null,
                ]);
            }

            return response()->json(['message' => 'Company Excel data imported successfully'], 200);
        } catch (\Exception $e) {
            \Log::error('Error storing company uploads: ' . $e->getMessage());
            \Log::error('Error trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to store data: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $company = CompanyExcelUpload::findOrFail($id);
            $company->update($request->all());
            return response()->json(['message' => 'Record updated', 'data' => $company], 200);
        } catch (\Exception $e) {
            Log::error('Error updating company upload: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update record: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $company = CompanyExcelUpload::findOrFail($id);
            $company->delete();
            return response()->json(['message' => 'Record deleted'], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting company upload: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete record: ' . $e->getMessage()], 500);
        }
    }

    public function preview(Request $request)
    {
        try {
            if (!$request->hasFile('file')) {
                \Log::error('No file uploaded');
                return response()->json(['error' => 'No file uploaded'], 400);
            }

            $file = $request->file('file');
            \Log::info('Uploaded file info', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension(),
                'size' => $file->getSize(),
            ]);

            $allowed = ['xls', 'xlsx'];
            if (!in_array(strtolower($file->getClientOriginalExtension()), $allowed)) {
                \Log::error('Invalid file type: ' . $file->getClientOriginalExtension());
                return response()->json(['error' => 'Invalid file type. Only .xls and .xlsx allowed.'], 400);
            }

            if (!class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
                \Log::error('PhpSpreadsheet library is not installed');
                return response()->json(['error' => 'Server error: PhpSpreadsheet library is not installed'], 500);
            }

            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            if (empty($rows)) {
                \Log::warning('Excel file is empty');
                return response()->json(['data' => []], 200);
            }

            // Get the first row as headers
            $header = array_shift($rows);
            $header = array_map('trim', $header);
            
            // Debug: Dump the raw headers
            \Log::info('Raw Excel Headers:', $header);

            // Enhanced header mapping with more variations
            $headerMap = [
                // Standard headers
                'Tender Number' => 'tenderNumber',
                'Buyer' => 'buyer',
                'Contact Person #1' => 'contact1',
                'Phone #1' => 'phone1',
                'Tel #1' => 'phone1',
                'Contact Person #2' => 'contact2',
                'Phone #2' => 'phone2',
                'Tel #2' => 'phone2',
                'Contact Person #3' => 'contact3',
                'Phone #3' => 'phone3',
                'Tel #3' => 'phone3',
                'Email' => 'email',
                'Executor' => 'executor',
                'ID Code' => 'idCode',
                'Contract Value' => 'contractValue',
                'Total Value Gorgia' => 'totalValueGorgia',
                'Last Purchase Date Gorgia' => 'lastPurchaseDateGorgia',
                'Contract End Date' => 'contractEndDate',
                'Foundation Date' => 'foundationDate',
                'Manager' => 'manager',
                'Manager Number' => 'managerNumber',
                'Manager Phone' => 'managerNumber',
                'Manager Tel' => 'managerNumber',
                'Status' => 'status',
                
                // Add Georgian variations
                'მენეჯერის ნომერი' => 'managerNumber',
                'მენეჯერის ტელეფონი' => 'managerNumber',
                
                // Add Russian variations
                'Номер менеджера' => 'managerNumber',
                'Телефон менеджера' => 'managerNumber',
                
                // Add all possible variations for Contact Person #3 and Phone #3
                'საკ. პირი #3' => 'contact3',  // Georgian
                'ტელ #3' => 'phone3',          // Georgian
                'CONTACT PERSON #3' => 'contact3',
                'PHONE #3' => 'phone3',
                'TEL #3' => 'phone3',
                'contact person #3' => 'contact3',
                'phone #3' => 'phone3',
                'tel #3' => 'phone3',
                'Contact Person 3' => 'contact3',
                'Phone 3' => 'phone3',
                'Tel 3' => 'phone3',
                'Contact #3' => 'contact3',
                'Phone#3' => 'phone3',
                'Tel#3' => 'phone3',
                'Contact3' => 'contact3',
                'Phone3' => 'phone3',
                'Tel3' => 'phone3',
                'ContactPerson3' => 'contact3',
                'ContactPerson #3' => 'contact3',
                // Common typos/variations
                'Contact 3' => 'contact3',
                'Phone Number 3' => 'phone3',
                'Contact Person3' => 'contact3',
                'Contact-Person-3' => 'contact3',
                'Phone-3' => 'phone3',
            ];
            
            // More robust header normalization with case-insensitive matching
            $normalizedHeaders = [];
            $contact3Column = null;
            $phone3Column = null;
            $managerNumberColumn = null;
            
            // First pass - exact matches
            foreach ($header as $key => $value) {
                $trimmedValue = trim($value);
                if (isset($headerMap[$trimmedValue])) {
                    $normalizedHeaders[$key] = $headerMap[$trimmedValue];
                    // Track which columns map to special fields
                    if ($headerMap[$trimmedValue] === 'contact3') $contact3Column = $key;
                    if ($headerMap[$trimmedValue] === 'phone3') $phone3Column = $key;
                    if ($headerMap[$trimmedValue] === 'managerNumber') $managerNumberColumn = $key;
                } else {
                    $normalizedHeaders[$key] = $trimmedValue;
                }
            }
            
            // Second pass - case-insensitive matching
            if ($contact3Column === null || $phone3Column === null || $managerNumberColumn === null) {
                foreach ($header as $key => $value) {
                    $trimmedValue = trim($value);
                    foreach ($headerMap as $mapKey => $mapValue) {
                        if (($mapValue === 'contact3' && $contact3Column === null) || 
                            ($mapValue === 'phone3' && $phone3Column === null) ||
                            ($mapValue === 'managerNumber' && $managerNumberColumn === null)) {
                            if (strcasecmp($trimmedValue, $mapKey) === 0) {
                                $normalizedHeaders[$key] = $mapValue;
                                if ($mapValue === 'contact3') $contact3Column = $key;
                                if ($mapValue === 'phone3') $phone3Column = $key;
                                if ($mapValue === 'managerNumber') $managerNumberColumn = $key;
                            }
                        }
                    }
                }
            }
            
            // Third pass - look for partial matches
            if ($managerNumberColumn === null) {
                foreach ($header as $key => $value) {
                    $lowercaseValue = strtolower(trim($value));
                    
                    if ($contact3Column === null && 
                       ((strpos($lowercaseValue, 'contact') !== false || strpos($lowercaseValue, 'person') !== false) && 
                        (strpos($lowercaseValue, '3') !== false || strpos($lowercaseValue, 'three') !== false))) {
                        $normalizedHeaders[$key] = 'contact3';
                        $contact3Column = $key;
                        \Log::info("Detected contact3 column from: $value");
                    }
                    
                    if ($phone3Column === null && 
                       ((strpos($lowercaseValue, 'phone') !== false || strpos($lowercaseValue, 'tel') !== false) && 
                        (strpos($lowercaseValue, '3') !== false || strpos($lowercaseValue, 'three') !== false))) {
                        $normalizedHeaders[$key] = 'phone3';
                        $phone3Column = $key;
                        \Log::info("Detected phone3 column from: $value");
                    }
                    
                    if ($managerNumberColumn === null && 
                       ((strpos($lowercaseValue, 'manager') !== false || strpos($lowercaseValue, 'менеджер') !== false || strpos($lowercaseValue, 'მენეჯერ') !== false) && 
                        (strpos($lowercaseValue, 'number') !== false || strpos($lowercaseValue, 'phone') !== false || strpos($lowercaseValue, 'tel') !== false || 
                         strpos($lowercaseValue, 'номер') !== false || strpos($lowercaseValue, 'ნომერი') !== false))) {
                        $normalizedHeaders[$key] = 'managerNumber';
                        $managerNumberColumn = $key;
                        \Log::info("Detected managerNumber column from: $value");
                    }
                }
            }
            
            \Log::info('Column mapping:', [
                'contact3_column' => $contact3Column !== null ? $header[$contact3Column] : 'Not found',
                'phone3_column' => $phone3Column !== null ? $header[$phone3Column] : 'Not found',
                'managerNumber_column' => $managerNumberColumn !== null ? $header[$managerNumberColumn] : 'Not found',
                'normalized_headers' => $normalizedHeaders
            ]);

            // Process the data rows
            $data = [];
            foreach ($rows as $rowIndex => $row) {
                $item = [];
                
                // Direct mapping based on normalized headers
                foreach ($normalizedHeaders as $colKey => $fieldName) {
                    if (isset($row[$colKey]) && $row[$colKey] !== '') {
                        $item[$fieldName] = $row[$colKey];
                    }
                }
                
                // Directly extract special fields if columns were found
                if ($contact3Column !== null && isset($row[$contact3Column]) && $row[$contact3Column] !== '') {
                    $item['contact3'] = $row[$contact3Column];
                }
                
                if ($phone3Column !== null && isset($row[$phone3Column]) && $row[$phone3Column] !== '') {
                    $item['phone3'] = $row[$phone3Column];
                }
                
                if ($managerNumberColumn !== null && isset($row[$managerNumberColumn]) && $row[$managerNumberColumn] !== '') {
                    $item['managerNumber'] = $row[$managerNumberColumn];
                    \Log::info("Row $rowIndex - managerNumber: " . $row[$managerNumberColumn]);
                }
                
                // Ensure all required fields are present (with empty strings not nulls)
                foreach (array_unique($normalizedHeaders) as $fieldName) {
                    if (!isset($item[$fieldName])) {
                        $item[$fieldName] = '';
                    }
                }
                
                // Ensure special fields are explicitly set even if not in headers
                if (!isset($item['contact3'])) $item['contact3'] = '';
                if (!isset($item['phone3'])) $item['phone3'] = '';
                if (!isset($item['managerNumber'])) $item['managerNumber'] = '';
                
                $data[] = $item;
            }
            
            // Debug first row data
            if (count($data) > 0) {
                \Log::info('First row processed data:', $data[0]);
            }
            
            return response()->json(['data' => $data], 200);
        } catch (\Exception $e) {
            \Log::error('Excel preview error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to parse Excel: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Process and sanitize row data before saving
     */
    private function sanitizeRow($row)
    {
        // Make a copy so we don't modify the original
        $sanitized = $row;
        
        // Process email - make sure it's a valid email or null
        if (isset($sanitized['email']) && !empty($sanitized['email']) && !filter_var($sanitized['email'], FILTER_VALIDATE_EMAIL)) {
            $sanitized['email'] = null;
        }
        
        // Debug the row data for contact3 and phone3
        \Log::info('Row data for contact3/phone3/managerNumber:', [
            'contact3' => $row['contact3'] ?? 'not found',
            'phone3' => $row['phone3'] ?? 'not found',
            'managerNumber' => $row['managerNumber'] ?? 'not found',
            'row_keys' => array_keys($row)
        ]);
        
        // Ensure contact3, phone3 and managerNumber are preserved (not nullified)
        if (isset($row['contact3'])) {
            $sanitized['contact3'] = $row['contact3'];
        }
        
        if (isset($row['phone3'])) {
            $sanitized['phone3'] = $row['phone3'];
        }
        
        if (isset($row['managerNumber'])) {
            $sanitized['managerNumber'] = $row['managerNumber'];
        }
        
        // Convert empty strings to null values where appropriate,
        // but keep contact3, phone3, and managerNumber as is
        foreach ($sanitized as $key => $value) {
            if ($value === '' && !in_array($key, ['contact3', 'phone3', 'managerNumber'])) {
                $sanitized[$key] = null;
            }
        }
        
        return $sanitized;
    }
}
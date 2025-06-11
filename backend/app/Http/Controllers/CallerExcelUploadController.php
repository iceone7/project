<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ImportCompany;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CallerExcelUploadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['preview']);
    }

    public function index()
    {
        try {
            // Log that we're attempting to fetch data
            \Log::info('Fetching caller excel uploads');
            
            // Get all records with normalized field names
            $data = ImportCompany::all()->map(function($item) {
                return [
                    'id' => $item->id,
                    'company_name' => $item->company_name ?? '',
                    'identification_code' => $item->identification_code ?? '',
                    'contact_person1' => $item->contact_person1 ?? '',
                    'tel1' => $item->tel1 ?? '',
                    'contact_person2' => $item->contact_person2 ?? '',
                    'tel2' => $item->tel2 ?? '',
                    'contact_person3' => $item->contact_person3 ?? '',
                    'tel3' => $item->tel3 ?? '',
                    'caller_name' => $item->caller_name ?? '',
                    'caller_number' => $item->caller_number ?? '',
                    'receiver_name' => $item->receiver_name ?? '',
                    'receiver_number' => $item->receiver_number ?? '',
                    'call_count' => $item->call_count ?? 0,
                    'call_date' => $item->call_date ?? '',
                    'call_duration' => $item->call_duration ? $this->formatCallDuration($item->call_duration) : '',
                    'call_status' => $item->call_status ?? '',
                ];
            });
            
            \Log::info('Successfully fetched all caller data');
            
            return response()->json([
                'status' => 'success',
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Error fetching caller uploads: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch data: ' . $e->getMessage()
            ], 500);
        }
    }

    private function parseCallDuration($value)
    {
        // If it's numeric, assume it's already in seconds
        if (is_numeric($value)) {
            return (int) $value;
        }
        
        // If it's a string in HH:MM:SS format
        if (preg_match('/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/', $value, $matches)) {
            return (int)$matches[1] * 3600 + (int)$matches[2] * 60 + (int)$matches[3];
        }
        
        // If it's a string in MM:SS format
        if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $value, $matches)) {
            return (int)$matches[1] * 60 + (int)$matches[2];
        }
        
        // If it's stored as Excel time (decimal fraction of day)
        if (is_numeric($value) && $value < 1) {
            return (int) round($value * 86400); // convert day fraction to seconds
        }
        
        return null;
    }

    private function formatCallDuration($seconds)
    {
        if ($seconds === null) return '';
        return gmdate('H:i:s', $seconds);
    }

    public function store(Request $request)
    {
        try {
            // Log the request for debugging
            \Log::info('Received save request for caller data', [
                'has_data' => $request->has('data'),
                'data_count' => $request->has('data') ? count($request->input('data')) : 0
            ]);

            // Validate request data
            $validated = $request->validate([
                'data' => 'required|array',
                'data.*' => 'array'
            ]);
            
            $importedCount = 0;
            
            // Optional: Clear existing data before importing (based on requirements)
            // If you need to replace all data with the new import:
            ImportCompany::truncate();
            
            // Process each record
            foreach ($request->input('data') as $record) {
                try {
                    // Convert camelCase to snake_case and handle all possible field names
                    $call_duration = null;
                    if (isset($record['callDuration'])) {
                        $call_duration = $this->parseCallDuration($record['callDuration']);
                    } elseif (isset($record['call_duration'])) {
                        $call_duration = $this->parseCallDuration($record['call_duration']);
                    }
                    
                    $callCount = isset($record['callCount']) ? $record['callCount'] : (isset($record['call_count']) ? $record['call_count'] : 0);
                    
                    // Try to convert to integer
                    if (is_string($callCount)) {
                        $callCount = (int)preg_replace('/[^0-9]/', '', $callCount);
                    }
                    
                    $data = [
                        'company_name' => $record['companyName'] ?? $record['company_name'] ?? null,
                        'identification_code' => $record['identificationCode'] ?? $record['identification_code'] ?? $record['idCode'] ?? $record['id_code'] ?? null,
                        'contact_person1' => $record['contactPerson1'] ?? $record['contact_person1'] ?? null,
                        'tel1' => $record['tel1'] ?? $record['phone1'] ?? null,
                        'contact_person2' => $record['contactPerson2'] ?? $record['contact_person2'] ?? null,
                        'tel2' => $record['tel2'] ?? $record['phone2'] ?? null,
                        'contact_person3' => $record['contactPerson3'] ?? $record['contact_person3'] ?? '',
                        'tel3' => $record['tel3'] ?? $record['phone3'] ?? '',
                        'caller_name' => $record['callerName'] ?? $record['caller_name'] ?? null,
                        'caller_number' => $record['callerNumber'] ?? $record['caller_number'] ?? null,
                        'receiver_name' => $record['receiverName'] ?? $record['receiver_name'] ?? null,
                        'receiver_number' => $record['receiverNumber'] ?? $record['receiver_number'] ?? null,
                        'call_count' => $callCount,
                        'call_date' => $record['callDate'] ?? $record['call_date'] ?? null,
                        'call_duration' => $call_duration,
                        'call_status' => $record['callStatus'] ?? $record['call_status'] ?? null,
                    ];
                    
                    ImportCompany::create($data);
                    $importedCount++;
                } catch (\Exception $e) {
                    \Log::warning('Failed to import record: ' . $e->getMessage(), ['record' => $record]);
                    // Continue with next record instead of failing entire batch
                }
            }
            
            \Log::info("Successfully imported $importedCount caller records");
            
            return response()->json([
                'status' => 'success',
                'message' => "Successfully imported $importedCount records",
                'count' => $importedCount
            ], 200);
            
        } catch (\Exception $e) {
            \Log::error('Error saving caller data: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save data: ' . $e->getMessage()
            ], 500);
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
                'Company Name' => 'company_name',
                'ID Code' => 'identification_code',
                'Contact Person #1' => 'contact_person1',
                'Phone #1' => 'tel1',
                'Tel #1' => 'tel1',
                'Contact Person #2' => 'contact_person2',
                'Phone #2' => 'tel2',
                'Tel #2' => 'tel2',
                'Contact Person #3' => 'contact_person3',
                'Phone #3' => 'tel3',
                'Tel #3' => 'tel3',
                'Caller Name' => 'caller_name',
                'Caller Number' => 'caller_number',
                'Receiver Name' => 'receiver_name',
                'Receiver Number' => 'receiver_number',
                'Call Count' => 'call_count',
                'Call Date' => 'call_date',
                'Call Duration' => 'call_duration',
                'Call Status' => 'call_status',
                
                // Add all possible variations for caller fields
                'COMPANY NAME' => 'company_name',
                'company name' => 'company_name',
                'CompanyName' => 'company_name',
                'ID CODE' => 'identification_code',
                'id code' => 'identification_code',
                'IdCode' => 'identification_code',
                'CALLER NAME' => 'caller_name',
                'caller name' => 'caller_name',
                'CallerName' => 'caller_name',
                'CALLER NUMBER' => 'caller_number',
                'caller number' => 'caller_number',
                'CallerNumber' => 'caller_number',
                'RECEIVER NAME' => 'receiver_name',
                'receiver name' => 'receiver_name',
                'ReceiverName' => 'receiver_name',
                'RECEIVER NUMBER' => 'receiver_number',
                'receiver number' => 'receiver_number',
                'ReceiverNumber' => 'receiver_number',
                'CALL COUNT' => 'call_count',
                'call count' => 'call_count',
                'CallCount' => 'call_count',
                'CALL DATE' => 'call_date',
                'call date' => 'call_date',
                'CallDate' => 'call_date',
                'CALL DURATION' => 'call_duration',
                'call duration' => 'call_duration',
                'CallDuration' => 'call_duration',
                'CALL STATUS' => 'call_status',
                'call status' => 'call_status',
                'CallStatus' => 'call_status',
            ];
            
            // More robust header normalization with case-insensitive matching
            $normalizedHeaders = [];
            
            // First pass - exact matches
            foreach ($header as $key => $value) {
                if (!$value) continue;
                
                $trimmedValue = trim($value);
                if (isset($headerMap[$trimmedValue])) {
                    $normalizedHeaders[$key] = $headerMap[$trimmedValue];
                } else {
                    $normalizedHeaders[$key] = strtolower(str_replace(' ', '_', $trimmedValue));
                }
            }
            
            // Process the data rows
            $data = [];
            foreach ($rows as $rowIndex => $row) {
                if (count(array_filter($row, function($cell) { return !empty($cell); })) === 0) {
                    continue; // Skip entirely empty rows
                }
                
                $item = [];
                
                // Direct mapping based on normalized headers
                foreach ($normalizedHeaders as $colKey => $fieldName) {
                    if (isset($row[$colKey]) && $row[$colKey] !== '') {
                        $item[$fieldName] = $row[$colKey];
                    }
                }
                
                // Ensure some required fields are present with defaults
                $data[] = array_merge([
                    'company_name' => '',
                    'identification_code' => '',
                    'contact_person1' => '',
                    'tel1' => '',
                    'contact_person2' => '',
                    'tel2' => '',
                    'contact_person3' => '',
                    'tel3' => '',
                    'caller_name' => '',
                    'caller_number' => '',
                    'receiver_name' => '',
                    'receiver_number' => '',
                    'call_count' => 0,
                    'call_date' => '',
                    'call_duration' => '',
                    'call_status' => '',
                ], $item);
            }
            
            // Debug first row data
            if (count($data) > 0) {
                \Log::info('First row processed caller data:', $data[0]);
            }
            
            return response()->json([
                'status' => 'success',
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Excel preview error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'error' => 'Failed to parse Excel: ' . $e->getMessage()
            ], 500);
        }
    }
}

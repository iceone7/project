<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ImportCompany;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\DB;

class CallerExcelUploadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->except(['preview']);
    }

    public function index(Request $request)
    {
        try {
            \Log::info('Fetching caller excel uploads with date filtering', $request->all());
            
            $validated = $request->validate([
                'start_date' => 'nullable|string',
                'end_date' => 'nullable|string'
            ]);
            
            $query = ImportCompany::query();
            
            $hasDateFilters = ($request->has('start_date') && $request->filled('start_date')) || 
                            ($request->has('end_date') && $request->filled('end_date'));
            
            if (!$hasDateFilters) {
                $startDate = now()->subMonth()->startOfMonth()->format('Y-m-d');
                $endDate = now()->format('Y-m-d');
                $query->whereDate('call_date', '>=', $startDate)
                      ->whereDate('call_date', '<=', $endDate);
                \Log::info('No date filters provided. Using default range:', [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]);
            } else {
                if ($request->has('start_date') && $request->filled('start_date')) {
                    $startDate = $request->input('start_date');
                    if (preg_match('/^\d{2}\/\d{2}\/\d{2}$/', $startDate)) {
                        $parsedDate = \DateTime::createFromFormat('m/d/y', $startDate);
                        if ($parsedDate) {
                            $startDate = $parsedDate->format('Y-m-d');
                            \Log::info('Converted start_date to: ' . $startDate);
                        }
                    }
                    $query->whereDate('call_date', '>=', $startDate);
                    \Log::info('Filtering calls from: ' . $startDate);
                }
                
                if ($request->has('end_date') && $request->filled('end_date')) {
                    $endDate = $request->input('end_date');
                    if (preg_match('/^\d{2}\/\d{2}\/\d{2}$/', $endDate)) {
                        $parsedDate = \DateTime::createFromFormat('m/d/y', $endDate);
                        if ($parsedDate) {
                            $endDate = $parsedDate->format('Y-m-d');
                            \Log::info('Converted end_date to: ' . $endDate);
                        }
                    }
                    $query->whereDate('call_date', '<=', $endDate);
                    \Log::info('Filtering calls to: ' . $endDate);
                }
            }
            
            $querySql = $query->toSql();
            $bindings = $query->getBindings();
            \Log::info("Final query: $querySql", ['bindings' => $bindings]);
            
            $data = $query->get()->map(function($item) {
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
            
            \Log::info('Successfully fetched filtered caller data. Count: ' . count($data));
            
            if (count($data) === 0) {
                $sampleData = ImportCompany::selectRaw('MIN(call_date) as min_date, MAX(call_date) as max_date')
                    ->first();
                \Log::info('Date range in database:', [
                    'min_date' => $sampleData->min_date ?? 'none',
                    'max_date' => $sampleData->max_date ?? 'none',
                ]);
                
                $samples = ImportCompany::limit(3)->get(['id', 'call_date']);
                \Log::info('Sample call_date values:', $samples->toArray());
            }
            
            return response()->json([
                'status' => 'success',
                'data' => $data
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Error fetching caller uploads: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to fetch data: ' . $e->getMessage()
            ], 500);
        }
    }

    private function parseCallDuration($value)
    {
        if (is_numeric($value)) {
            return (int) $value;
        }
        
        if (preg_match('/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/', $value, $matches)) {
            return (int)$matches[1] * 3600 + (int)$matches[2] * 60 + (int)$matches[3];
        }
        
        if (preg_match('/^(\d{1,2}):(\d{1,2})$/', $value, $matches)) {
            return (int)$matches[1] * 60 + (int)$matches[2];
        }
        
        if (is_numeric($value) && $value < 1) {
            return (int) round($value * 86400);
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
            \Log::info('Received save request for caller data', [
                'has_data' => $request->has('data'),
                'data_count' => $request->has('data') ? count($request->input('data')) : 0
            ]);

            $validated = $request->validate([
                'data' => 'required|array',
                'data.*' => 'array'
            ]);
            
            $importedCount = 0;
            ImportCompany::truncate();
            
            foreach ($request->input('data') as $record) {
                try {
                    $call_duration = null;
                    if (isset($record['callDuration'])) {
                        $call_duration = $this->parseCallDuration($record['callDuration']);
                    } elseif (isset($record['call_duration'])) {
                        $call_duration = $this->parseCallDuration($record['call_duration']);
                    }
                    
                    $callCount = isset($record['callCount']) ? $record['callCount'] : (isset($record['call_count']) ? $record['call_count'] : 0);
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

            $header = array_shift($rows);
            $header = array_map('trim', $header);
            \Log::info('Raw Excel Headers:', $header);

            $headerMap = [
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
            
            $normalizedHeaders = [];
            foreach ($header as $key => $value) {
                if (!$value) continue;
                $trimmedValue = trim($value);
                if (isset($headerMap[$trimmedValue])) {
                    $normalizedHeaders[$key] = $headerMap[$trimmedValue];
                } else {
                    $normalizedHeaders[$key] = strtolower(str_replace(' ', '_', $trimmedValue));
                }
            }
            
            $data = [];
            foreach ($rows as $rowIndex => $row) {
                if (count(array_filter($row, function($cell) { return !empty($cell); })) === 0) {
                    continue;
                }
                
                $item = [];
                foreach ($normalizedHeaders as $colKey => $fieldName) {
                    if (isset($row[$colKey]) && $row[$colKey] !== '') {
                        $item[$fieldName] = $row[$colKey];
                    }
                }
                
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

    /**
     * Extract caller number from CDR record
     */
    private function extractCallerNumber($cdrRecord)
    {
        try {
            // Safely check if clid property exists before accessing it
            if (!isset($cdrRecord->clid) || empty($cdrRecord->clid)) {
                return isset($cdrRecord->src) ? $this->normalizeNumber($cdrRecord->src) : '';
            }
            
            // Check if caller number is in clid field (format: "Name" <number>)
            if (preg_match('/".*" <(.+)>/', $cdrRecord->clid, $matches)) {
                return $this->normalizeNumber($matches[1]);
            }
            
            // Otherwise use src field if available
            return isset($cdrRecord->src) ? $this->normalizeNumber($cdrRecord->src) : '';
        } catch (\Exception $e) {
            \Log::error('Error extracting caller number: ' . $e->getMessage());
            return '';  // Return empty string on error
        }
    }

    /**
     * Process Excel data and enrich it with CDR information
     * Implements company-specific call matching
     */
    public function processCdrData(Request $request)
    {
        try {
            $validated = $request->validate([
                'data' => 'required|array',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date'
            ]);

            \Log::info('Processing CDR data for Excel records', [
                'record_count' => count($request->input('data')),
                'date_range' => [$request->input('start_date'), $request->input('end_date')]
            ]);

            // Get Excel data and ensure we preserve all rows
            $rawExcelData = $request->input('data');
            $excelData = $rawExcelData; // Keep all rows without filtering
            
            \Log::info("Processing all " . count($excelData) . " records without removing duplicates");
            $processedData = [];
            
            // Handle case where there's no data
            if (empty($excelData)) {
                \Log::warning("No data to process");
                return response()->json([
                    'status' => 'success',
                    'data' => []
                ]);
            }
            
            // Collect all caller_numbers and phone numbers for querying
            $callerNumbers = [];
            $phoneNumbers = [];
            foreach ($excelData as $row) {
                $callerNumber = $this->normalizeNumber($row['caller_number'] ?? $row['callerNumber'] ?? '');
                if (!empty($callerNumber)) {
                    $callerNumbers[] = $callerNumber;
                }
                
                // Collect all phone numbers from the contact fields
                $phone1 = $this->normalizeNumber($row['tel1'] ?? $row['phone1'] ?? '');
                $phone2 = $this->normalizeNumber($row['tel2'] ?? $row['phone2'] ?? '');
                $phone3 = $this->normalizeNumber($row['tel3'] ?? $row['phone3'] ?? '');
                
                if (!empty($phone1)) $phoneNumbers[] = $phone1;
                if (!empty($phone2)) $phoneNumbers[] = $phone2;
                if (!empty($phone3)) $phoneNumbers[] = $phone3;
            }
            
            $callerNumbers = array_unique(array_filter($callerNumbers));
            $phoneNumbers = array_unique(array_filter($phoneNumbers));

            // Generate all possible formats for phone numbers
            $callerFormats = [];
            foreach ($callerNumbers as $number) {
                $callerFormats = array_merge($callerFormats, $this->generateNumberFormats($number));
            }
            
            $phoneFormats = [];
            foreach ($phoneNumbers as $number) {
                $phoneFormats = array_merge($phoneFormats, $this->generateNumberFormats($number));
            }
            
            $callerFormats = array_unique($callerFormats);
            $phoneFormats = array_unique($phoneFormats);

            \Log::info('Querying CDR with ' . count($callerFormats) . ' caller formats and ' . 
                      count($phoneFormats) . ' phone formats');

            // Query CDR database for matching records - with error handling
            try {
                $cdrQuery = DB::connection('asterisk')->table('cdr');
                
                // Only apply date filters if explicitly provided by the user
                if ($request->filled('start_date')) {
                    $cdrQuery->whereDate('calldate', '>=', $request->input('start_date'));
                    \Log::info("Filtering CDR from date: " . $request->input('start_date'));
                }
                
                if ($request->filled('end_date')) {
                    $cdrQuery->whereDate('calldate', '<=', $request->input('end_date'));
                    \Log::info("Filtering CDR to date: " . $request->input('end_date'));
                }
                
                // If no date filters, log that we're retrieving all data
                if (!$request->filled('start_date') && !$request->filled('end_date')) {
                    \Log::info("No date filters applied - retrieving all CDR data");
                }

                // Build query to match either caller numbers in clid/src OR phone numbers in dst
                $cdrQuery->where(function ($query) use ($callerFormats, $phoneFormats) {
                    // Match caller numbers in clid or src
                    if (!empty($callerFormats)) {
                        $query->orWhere(function ($q) use ($callerFormats) {
                            foreach ($callerFormats as $format) {
                                if (!empty($format)) {  // Ensure format isn't empty
                                    $q->orWhere('clid', 'LIKE', '%' . $format . '%')
                                      ->orWhere('src', $format);
                                }
                            }
                        });
                    }
                    
                    // Match phone numbers in dst
                    if (!empty($phoneFormats)) {
                        $query->orWhere(function ($q) use ($phoneFormats) {
                            foreach ($phoneFormats as $format) {
                                if (!empty($format)) {  // Ensure format isn't empty
                                    $q->orWhere('dst', $format);
                                }
                            }
                        });
                    }
                });

                $cdrRecords = $cdrQuery->orderBy('calldate', 'desc')->get();
                \Log::info('Found ' . count($cdrRecords) . ' CDR records for analysis');
            } catch (\Exception $e) {
                \Log::error('Database query error: ' . $e->getMessage());
                throw new \Exception('Failed to query CDR database: ' . $e->getMessage());
            }

            // Process each Excel row to find matching calls
            foreach ($excelData as $index => $row) {
                try {
                    $resultRow = $row;
                    $callerNumber = $this->normalizeNumber($row['caller_number'] ?? $row['callerNumber'] ?? '');
                    
                    // Skip if no caller number
                    if (empty($callerNumber)) {
                        $resultRow['call_count'] = 0;
                        $resultRow['answered_calls'] = 0;
                        $resultRow['no_answer_calls'] = 0;
                        $resultRow['busy_calls'] = 0;
                        $resultRow['call_date'] = '';
                        $resultRow['call_duration'] = '';
                        $resultRow['call_status'] = '';
                        $resultRow['hasRecentCalls'] = false;
                        $processedData[] = $resultRow;
                        continue;
                    }

                    // Build contact phone array
                    $contacts = [
                        [
                            'number' => $this->normalizeNumber($row['tel1'] ?? $row['phone1'] ?? ''),
                            'name' => $row['contact_person1'] ?? $row['contactPerson1'] ?? '',
                            'field' => 'tel1'
                        ],
                        [
                            'number' => $this->normalizeNumber($row['tel2'] ?? $row['phone2'] ?? ''),
                            'name' => $row['contact_person2'] ?? $row['contactPerson2'] ?? '',
                            'field' => 'tel2'
                        ],
                        [
                            'number' => $this->normalizeNumber($row['tel3'] ?? $row['phone3'] ?? ''),
                            'name' => $row['contact_person3'] ?? $row['contactPerson3'] ?? '',
                            'field' => 'tel3'
                        ]
                    ];
                    
                    // Filter out contacts with empty numbers
                    $contacts = array_filter($contacts, function($contact) {
                        return !empty($contact['number']);
                    });

                    // Track calls across all contacts with status breakdown
                    $allMatchedContacts = [];
                    $callerFormats = $this->generateNumberFormats($callerNumber);
                    
                    // Check all contacts even if we find matches
                    foreach ($contacts as $contact) {
                        if (empty($contact['number'])) continue;
                        
                        $contactFormats = $this->generateNumberFormats($contact['number']);
                        $contactCallCount = 0;
                        $answeredCalls = 0;
                        $noAnswerCalls = 0;
                        $busyCalls = 0;
                        $latestContactCall = null;
                        
                        foreach ($cdrRecords as $record) {
                            // Check if caller number matches src/clid
                            $recordCaller = $this->extractCallerNumber($record);
                            $callerMatches = false;
                            
                            foreach ($callerFormats as $format) {
                                if (!empty($format) && !empty($recordCaller) && 
                                    ($recordCaller === $format || 
                                     (isset($record->clid) && strpos($record->clid, $format) !== false))) {
                                    $callerMatches = true;
                                    break;
                                }
                            }
                            
                            // Check if contact number matches dst
                            $contactMatches = false;
                            foreach ($contactFormats as $format) {
                                if (!empty($format) && isset($record->dst) && $record->dst === $format) {
                                    $contactMatches = true;
                                    break;
                                }
                            }
                            
                            // If both match, we found a call where caller called contact
                            if ($callerMatches && $contactMatches) {
                                $contactCallCount++;
                                
                                // Increment counters based on call status
                                if (isset($record->disposition)) {
                                    switch ($record->disposition) {
                                        case 'ANSWERED':
                                            $answeredCalls++;
                                            break;
                                        case 'NO ANSWER':
                                            $noAnswerCalls++;
                                            break;
                                        case 'BUSY':
                                            $busyCalls++;
                                            break;
                                    }
                                }
                                
                                // Track latest call for this contact
                                if (!$latestContactCall || (isset($record->calldate) && 
                                    strtotime($record->calldate) > strtotime($latestContactCall->calldate))) {
                                    $latestContactCall = $record;
                                }
                            }
                        }
                        
                        // Only add to matches if we found calls
                        if ($contactCallCount > 0) {
                            $allMatchedContacts[] = [
                                'number' => $contact['number'],
                                'name' => $contact['name'],
                                'field' => $contact['field'],
                                'call_count' => $contactCallCount,
                                'answered_calls' => $answeredCalls,
                                'no_answer_calls' => $noAnswerCalls,
                                'busy_calls' => $busyCalls,
                                'latest_call' => $latestContactCall,
                                'receiver_number' => $row[$contact['field']] ?? $contact['number']
                            ];
                        }
                    }
                    
                    // Sort matched contacts by total call count (highest first)
                    usort($allMatchedContacts, function($a, $b) {
                        return $b['call_count'] - $a['call_count'];
                    });
                    
                    // Use the contact with highest call count as the primary
                    $primaryContact = !empty($allMatchedContacts) ? $allMatchedContacts[0] : null;
                    
                    // Update the result row with match data
                    if ($primaryContact) {
                        $resultRow['receiver_name'] = $primaryContact['name'];
                        $resultRow['receiver_number'] = $primaryContact['receiver_number'];
                        $resultRow['call_count'] = $primaryContact['call_count'];
                        $resultRow['answered_calls'] = $primaryContact['answered_calls'];
                        $resultRow['no_answer_calls'] = $primaryContact['no_answer_calls'];
                        $resultRow['busy_calls'] = $primaryContact['busy_calls'];
                        $resultRow['call_date'] = $primaryContact['latest_call']->calldate ?? '';
                        $resultRow['call_duration'] = isset($primaryContact['latest_call']->duration) ? 
                            $this->formatCallDuration((int)$primaryContact['latest_call']->duration) : '';
                        $resultRow['call_status'] = $primaryContact['latest_call']->disposition ?? '';
                        $resultRow['hasRecentCalls'] = true;
                        
                        \Log::info("Row $index: Found {$primaryContact['call_count']} calls from $callerNumber to {$primaryContact['receiver_number']} ({$primaryContact['name']})");
                        
                        // Store all matched contacts for reference
                        $resultRow['all_matched_contacts'] = $allMatchedContacts;
                    } else {
                        $resultRow['receiver_name'] = '';
                        $resultRow['receiver_number'] = '';
                        $resultRow['call_count'] = 0;
                        $resultRow['answered_calls'] = 0;
                        $resultRow['no_answer_calls'] = 0;
                        $resultRow['busy_calls'] = 0;
                        $resultRow['call_date'] = '';
                        $resultRow['call_duration'] = '';
                        $resultRow['call_status'] = '';
                        $resultRow['hasRecentCalls'] = false;
                        
                        \Log::info("Row $index: No matching calls found for caller $callerNumber");
                    }
                    
                    $processedData[] = $resultRow;
                } catch (\Exception $e) {
                    \Log::error("Error processing row $index: " . $e->getMessage());
                    // Add the row anyway to maintain data integrity
                    $processedData[] = $row;
                }
            }

            \Log::info('Successfully processed ' . count($processedData) . ' company records with call data');

            return response()->json([
                'status' => 'success',
                'data' => $processedData
            ]);

        } catch (\Exception $e) {
            \Log::error('Error processing CDR data: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to process CDR data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Normalize phone number by removing non-numeric characters
     */
    private function normalizeNumber($number)
    {
        // Remove all non-digit characters
        $normalized = preg_replace('/\D/', '', $number);
        
        // Check if the number is already normalized
        return $normalized;
    }

    /**
     * Generate all possible formats for a phone number
     */
    private function generateNumberFormats($number)
    {
        $formats = [];
        
        // Original format
        $formats[] = $number;
        
        // If the number starts with '995', also add without it
        if (strlen($number) > 9 && substr($number, 0, 3) === '995') {
            $formats[] = substr($number, 3);
        }
        
        // If the number doesn't start with '995', also add with it
        if (strlen($number) <= 9 && substr($number, 0, 3) !== '995') {
            $formats[] = '995' . $number;
        }
        
        // Add last 9 digits
        if (strlen($number) >= 9) {
            $formats[] = substr($number, -9);
        }
        
        return $formats;
    }
}
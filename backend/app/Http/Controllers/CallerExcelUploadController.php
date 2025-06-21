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
                    
                    // Preserve call_date exactly as provided in the Excel file without parsing/formatting
                    $callDate = $record['callDate'] ?? $record['call_date'] ?? null;
                    
                    // Log the actual value being saved
                    \Log::info('Storing call date value', [
                        'raw_value' => $callDate,
                        'company' => $record['companyName'] ?? $record['company_name'] ?? 'unknown'
                    ]);
                    
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
                        'call_date' => $callDate, // Store the original call date string
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
     * Process Excel data and enrich it with CDR information
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

            // Get Excel data
            $rawExcelData = $request->input('data');
            $excelData = $rawExcelData;
            
            \Log::info("Processing all " . count($excelData) . " records");
            $processedData = [];
            
            // Handle case where there's no data
            if (empty($excelData)) {
                \Log::warning("No data to process");
                return response()->json([
                    'status' => 'success',
                    'data' => []
                ]);
            }
            
            // Extract date range from Excel data - check all rows for date ranges
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $dateRangeFound = false;
            
            // Scan Excel data for any row that has a date range in call_date field
            foreach ($excelData as $row) {
                $callDate = $row['call_date'] ?? $row['callDate'] ?? null;
                if ($callDate && strpos($callDate, ' - ') !== false) {
                    list($start, $end) = explode(' - ', $callDate, 2);
                    
                    // Try to parse the dates
                    $parsedStart = date('Y-m-d', strtotime(trim($start)));
                    $parsedEnd = date('Y-m-d', strtotime(trim($end)));
                    
                    if ($parsedStart && $parsedEnd) {
                        $startDate = $parsedStart;
                        $endDate = $parsedEnd;
                        $dateRangeFound = true;
                        
                        \Log::info("Extracted date range from Call Date field:", [
                            'raw_value' => $callDate,
                            'start_date' => $startDate,
                            'end_date' => $endDate
                        ]);
                        
                        break; // Use the first valid date range found
                    }
                }
            }
            
            if ($dateRangeFound) {
                \Log::info("Using extracted date range for CDR query: $startDate to $endDate");
            } else {
                \Log::info("No date range found in Call Date field, using provided parameters or defaults");
            }
            
            \Log::info("Using date range for CDR query: {$startDate} to {$endDate}");
            
            // Create a lookup map for phone numbers to contact persons
            $phoneToContactMap = [];
            foreach ($excelData as $index => $row) {
                // Add tel1 -> contact_person1
                $phone1 = $this->normalizeNumber($row['tel1'] ?? $row['phone1'] ?? '');
                if (!empty($phone1)) {
                    $phoneToContactMap[$phone1] = [
                        'name' => $row['contactPerson1'] ?? $row['contact_person1'] ?? '',
                        'index' => $index
                    ];
                }
                
                // Add tel2 -> contact_person2
                $phone2 = $this->normalizeNumber($row['tel2'] ?? $row['phone2'] ?? '');
                if (!empty($phone2)) {
                    $phoneToContactMap[$phone2] = [
                        'name' => $row['contactPerson2'] ?? $row['contact_person2'] ?? '',
                        'index' => $index
                    ];
                }
                
                // Add tel3 -> contact_person3
                $phone3 = $this->normalizeNumber($row['tel3'] ?? $row['phone3'] ?? '');
                if (!empty($phone3)) {
                    $phoneToContactMap[$phone3] = [
                        'name' => $row['contactPerson3'] ?? $row['contact_person3'] ?? '',
                        'index' => $index
                    ];
                }
            }
            
            \Log::info("Built phone to contact mapping with " . count($phoneToContactMap) . " entries");
            
            // Collect ONLY caller numbers - not contact phone numbers
            $callerNumbers = [];
            
            foreach ($excelData as $row) {
                // Get caller number
                $callerNumber = $this->normalizeNumber($row['caller_number'] ?? $row['callerNumber'] ?? '');
                if (!empty($callerNumber)) {
                    $callerNumbers[] = $callerNumber;
                }
            }
            
            // Remove duplicates and empty values
            $callerNumbers = array_unique(array_filter($callerNumbers));
            
            \Log::info("Found " . count($callerNumbers) . " unique caller numbers");
            
            // Generate number formats for matching
            $callerFormats = [];
            foreach ($callerNumbers as $number) {
                $callerFormats = array_merge($callerFormats, $this->generateNumberFormats($number));
            }
            
            $callerFormats = array_unique($callerFormats);
            
            // Query Asterisk cdr table with the date range and caller number filters
            $cdrQuery = DB::connection('asterisk')->table('cdr');
            
            // Apply date filters if available
            if ($startDate) {
                $cdrQuery->whereDate('calldate', '>=', $startDate);
                \Log::info("Filtering CDR records from date: $startDate");
            }
            
            if ($endDate) {
                $cdrQuery->whereDate('calldate', '<=', $endDate);
                \Log::info("Filtering CDR records to date: $endDate");
            }
            
            // Build query to match ONLY caller numbers in src field
            $cdrQuery->where(function($query) use ($callerFormats) {
                foreach ($callerFormats as $format) {
                    if (!empty($format)) {
                        $query->orWhere('src', $format)
                              ->orWhere('clid', 'LIKE', '%' . $format . '%');
                    }
                }
            });
            
            // Execute query and get call records
            $cdrRecords = $cdrQuery->orderBy('calldate', 'desc')->get();
            
            \Log::info("Found " . count($cdrRecords) . " matching call records in date range");
            
            // Process each row of Excel data to find matching calls
            foreach ($excelData as $index => $row) {
                $callerNumber = $this->normalizeNumber($row['caller_number'] ?? $row['callerNumber'] ?? '');
                $callerFormats = !empty($callerNumber) ? $this->generateNumberFormats($callerNumber) : [];
                
                // If no caller number, skip this row
                if (empty($callerNumber)) {
                    $processedData[] = $row; // Keep the row unchanged
                    continue;
                }
                
                // Find matching calls for this caller number
                $matchingCalls = collect($cdrRecords)->filter(function($call) use ($callerFormats) {
                    // Check if caller matches src/clid
                    $callerMatches = false;
                    $recordCaller = $this->extractCallerNumber($call);
                    
                    foreach ($callerFormats as $format) {
                        if (!empty($format) && ($recordCaller === $format || 
                            (isset($call->clid) && strpos($call->clid, $format) !== false))) {
                            $callerMatches = true;
                            break;
                        }
                    }
                    
                    return $callerMatches;
                });
                
                if ($matchingCalls->isNotEmpty()) {
                    // Get all receiver numbers from calls
                    $receiverNumbers = $matchingCalls->pluck('dst')->unique()->toArray();
                    $normalizedReceiverNumbers = array_map([$this, 'normalizeNumber'], $receiverNumbers);
                    
                    // Extract phone numbers from the current row for validation
                    $tel1 = $this->normalizeNumber($row['tel1'] ?? $row['phone1'] ?? '');
                    $tel2 = $this->normalizeNumber($row['tel2'] ?? $row['phone2'] ?? '');
                    $tel3 = $this->normalizeNumber($row['tel3'] ?? $row['phone3'] ?? '');
                    $phoneNumbers = array_filter([$tel1, $tel2, $tel3]);
                    
                    // Find a valid receiver number that matches one of the phone numbers
                    $validReceiverNumber = null;
                    $validNormalizedReceiver = null;
                    
                    foreach ($normalizedReceiverNumbers as $index => $normalizedReceiver) {
                        // Generate variations of the receiver number for matching
                        $receiverFormats = $this->generateNumberFormats($normalizedReceiver);
                        
                        foreach ($receiverFormats as $format) {
                            if (in_array($format, $phoneNumbers)) {
                                $validReceiverNumber = $receiverNumbers[$index];
                                $validNormalizedReceiver = $normalizedReceiver;
                                \Log::info("Found valid receiver match: {$validReceiverNumber}");
                                break 2;
                            }
                        }
                    }
                    
                    // If no valid receiver found, set to N/A
                    if ($validReceiverNumber === null) {
                        $row['receiver_number'] = 'N/A';
                        $row['receiverNumber'] = 'N/A';
                        
                        // Set all call metrics to 0 since no valid receiver
                        $row['call_count'] = 0;
                        $row['callCount'] = 0;
                        $row['answered_calls'] = 0;
                        $row['answeredCalls'] = 0;
                        $row['no_answer_calls'] = 0;
                        $row['noAnswerCalls'] = 0;
                        $row['busy_calls'] = 0;
                        $row['busyCalls'] = 0;
                    } else {
                        // Use the valid receiver number
                        $row['receiver_number'] = $validReceiverNumber;
                        $row['receiverNumber'] = $validReceiverNumber;
                        
                        // Now count ONLY calls between this specific caller and the valid receiver
                        $specificCalls = $matchingCalls->filter(function($call) use ($validNormalizedReceiver) {
                            return $this->normalizeNumber($call->dst) === $validNormalizedReceiver;
                        });
                        
                        $callCount = count($specificCalls);
                        $answeredCount = $specificCalls->where('disposition', 'ANSWERED')->count();
                        $noAnswerCount = $specificCalls->where('disposition', 'NO ANSWER')->count();
                        $busyCount = $specificCalls->where('disposition', 'BUSY')->count();
                        
                        // Calculate total call duration by summing up billsec values for all ANSWERED calls
                        $totalDuration = 0;
                        foreach ($specificCalls->where('disposition', 'ANSWERED') as $call) {
                            $totalDuration += isset($call->billsec) ? $call->billsec : $call->duration;
                        }
                        
                        $row['call_count'] = $callCount;
                        $row['callCount'] = $callCount;
                        $row['answered_calls'] = $answeredCount;
                        $row['answeredCalls'] = $answeredCount;
                        $row['no_answer_calls'] = $noAnswerCount;
                        $row['noAnswerCalls'] = $noAnswerCount;
                        $row['busy_calls'] = $busyCount;
                        $row['busyCalls'] = $busyCount;
                        $row['total_duration'] = $totalDuration;
                        $row['totalDuration'] = $totalDuration;
                        
                        // Find matching contact person for this receiver number
                        $receiverName = '';
                        $companyIndex = null;
                        
                        // Check if the receiver number matches any phone in our mapping
                        foreach (['995' . $validNormalizedReceiver, $validNormalizedReceiver, substr($validNormalizedReceiver, -9)] as $format) {
                            if (isset($phoneToContactMap[$format])) {
                                $receiverName = $phoneToContactMap[$format]['name'];
                                $companyIndex = $phoneToContactMap[$format]['index'];
                                \Log::info("Found match for receiver number: {$validReceiverNumber} -> {$receiverName}");
                                break;
                            }
                        }
                        
                        // If we found a match in a different company row, add company name to receiver name
                        if ($companyIndex !== null && $companyIndex !== $index) {
                            $companyName = $excelData[$companyIndex]['company_name'] ?? 
                                          $excelData[$companyIndex]['companyName'] ?? '';
                            if ($companyName) {
                                $receiverName .= " (" . $companyName . ")";
                            }
                        }
                        
                        $row['receiver_name'] = $receiverName;
                        $row['receiverName'] = $receiverName;
                    }

                    // Get the latest call
                    $latestCall = $matchingCalls->sortByDesc('calldate')->first();
                    
                    // Store the original call date before updating
                    $originalCallDate = $row['call_date'] ?? $row['callDate'] ?? null;
                    
                    // Store the CDR call date in a separate field
                    $row['cdr_call_date'] = $latestCall->calldate;
                    $row['cdrCallDate'] = $latestCall->calldate;
                    
                    // Preserve the original call date if it exists
                    if (empty($originalCallDate)) {
                        // Only set the call date if it wasn't already present in the Excel
                        $row['call_date'] = $latestCall->calldate;
                        $row['callDate'] = $latestCall->calldate;
                    }
                    
                    // Format the total call duration
                    $row['call_duration'] = $this->formatCallDuration($row['total_duration'] ?? 0);
                    // Also keep the last call duration for reference
                    $row['last_call_duration'] = $latestCall->disposition === 'ANSWERED' ? 
                                            $this->formatCallDuration($latestCall->billsec ?? $latestCall->duration) : 
                                            '00:00:00';
                    $row['callDuration'] = $row['call_duration'];
                    $row['call_status'] = $latestCall->disposition;
                    $row['callStatus'] = $latestCall->disposition;
                }
                
                $processedData[] = $row;
            }
            
            return response()->json([
                'status' => 'success',
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'extracted_from_excel' => $dateRangeFound
                ],
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
     * Extract caller number from CDR record (from src or clid field)
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

    public function test(){
        $cdrQuery = DB::connection('asterisk')->table('cdr')->where('calldate', '>', now()->subDays(30));
        $company = ImportCompany::pluck('caller_number')->all();

        return response()->json([
            'status' => 'success',
            'data' => $company
        ], 200);
    }
}
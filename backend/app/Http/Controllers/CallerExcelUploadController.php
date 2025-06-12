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

    public function index(Request $request)
    {
        try {
            // Log that we're attempting to fetch data
            \Log::info('Fetching caller excel uploads with date filtering', $request->all());
            
            // Validate date parameters
            $validated = $request->validate([
                'start_date' => 'nullable|string',
                'end_date' => 'nullable|string'
            ]);
            
            // Build query with optional date filtering
            $query = ImportCompany::query();
            
            // If no dates provided, default to last month
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
                // Apply date filtering if provided with better date handling
                if ($request->has('start_date') && $request->filled('start_date')) {
                    $startDate = $request->input('start_date');
                    // Log the raw input date for debugging
                    \Log::info('Raw start_date input: ' . $startDate);
                    
                    // Check if we need to transform the date format (MM/DD/YY to YYYY-MM-DD)
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
                    // Log the raw input date for debugging
                    \Log::info('Raw end_date input: ' . $endDate);
                    
                    // Check if we need to transform the date format (MM/DD/YY to YYYY-MM-DD)
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
            
            // Get the SQL with bindings for debugging
            $querySql = $query->toSql();
            $bindings = $query->getBindings();
            \Log::info("Final query: $querySql", ['bindings' => $bindings]);
            
            // Get all records with date filtering applied
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
            
            // If we got zero results, log some data from the table to understand the values
            if (count($data) === 0) {
                $sampleData = ImportCompany::selectRaw('MIN(call_date) as min_date, MAX(call_date) as max_date')
                    ->first();
                \Log::info('Date range in database:', [
                    'min_date' => $sampleData->min_date ?? 'none',
                    'max_date' => $sampleData->max_date ?? 'none',
                ]);
                
                // Get a few sample records to check the date format
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

    /**
     * Process Excel data and enrich it with CDR information
     * This is the main method that implements the requested business logic
     */
    /**
 * Process Excel data and enrich it with CDR information
 */
    public function processCdrData(Request $request)
    {
        try {
            // Валидация запроса
            $validated = $request->validate([
                'data' => 'required|array',
                'start_date' => 'nullable|date',
                'end_date' => 'nullable|date'
            ]);

            \Log::info('Processing CDR data for Excel records', [
                'record_count' => count($request->input('data')),
                'date_range' => [$request->input('start_date'), $request->input('end_date')]
            ]);

            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            // Если даты не указаны, используем последний месяц
            if (!$startDate && !$endDate) {
                $startDate = now()->subMonth()->startOfMonth()->format('Y-m-d');
                $endDate = now()->format('Y-m-d');
                \Log::info('Using default date range', ['start' => $startDate, 'end' => $endDate]);
            }

            // Инициализация массива результатов
            $processedData = [];
            $callCounts = []; // Для подсчета звонков по парам caller-receiver

            // Шаг 1: Получаем все caller numbers из входных данных
            $callerNumbers = array_filter(array_map(function($item) {
                return $item['caller_number'] ?? $item['callerNumber'] ?? null;
            }, $request->input('data')));

            if (empty($callerNumbers)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No valid caller numbers found in the data'
                ], 400);
            }

            // Шаг 2: Запрашиваем CDR данные для этих номеров
            $cdrData = $this->fetchCdrDataForCallers($callerNumbers, $startDate, $endDate);
            \Log::info('Retrieved ' . count($cdrData) . ' CDR records');

            // Шаг 3: Создаем карту контактов для быстрого поиска имен
            $contactMap = $this->buildContactMap($request->input('data'));

            // Шаг 4: Обрабатываем каждую запись
            foreach ($request->input('data') as $record) {
                $callerNumber = $record['caller_number'] ?? $record['callerNumber'] ?? null;
                if (!$callerNumber) {
                    $processedData[] = $this->getEmptyProcessedRecord($record);
                    continue;
                }

                $normalizedCaller = $this->normalizeNumber($callerNumber);

                // Ищем CDR записи для этого caller
                $callerCdrRecords = array_filter($cdrData, function($cdr) use ($normalizedCaller) {
                    return $this->normalizeNumber($cdr['caller_number']) === $normalizedCaller;
                });

                // Инициализируем результирующую запись
                $processedRecord = array_merge($record, [
                    'call_count' => 0,
                    'call_date' => '',
                    'call_duration' => '',
                    'call_status' => '',
                    'receiver_name' => '',
                    'receiver_number' => ''
                ]);

                // Если есть CDR записи
                if (!empty($callerCdrRecords)) {
                    // Группируем по receiver_number для подсчета звонков
                    $receiverGroups = [];
                    foreach ($callerCdrRecords as $cdr) {
                        $receiverNumber = $this->normalizeNumber($cdr['receiver_number']);
                        $pairKey = $normalizedCaller . '_' . $receiverNumber;

                        if (!isset($receiverGroups[$receiverNumber])) {
                            $receiverGroups[$receiverNumber] = [
                                'count' => 0,
                                'latest_call' => null,
                                'total_duration' => 0
                            ];
                        }

                        $receiverGroups[$receiverNumber]['count']++;
                        $receiverGroups[$receiverNumber]['total_duration'] += $cdr['raw_duration'];
                        
                        // Сохраняем последнюю запись по времени
                        if (!$receiverGroups[$receiverNumber]['latest_call'] || 
                            strtotime($cdr['call_date']) > strtotime($receiverGroups[$receiverNumber]['latest_call']['call_date'])) {
                            $receiverGroups[$receiverNumber]['latest_call'] = $cdr;
                        }
                    }

                    // Находим receiver с наибольшим количеством звонков
                    $maxCalls = 0;
                    $bestReceiver = null;
                    foreach ($receiverGroups as $receiverNumber => $group) {
                        if ($group['count'] > $maxCalls) {
                            $maxCalls = $group['count'];
                            $bestReceiver = $group;
                        }
                    }

                    if ($bestReceiver) {
                        $receiverNumber = $bestReceiver['latest_call']['receiver_number'];
                        $normalizedReceiver = $this->normalizeNumber($receiverNumber);

                        // Ищем имя получателя в contactMap
                        $receiverName = $contactMap[$normalizedReceiver] ?? '';

                        $processedRecord['receiver_number'] = $receiverNumber;
                        $processedRecord['receiver_name'] = $receiverName;
                        $processedRecord['call_count'] = $bestReceiver['count'];
                        $processedRecord['call_date'] = $bestReceiver['latest_call']['call_date'];
                        $processedRecord['call_duration'] = $this->formatCallDuration($bestReceiver['latest_call']['raw_duration']);
                        $processedRecord['call_status'] = $bestReceiver['latest_call']['call_status'];
                    }
                }

                $processedData[] = $processedRecord;
            }

            \Log::info('Successfully processed CDR data. Final count: ' . count($processedData));
            
            return response()->json([
                'status' => 'success',
                'data' => $processedData,
                'cdr_count' => count($cdrData)
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
     * Build a contact map for quick lookup of names by phone number
     */
    private function buildContactMap($records)
    {
        $contactMap = [];
        
        foreach ($records as $record) {
            $contacts = [
                ['phone' => $record['tel1'] ?? $record['phone1'] ?? null, 'name' => $record['contact_person1'] ?? $record['contactPerson1'] ?? ''],
                ['phone' => $record['tel2'] ?? $record['phone2'] ?? null, 'name' => $record['contact_person2'] ?? $record['contactPerson2'] ?? ''],
                ['phone' => $record['tel3'] ?? $record['phone3'] ?? null, 'name' => $record['contact_person3'] ?? $record['contactPerson3'] ?? '']
            ];

            foreach ($contacts as $contact) {
                if ($contact['phone']) {
                    $normalizedPhone = $this->normalizeNumber($contact['phone']);
                    if ($normalizedPhone && $contact['name']) {
                        $contactMap[$normalizedPhone] = $contact['name'];
                    }
                }
            }
        }

        return $contactMap;
    }

    /**
     * Return an empty processed record with default values
     */
    private function getEmptyProcessedRecord($record)
    {
        return array_merge($record, [
            'call_count' => 0,
            'call_date' => '',
            'call_duration' => '',
            'call_status' => '',
            'receiver_name' => '',
            'receiver_number' => ''
        ]);
    }
    

    /**
     * Fetch CDR data for specific caller numbers within a date range
     */
    private function fetchCdrDataForCallers($callerNumbers, $startDate = null, $endDate = null)
    {
        $result = [];
        
        try {
            // Build query to search for all the caller numbers in the cdr table
            $query = \DB::connection('asterisk')
                    ->table('cdr');
            
            // Apply date filters if provided
            if ($startDate) {
                $query->whereDate('calldate', '>=', $startDate);
            }
            
            if ($endDate) {
                $query->whereDate('calldate', '<=', $endDate);
            }
            
            // Build condition for multiple possible caller numbers
            $query->where(function($q) use ($callerNumbers) {
                foreach ($callerNumbers as $number) {
                    // Normalize the number for consistent matching
                    $normalizedNumber = $this->normalizeNumber($number);
                    if (empty($normalizedNumber)) continue;
                    
                    // Generate possible number formats for better matching
                    $possibleFormats = $this->generateNumberFormats($normalizedNumber);
                    
                    foreach ($possibleFormats as $format) {
                        $q->orWhere('clid', 'LIKE', '%' . $format . '%');
                    }
                }
            });
            
            // Order by date (newest first) and get the records
            $cdrRecords = $query->orderBy('calldate', 'desc')->get();
            
            // Format the CDR records
            foreach ($cdrRecords as $record) {
                // Extract caller number from clid field
                $callerNumber = $record->src;
                if (preg_match('/".*" <(.+)>/', $record->clid, $matches)) {
                    $callerNumber = $matches[1];
                }
                
                $result[] = [
                    'id' => $record->uniqueid,
                    'caller_number' => $callerNumber,
                    'receiver_number' => $record->dst,
                    'call_date' => $record->calldate,
                    'call_duration' => $this->formatCallDuration((int)$record->duration),
                    'call_status' => $record->disposition,
                    'raw_duration' => (int)$record->duration
                ];
            }
            
            return $result;
        } catch (\Exception $e) {
            \Log::error('Error fetching CDR data: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Merge duplicate records (same caller & receiver) and update call count
     */
    private function mergeDuplicateRecords($records)
    {
        $uniqueRecords = [];
        $seenPairs = [];
        
        foreach ($records as $record) {
            $callerNumber = $record['caller_number'] ?? $record['callerNumber'] ?? '';
            $receiverNumber = $record['receiver_number'] ?? $record['receiverNumber'] ?? '';
            
            // Skip if either number is missing
            if (empty($callerNumber) || empty($receiverNumber)) {
                $uniqueRecords[] = $record;
                continue;
            }
            
            // Create a unique key for this caller-receiver pair
            $pairKey = $this->normalizeNumber($callerNumber) . '_' . $this->normalizeNumber($receiverNumber);
            
            if (!isset($seenPairs[$pairKey])) {
                // First time seeing this pair
                $seenPairs[$pairKey] = count($uniqueRecords);
                $uniqueRecords[] = $record;
            } else {
                // We've seen this pair before - update the existing record
                $index = $seenPairs[$pairKey];
                $existingRecord = $uniqueRecords[$index];
                
                // Increment call count
                $existingCallCount = (int)($existingRecord['call_count'] ?? $existingRecord['callCount'] ?? 0);
                $newCallCount = (int)($record['call_count'] ?? $record['callCount'] ?? 0);
                $uniqueRecords[$index]['call_count'] = $existingCallCount + $newCallCount;
                
                // Keep the more recent call date if available
                if (isset($record['call_date']) && isset($existingRecord['call_date'])) {
                    if (strtotime($record['call_date']) > strtotime($existingRecord['call_date'])) {
                        $uniqueRecords[$index]['call_date'] = $record['call_date'];
                        $uniqueRecords[$index]['call_duration'] = $record['call_duration'];
                        $uniqueRecords[$index]['call_status'] = $record['call_status'];
                    }
                }
            }
        }
        
        return array_values($uniqueRecords);
    }

    /**
     * Normalize a phone number for consistent matching
     */
    private function normalizeNumber($number)
    {
        if (empty($number)) return '';
        
        // Remove all non-digit characters
        $clean = preg_replace('/\D/', '', $number);
        
        // Remove leading zeros
        $clean = ltrim($clean, '0');
        
        return $clean;
    }

    /**
     * Generate various formats of a phone number for better matching
     */
    private function generateNumberFormats($number)
    {
        $formats = [$number];
        
        // Last 9 digits
        if (strlen($number) > 9) {
            $formats[] = substr($number, -9);
        }
        
        // Country code variations
        if (strlen($number) == 9) {
            $formats[] = '995' . $number;
        } elseif (strlen($number) > 9 && substr($number, 0, 3) == '995') {
            $formats[] = substr($number, 3);
        }
        
        return $formats;
    }
}

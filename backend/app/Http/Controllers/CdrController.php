<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CdrController extends Controller
{
    public function index()
    {
        try {
            $cdr = DB::connection('asterisk')->table('cdr')
                    ->orderBy('calldate', 'desc')
                    ->limit(1000)
                    ->get();
            
            return $cdr;
        } catch (\Exception $e) {
            Log::error('Error fetching CDR data: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch CDR data: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Get enhanced call data for a list of caller numbers
     */
    public function getCallerData(Request $request)
    {
        try {
            $callerNumbers = $request->input('callerNumbers', []);
            
            if (empty($callerNumbers)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ]);
            }
            
            Log::info('Getting call data for callers:', [
                'caller_count' => count($callerNumbers),
                'first_caller' => $callerNumbers[0] ?? 'none'
            ]);
            
            // Normalize the numbers for consistent matching
            $callerNumbers = array_map(function($number) {
                return $this->normalizePhoneNumber($number);
            }, $callerNumbers);
            
            // Response structure to hold data for each caller
            $response = [];
            
            foreach ($callerNumbers as $callerNumber) {
                // Get the calls for this caller
                $calls = $this->getCallsByCallerNumber($callerNumber);
                
                if (count($calls) > 0) {
                    // Extract call metrics
                    $callCount = count($calls);
                    $answeredCalls = collect($calls)->where('disposition', 'ANSWERED')->count();
                    $noAnswerCalls = collect($calls)->where('disposition', 'NO ANSWER')->count();
                    $busyCalls = collect($calls)->where('disposition', 'BUSY')->count();
                    
                    // Get the latest call
                    $latestCall = $calls[0]; // Assuming calls are already sorted by date desc
                    
                    // Format the duration
                    $formattedDuration = $this->formatCallDuration($latestCall->duration, $latestCall->disposition);
                    
                    // Store the call data for this caller
                    $response[$callerNumber] = [
                        'callCount' => $callCount,
                        'answeredCalls' => $answeredCalls,
                        'noAnswerCalls' => $noAnswerCalls,
                        'busyCalls' => $busyCalls,
                        'lastCallDate' => $latestCall->calldate,
                        'lastCallStatus' => $latestCall->disposition,
                        'formattedDuration' => $formattedDuration,
                        'receiverNumber' => $latestCall->dst,
                        'receiverName' => '' // Will be filled in from Excel data
                    ];
                } else {
                    // No calls found for this caller
                    $response[$callerNumber] = [
                        'callCount' => 0,
                        'answeredCalls' => 0,
                        'noAnswerCalls' => 0,
                        'busyCalls' => 0,
                        'lastCallDate' => '',
                        'lastCallStatus' => '',
                        'formattedDuration' => '',
                        'receiverNumber' => '',
                        'receiverName' => ''
                    ];
                }
            }
            
            return response()->json([
                'success' => true,
                'data' => $response
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting caller data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to get caller data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get enhanced caller data with date range support
     */
    public function getEnhancedCallerData(Request $request)
    {
        try {
            $validated = $request->validate([
                'callerNumbers' => 'required|array',
                'dateRange' => 'nullable|string'
            ]);
            
            $callerNumbers = $request->input('callerNumbers', []);
            $dateRange = $request->input('dateRange', '');
            
            // Parse date range if provided (format: "2025-06-10 - 2025-06-17")
            $startDate = null;
            $endDate = null;
            
            if (!empty($dateRange) && strpos($dateRange, '-') !== false) {
                list($startDateStr, $endDateStr) = explode('-', $dateRange, 2);
                $startDate = date('Y-m-d', strtotime(trim($startDateStr)));
                $endDate = date('Y-m-d', strtotime(trim($endDateStr)));
            }
            
            Log::info('Getting enhanced caller data with date range', [
                'caller_count' => count($callerNumbers),
                'date_range' => $dateRange,
                'parsed_start_date' => $startDate,
                'parsed_end_date' => $endDate
            ]);
            
            // Build query using asterisk database connection
            $query = DB::connection('asterisk')->table('cdr')->orderBy('calldate', 'desc');
            
            // Add date range filter if provided
            if ($startDate) {
                $query->whereDate('calldate', '>=', $startDate);
            }
            
            if ($endDate) {
                $query->whereDate('calldate', '<=', $endDate);
            }
            
            // Format numbers for query
            $normalizedCallerNumbers = array_map(function($number) {
                return $this->normalizePhoneNumber($number);
            }, $callerNumbers);
            
            // Add caller number filter - ONLY match against src field (Caller Number)
            if (!empty($normalizedCallerNumbers)) {
                $query->where(function($q) use ($normalizedCallerNumbers) {
                    foreach ($normalizedCallerNumbers as $number) {
                        if (!empty($number)) {
                            $q->orWhere('src', $number)
                              ->orWhere('clid', 'LIKE', '%' . $number . '%');
                        }
                    }
                });
            }
            
            // Execute the query and get the results
            $calls = $query->get();
            
            // Process the results - this now only uses caller info, not phone matching
            $processedData = $this->processCdrResultsWithoutPhoneMatching($calls, $normalizedCallerNumbers);
            
            return response()->json([
                'success' => true,
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'call_count' => count($calls),
                'data' => $processedData
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting enhanced caller data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to get enhanced caller data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Process CDR results without phone number matching
     */
    private function processCdrResultsWithoutPhoneMatching($calls, $callerNumbers)
    {
        // Group calls by caller number only
        $callerStats = [];
        
        foreach ($calls as $call) {
            $caller = $this->extractCallerNumber($call);
            
            // Initialize caller data if needed
            if (!isset($callerStats[$caller])) {
                $callerStats[$caller] = [
                    'calls' => [],
                    'callCount' => 0,
                    'answeredCalls' => 0,
                    'noAnswerCalls' => 0,
                    'busyCalls' => 0,
                    'lastCall' => null
                ];
            }
            
            // Add call to the list
            $callerStats[$caller]['calls'][] = $call;
            $callerStats[$caller]['callCount']++;
            
            // Track call status
            switch ($call->disposition) {
                case 'ANSWERED':
                    $callerStats[$caller]['answeredCalls']++;
                    break;
                case 'NO ANSWER':
                    $callerStats[$caller]['noAnswerCalls']++;
                    break;
                case 'BUSY':
                    $callerStats[$caller]['busyCalls']++;
                    break;
            }
            
            // Update last call if this is the newest one
            if (!$callerStats[$caller]['lastCall'] || 
                strtotime($call->calldate) > strtotime($callerStats[$caller]['lastCall']->calldate)) {
                $callerStats[$caller]['lastCall'] = $call;
            }
        }
        
        // Format each caller's data
        $result = [];
        foreach ($callerStats as $caller => $stats) {
            $lastCall = $stats['lastCall'];
            
            if ($lastCall) {
                $result[$caller] = [
                    'callerNumber' => $caller,
                    'receiverNumber' => $lastCall->dst,
                    'callCount' => $stats['callCount'],
                    'answeredCalls' => $stats['answeredCalls'],
                    'noAnswerCalls' => $stats['noAnswerCalls'],
                    'busyCalls' => $stats['busyCalls'],
                    'callDate' => $lastCall->calldate,
                    'callDuration' => $this->formatCallDuration($lastCall->duration, $lastCall->disposition),
                    'callStatus' => $lastCall->disposition
                ];
            }
        }
        
        return $result;
    }
    
    /**
     * Get live CDR data with date filtering support
     */
    public function getLiveCdrData(Request $request)
    {
        try {
            // Validate and extract date filters
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $since = $request->input('since'); // Timestamp for incremental updates
            
            Log::info('Getting live CDR data with filters', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'since' => $since
            ]);
            
            // Build query using Asterisk cdr table
            $query = DB::connection('asterisk')->table('cdr')->orderBy('calldate', 'desc');
                      
            // Apply date filters
            if ($startDate) {
                $query->whereDate('calldate', '>=', $startDate);
            }
            
            if ($endDate) {
                $query->whereDate('calldate', '<=', $endDate);
            }
            
            // For incremental updates, filter by timestamp
            if ($since) {
                $query->where('calldate', '>=', $since);
            }
            
            // Execute query and get results
            $cdrRecords = $query->get();
            
            // Process each record to extract caller information
            $processedRecords = collect($cdrRecords)->map(function($record) {
                // Ensure calldate includes time part and is in a standard format
                $formattedCallDate = date('Y-m-d H:i:s', strtotime($record->calldate));
                
                return [
                    'cdr_id' => $record->uniqueid,
                    'callerNumber' => $this->extractCallerNumber($record),
                    'receiverNumber' => $record->dst,
                    'callDate' => $formattedCallDate, // Standardized format with time
                    'rawDuration' => $record->duration,
                    'formattedDuration' => $this->formatCallDuration($record->duration, $record->disposition),
                    'callStatus' => $record->disposition,
                    'recordingfile' => $record->recordingfile ?? '',
                ];
            });
            
            return response()->json([
                'success' => true,
                'timestamp' => now()->toDateTimeString(),
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'data' => $processedRecords
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting live CDR data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to get live CDR data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get calls by caller number
     */
    private function getCallsByCallerNumber($callerNumber)
    {
        // Generate variations of the caller number for matching
        $numberFormats = $this->generateNumberFormats($callerNumber);
        
        // Build query using Asterisk cdr table
        $query = DB::connection('asterisk')->table('cdr')->where(function($q) use ($numberFormats) {
                foreach ($numberFormats as $format) {
                    if (!empty($format)) {
                        // Only search in src field and clid field
                        $q->orWhere('src', $format)
                          ->orWhere('clid', 'LIKE', '%' . $format . '%');
                    }
                }
            })
            ->orderBy('calldate', 'desc');
                
        return $query->get();
    }
    
    /**
     * Extract caller number from clid or src field
     */
    private function extractCallerNumber($cdrRecord)
    {
        // First try to extract from clid (format: "Name" <number>)
        if (isset($cdrRecord->clid) && preg_match('/".*" <(.+)>/', $cdrRecord->clid, $matches)) {
            return $this->normalizePhoneNumber($matches[1]);
        }
        
        // Otherwise use src field (the actual caller number)
        return isset($cdrRecord->src) ? $this->normalizePhoneNumber($cdrRecord->src) : '';
    }
    
    /**
     * Format call duration from seconds to HH:MM:SS
     * Returns empty string if disposition is not ANSWERED
     */
    private function formatCallDuration($seconds, $disposition = null)
    {
        // For NO ANSWER or BUSY calls, return empty duration string
        if ($disposition && ($disposition === 'NO ANSWER' || $disposition === 'BUSY')) {
            return '00:00:00';
        }
        
        if (!$seconds) return '00:00:00';
        return sprintf('%02d:%02d:%02d', 
            floor($seconds / 3600),
            floor(($seconds / 60) % 60),
            $seconds % 60
        );
    }
    
    /**
     * Normalize phone number by removing non-numeric characters
     */
    private function normalizePhoneNumber($number)
    {
        return preg_replace('/\D/', '', $number);
    }
    
    /**
     * Generate different formats of a phone number for searching
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
        
        return $formats;
    }
    
    /**
     * Debug endpoint to check raw CDR data
     */
    public function debugCdrData(Request $request)
    {
        try {
            // Get parameters with defaults
            $limit = $request->input('limit', 20);
            $startDate = $request->input('start_date', now()->subDays(7)->format('Y-m-d'));
            $endDate = $request->input('end_date', now()->format('Y-m-d'));
            
            // Log the request
            Log::info('Debug CDR data request', [
                'limit' => $limit,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            // Check database connection
            try {
                DB::connection('asterisk')->getPdo();
                $connectionStatus = 'Connected successfully to Asterisk database';
            } catch (\Exception $e) {
                $connectionStatus = 'Connection failed: ' . $e->getMessage();
                Log::error('Asterisk DB connection error: ' . $e->getMessage());
            }
            
            // Attempt to get data
            $rawData = [];
            $error = null;
            
            try {
                $query = DB::connection('asterisk')->table('cdr')
                    ->orderBy('calldate', 'desc')
                    ->limit($limit);
                
                if ($startDate) {
                    $query->whereDate('calldate', '>=', $startDate);
                }
                
                if ($endDate) {
                    $query->whereDate('calldate', '<=', $endDate);
                }
                
                $rawData = $query->get();
            } catch (\Exception $e) {
                $error = $e->getMessage();
                Log::error('Error fetching debug CDR data: ' . $e->getMessage());
            }
            
            return response()->json([
                'connection_status' => $connectionStatus,
                'error' => $error,
                'data_count' => count($rawData),
                'raw_data' => $rawData
            ]);
        } catch (\Exception $e) {
            Log::error('Debug CDR endpoint error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Debug endpoint error: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get recordings for a specific caller number
     */
    public function getRecordingsByCallerNumber($callerNumber)
    {
        try {
            // Normalize the caller number
            $normalizedNumber = $this->normalizePhoneNumber($callerNumber);
            
            // Generate different formats of the number for searching
            $numberFormats = $this->generateNumberFormats($normalizedNumber);
            
            Log::info('Getting recordings for caller number', [
                'original' => $callerNumber,
                'normalized' => $normalizedNumber,
                'formats' => $numberFormats
            ]);
            
            // Build query to find recordings for this caller
            $query = DB::connection('asterisk')->table('cdr')
                ->where(function($q) use ($numberFormats) {
                    foreach ($numberFormats as $format) {
                        if (!empty($format)) {
                            $q->orWhere('src', $format)
                              ->orWhere('clid', 'LIKE', '%' . $format . '%');
                        }
                    }
                })
                ->whereNotNull('recordingfile')
                ->where('recordingfile', '!=', '')
                ->orderBy('calldate', 'desc')
                ->limit(20); // Limit to most recent 20 recordings
            
            $recordings = $query->get();
            
            Log::info('Found recordings for caller', [
                'caller' => $callerNumber,
                'count' => count($recordings)
            ]);
            
            return response()->json([
                'success' => true,
                'caller_number' => $callerNumber,
                'recordings' => $recordings->map(function($recording) {
                    return [
                        'calldate' => $recording->calldate,
                        'duration' => $recording->duration,
                        'formattedDuration' => $this->formatCallDuration($recording->duration, $recording->disposition),
                        'disposition' => $recording->disposition,
                        'recordingfile' => $recording->recordingfile,
                        'dst' => $recording->dst,
                        'uniqueid' => $recording->uniqueid
                    ];
                })
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching recordings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to get recordings: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get recordings for a specific caller-receiver pair
     */
    public function getCallerRecordings(Request $request)
    {
        try {
            $callerNumber = $request->input('callerNumber');
            $receiverNumber = $request->input('receiverNumber');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            
            Log::info('Getting recordings for caller-receiver pair with date range', [
                'caller' => $callerNumber,
                'receiver' => $receiverNumber,
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            if (empty($receiverNumber)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Receiver number is required',
                    'recordings' => []
                ]);
            }
            
            // Generate different formats for caller and receiver numbers
            $callerFormats = !empty($callerNumber) ? $this->generateNumberFormats($callerNumber) : [];
            $receiverFormats = !empty($receiverNumber) ? $this->generateNumberFormats($receiverNumber) : [];
            
            // Build the query
            $query = DB::connection('asterisk')->table('cdr')
                ->whereNotNull('recordingfile')
                ->where('recordingfile', '!=', '')
                ->orderBy('calldate', 'desc');
            
            // Apply date filtering if provided - properly handle both YYYY-MM-DD format and other formats
            if (!empty($startDate)) {
                try {
                    // Try to parse the date in various formats
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                        // Already in YYYY-MM-DD format
                        $query->whereDate('calldate', '>=', $startDate);
                    } else {
                        // Try to parse in common formats
                        $parsedDate = date('Y-m-d', strtotime($startDate));
                        if ($parsedDate && $parsedDate !== '1970-01-01') {
                            $query->whereDate('calldate', '>=', $parsedDate);
                            Log::info("Converted start date from {$startDate} to {$parsedDate}");
                        }
                    }
                    Log::info("Filtering recordings by start date: {$startDate}");
                } catch (\Exception $e) {
                    Log::warning("Failed to parse start date: {$startDate}", ['error' => $e->getMessage()]);
                }
            }
            
            if (!empty($endDate)) {
                try {
                    // Try to parse the date in various formats
                    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                        // Already in YYYY-MM-DD format
                        $query->whereDate('calldate', '<=', $endDate);
                    } else {
                        // Try to parse in common formats
                        $parsedDate = date('Y-m-d', strtotime($endDate));
                        if ($parsedDate && $parsedDate !== '1970-01-01') {
                            $query->whereDate('calldate', '<=', $parsedDate);
                            Log::info("Converted end date from {$endDate} to {$parsedDate}");
                        }
                    }
                    Log::info("Filtering recordings by end date: {$endDate}");
                } catch (\Exception $e) {
                    Log::warning("Failed to parse end date: {$endDate}", ['error' => $e->getMessage()]);
                }
            }
            
            // Filter by receiver number - this is required
            $query->where(function($q) use ($receiverFormats) {
                foreach ($receiverFormats as $format) {
                    if (!empty($format)) {
                        $q->orWhere('dst', $format);
                    }
                }
            });
            
            // Filter by caller number if provided
            if (!empty($callerFormats)) {
                $query->where(function($q) use ($callerFormats) {
                    foreach ($callerFormats as $format) {
                        if (!empty($format)) {
                            $q->orWhere('src', $format)
                              ->orWhere('clid', 'LIKE', '%' . $format . '%');
                        }
                    }
                });
            }
            
            // Log the query
            $querySql = $query->toSql();
            Log::info("Recordings query SQL: {$querySql}", [
                'bindings' => $query->getBindings()
            ]);
            
            // Execute the query
            $recordings = $query->get();
            
            Log::info('Found recordings with date filtering', [
                'count' => count($recordings),
                'caller' => $callerNumber,
                'receiver' => $receiverNumber,
                'date_range' => "{$startDate} to {$endDate}"
            ]);
            
            return response()->json([
                'success' => true,
                'caller_number' => $callerNumber,
                'receiver_number' => $receiverNumber,
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ],
                'recordings' => $recordings->map(function($recording) {
                    return [
                        'calldate' => $recording->calldate,
                        'duration' => $recording->duration,
                        'formattedDuration' => $this->formatCallDuration($recording->duration, $recording->disposition),
                        'disposition' => $recording->disposition,
                        'recordingfile' => $recording->recordingfile,
                        'dst' => $recording->dst,
                        'src' => $recording->src,
                        'clid' => $recording->clid,
                        'uniqueid' => $recording->uniqueid
                    ];
                })
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching caller recordings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch recordings: ' . $e->getMessage(),
                'recordings' => []
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CdrController extends Controller
{
    public function index()
    {
        try {
            $cdr = CallRecord::orderBy('calldate', 'desc')
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
                
                if ($calls->isNotEmpty()) {
                    // Extract call metrics
                    $callCount = count($calls);
                    $answeredCalls = $calls->where('disposition', 'ANSWERED')->count();
                    $noAnswerCalls = $calls->where('disposition', 'NO ANSWER')->count();
                    $busyCalls = $calls->where('disposition', 'BUSY')->count();
                    
                    // Get the latest call
                    $latestCall = $calls->first(); // Assuming calls are already sorted by date desc
                    
                    // Format the duration
                    $formattedDuration = $this->formatCallDuration($latestCall->duration);
                    
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

        $startDate = null;
        $endDate = null;

        if (!empty($dateRange) && strpos($dateRange, '-') !== false) {
            list($startDateStr, $endDateStr) = explode('-', $dateRange, 2);
            $startDate = date('Y-m-d', strtotime(trim($startDateStr)));
            $endDate = date('Y-m-d', strtotime(trim($endDateStr)));
        }

        \Log::info('Getting enhanced caller data with date range', [
            'caller_count' => count($callerNumbers),
            'date_range' => $dateRange,
            'parsed_start_date' => $startDate,
            'parsed_end_date' => $endDate
        ]);

        // Normalize caller numbers
        $normalizedCallerNumbers = array_map(function($number) {
            return $this->normalizePhoneNumber($number);
        }, $callerNumbers);

        // Build query
        $query = CallRecord::orderBy('calldate', 'desc');
        if ($startDate) {
            $query->whereDate('calldate', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('calldate', '<=', $endDate);
        }

        // Match only on src or clid fields
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

        $calls = $query->get();
        \Log::info("Found " . count($calls) . " matching calls for " . count($normalizedCallerNumbers) . " caller numbers");

        // Process results
        $processedData = [];
        foreach ($normalizedCallerNumbers as $callerNumber) {
            $matchingCalls = $calls->filter(function($call) use ($callerNumber) {
                $recordCaller = $this->extractCallerNumber($call);
                return $recordCaller === $callerNumber || 
                       (isset($call->clid) && strpos($call->clid, $callerNumber) !== false);
            });

            if ($matchingCalls->isNotEmpty()) {
                $callCount = count($matchingCalls);
                $answeredCount = $matchingCalls->where('disposition', 'ANSWERED')->count();
                $noAnswerCount = $matchingCalls->where('disposition', 'NO ANSWER')->count();
                $busyCount = $matchingCalls->where('disposition', 'BUSY')->count();
                $latestCall = $matchingCalls->sortByDesc('calldate')->first();

                $processedData[$callerNumber] = [
                    'callerNumber' => $callerNumber,
                    'receiverNumber' => $latestCall->dst,
                    'callCount' => $callCount,
                    'answeredCalls' => $answeredCount,
                    'noAnswerCalls' => $noAnswerCount,
                    'busyCalls' => $busyCount,
                    'callDate' => $latestCall->calldate,
                    'callDuration' => $this->formatCallDuration($latestCall->duration),
                    'callStatus' => $latestCall->disposition
                ];

                \Log::info("Processed data for caller $callerNumber", [
                    'call_count' => $callCount,
                    'receiver_number' => $latestCall->dst,
                    'call_date' => $latestCall->calldate
                ]);
            } else {
                $processedData[$callerNumber] = [
                    'callerNumber' => $callerNumber,
                    'receiverNumber' => '',
                    'callCount' => 0,
                    'answeredCalls' => 0,
                    'noAnswerCalls' => 0,
                    'busyCalls' => 0,
                    'callDate' => '',
                    'callDuration' => '',
                    'callStatus' => ''
                ];
                \Log::info("No calls found for caller $callerNumber");
            }
        }

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
        \Log::error('Error getting enhanced caller data: ' . $e->getMessage());
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
                    'callDuration' => $this->formatCallDuration($lastCall->duration),
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
            
            // Build query using local CallRecord model
            $query = CallRecord::orderBy('calldate', 'desc');
                      
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
            $processedRecords = $cdrRecords->map(function($record) {
                return [
                    'cdr_id' => $record->uniqueid,
                    'callerNumber' => $this->extractCallerNumber($record),
                    'receiverNumber' => $record->dst,
                    'callDate' => $record->calldate,
                    'rawDuration' => $record->duration,
                    'formattedDuration' => $this->formatCallDuration($record->duration),
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
        
        // Build query using local CallRecord model - ONLY look in src field
        $query = CallRecord::where(function($q) use ($numberFormats) {
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
     */
    private function formatCallDuration($seconds)
    {
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
}
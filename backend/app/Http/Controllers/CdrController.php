<?php

namespace App\Http\Controllers;

use App\Models\Cdr;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CdrController extends Controller
{
    public function index()
    {
        try {
            $cdr = DB::connection('asterisk')
                    ->table('cdr')
                    ->orderBy('calldate', 'desc')
                    ->limit(100)
                    ->get();
            
            return $cdr;
        } catch (\Exception $e) {
            Log::error('Error fetching CDR data: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch CDR data: ' . $e->getMessage()], 500);
        }
    }

    public function getCallerData(Request $request)
    {
        try {
            $request->validate([
                'callerNumbers' => 'required|array',
                'callerNumbers.*' => 'string'
            ]);

            $callerNumbers = $request->input('callerNumbers');
            Log::info('Processing call data request for ' . count($callerNumbers) . ' numbers');
            
            $results = [];

            foreach ($callerNumbers as $callerNumber) {
                // Clean the number for database queries (remove spaces, dashes, etc.)
                $originalNumber = $callerNumber; // Keep original for the result key
                $cleanNumber = $this->normalizePhoneNumber($callerNumber);
                
                if (empty($cleanNumber)) {
                    $results[$originalNumber] = $this->getEmptyCallData();
                    continue;
                }
                
                // Try multiple formats of the number to improve matching
                $possibleFormats = $this->generatePhoneFormats($cleanNumber);
                Log::info('Searching for number in formats: ' . implode(', ', $possibleFormats));
                
                // Get total call count across all formats
                $callCount = 0;
                $latestCall = null;
                $totalDuration = 0;
                
                foreach ($possibleFormats as $format) {
                    // Query with the current format
                    $formatCalls = DB::connection('asterisk')
                        ->table('cdr')
                        ->where('src', $format)
                        ->orWhere('src', 'LIKE', '%' . $format)
                        ->count();
                    
                    $callCount += $formatCalls;
                    
                    // Get latest call if we haven't found one yet
                    if (!$latestCall) {
                        $latestCall = DB::connection('asterisk')
                            ->table('cdr')
                            ->where('src', $format)
                            ->orWhere('src', 'LIKE', '%' . $format)
                            ->orderBy('calldate', 'desc')
                            ->first();
                    }
                    
                    // Add to total duration
                    $formatDuration = DB::connection('asterisk')
                        ->table('cdr')
                        ->where('src', $format)
                        ->orWhere('src', 'LIKE', '%' . $format)
                        ->sum('duration');
                    
                    $totalDuration += $formatDuration;
                }

                // Format the caller data
                $results[$originalNumber] = [
                    'receiverName' => $this->lookupReceiverName($latestCall ? $latestCall->dst : ''),
                    'receiverNumber' => $latestCall ? $latestCall->dst : '',
                    'callCount' => $callCount,
                    'callDuration' => $totalDuration,
                    'formattedDuration' => $this->formatDuration($totalDuration),
                    'callStatus' => $latestCall ? $latestCall->disposition : '',
                    'lastCallDate' => $latestCall ? $latestCall->calldate : '',
                ];
                
                Log::info("Found data for number $originalNumber: " . json_encode($results[$originalNumber]));
            }

            Log::info('Successfully retrieved call data for ' . count($results) . ' numbers');
            return response()->json(['data' => $results]);
        } catch (\Exception $e) {
            Log::error('Error getting caller data: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch caller data: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Search for calls by caller number (clid field)
     * Get detailed call information including receiver details and call counts
     */
    public function getCallsByCallerNumber(Request $request)
    {
        try {
            $request->validate([
                'callerNumber' => 'required|string'
            ]);

            $callerNumber = $this->normalizePhoneNumber($request->input('callerNumber'));
            Log::info('Searching CDR for caller number: ' . $callerNumber);
            
            // Generate possible formats to improve matching
            $possibleFormats = $this->generatePhoneFormats($callerNumber);
            
            // Build the query to search for the caller number in clid field
            $query = DB::connection('asterisk')->table('cdr')->whereRaw('1=0'); // Start with empty result set
            
            foreach ($possibleFormats as $format) {
                $query->orWhere('clid', 'LIKE', '%' . $format . '%');
            }
            
            // Get the calls ordered by calldate
            $calls = $query->orderBy('calldate', 'desc')->get();
            
            Log::info('Found ' . $calls->count() . ' call records');
            
            // Group calls by receiver number (dst)
            $receiverCounts = [];
            $callsByReceiver = [];
            
            foreach ($calls as $call) {
                $receiverNumber = $call->dst;
                
                // Count calls per receiver
                if (!isset($receiverCounts[$receiverNumber])) {
                    $receiverCounts[$receiverNumber] = 0;
                }
                $receiverCounts[$receiverNumber]++;
                
                // Group call details by receiver
                if (!isset($callsByReceiver[$receiverNumber])) {
                    $callsByReceiver[$receiverNumber] = [
                        'receiverNumber' => $receiverNumber,
                        'receiverName' => $this->lookupReceiverName($receiverNumber),
                        'callCount' => 0,
                        'totalDuration' => 0,
                        'calls' => []
                    ];
                }
                
                $callsByReceiver[$receiverNumber]['callCount']++;
                $callsByReceiver[$receiverNumber]['totalDuration'] += (int)$call->duration;
                
                // Add individual call details
                $callsByReceiver[$receiverNumber]['calls'][] = [
                    'callDate' => $call->calldate,
                    'duration' => (int)$call->duration,
                    'formattedDuration' => $this->formatDuration((int)$call->duration),
                    'callStatus' => $call->disposition,
                    'uniqueid' => $call->uniqueid,
                    'recordingFile' => $call->recordingfile ?? null
                ];
            }
            
            $result = [
                'callerNumber' => $callerNumber,
                'totalCalls' => $calls->count(),
                'receivers' => array_values($callsByReceiver)
            ];
            
            return response()->json([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting calls by caller number: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false, 
                'error' => 'Failed to fetch call data: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Enhanced caller data method that matches receivers with contact lists
     * and handles call counts
     */
    public function getEnhancedCallerData(Request $request)
    {
        try {
            $request->validate([
                'callerNumbers' => 'required|array',
                'callerNumbers.*' => 'string'
            ]);

            $callerNumbers = $request->input('callerNumbers');
            Log::info('Processing enhanced call data request for ' . count($callerNumbers) . ' numbers');
            
            $results = [];

            foreach ($callerNumbers as $callerNumber) {
                $originalNumber = $callerNumber;
                $cleanNumber = $this->normalizePhoneNumber($callerNumber);
                
                if (empty($cleanNumber)) {
                    $results[$originalNumber] = $this->getEmptyCallData();
                    continue;
                }
                
                // Generate possible formats for the phone number
                $possibleFormats = $this->generatePhoneFormats($cleanNumber);
                
                // Build query to search for calls with this caller ID
                $query = DB::connection('asterisk')->table('cdr')->whereRaw('1=0');
                
                foreach ($possibleFormats as $format) {
                    $query->orWhere('clid', 'LIKE', '%' . $format . '%');
                }
                
                // Get call records ordered by date (newest first)
                $calls = $query->orderBy('calldate', 'desc')->get();
                
                // Process calls to track unique receivers
                $receivers = [];
                $totalCallCount = 0;
                $totalDuration = 0;
                $latestCallDate = null;
                
                foreach ($calls as $call) {
                    $receiverNumber = $call->dst;
                    $totalCallCount++;
                    $totalDuration += (int)$call->duration;
                    
                    if (!$latestCallDate) {
                        $latestCallDate = $call->calldate;
                    }
                    
                    if (!isset($receivers[$receiverNumber])) {
                        // Try to find a match in contacts
                        $receiverName = $this->lookupReceiverNameFromContacts($receiverNumber);
                        
                        $receivers[$receiverNumber] = [
                            'receiverNumber' => $receiverNumber,
                            'receiverName' => $receiverName,
                            'callCount' => 1,
                            'lastCallDate' => $call->calldate,
                            'lastCallStatus' => $call->disposition,
                            'lastCallDuration' => (int)$call->duration,
                            'formattedDuration' => $this->formatDuration((int)$call->duration),
                            'recordingFile' => $call->recordingfile ?? null
                        ];
                    } else {
                        // Increment call count for this receiver
                        $receivers[$receiverNumber]['callCount']++;
                        
                        // Update last call info if this call is newer
                        if ($call->calldate > $receivers[$receiverNumber]['lastCallDate']) {
                            $receivers[$receiverNumber]['lastCallDate'] = $call->calldate;
                            $receivers[$receiverNumber]['lastCallStatus'] = $call->disposition;
                            $receivers[$receiverNumber]['lastCallDuration'] = (int)$call->duration;
                            $receivers[$receiverNumber]['formattedDuration'] = $this->formatDuration((int)$call->duration);
                            $receivers[$receiverNumber]['recordingFile'] = $call->recordingfile ?? null;
                        }
                    }
                }
                
                // Format the result for this caller
                $results[$originalNumber] = [
                    'callerNumber' => $originalNumber,
                    'totalCalls' => $totalCallCount,
                    'totalDuration' => $totalDuration,
                    'formattedTotalDuration' => $this->formatDuration($totalDuration),
                    'lastCallDate' => $latestCallDate,
                    'receivers' => array_values($receivers),
                    'hasRecentCalls' => ($latestCallDate && strtotime($latestCallDate) > strtotime('-24 hours'))
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $results
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting enhanced caller data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false, 
                'error' => 'Failed to fetch enhanced caller data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get call records for live display in the dashboard
     */
    public function getLiveCdrData(Request $request)
    {
        try {
            // Get parameters
            $limit = $request->input('limit', 100);
            $since = $request->input('since');
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            
            Log::info('Getting live CDR data with filters:', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'since' => $since,
                'limit' => $limit
            ]);
            
            // Always enforce date filtering - default to last 30 days if no dates provided
            if (!$startDate) {
                $startDate = now()->subDays(30)->format('Y-m-d');
                Log::info('No start date provided, defaulting to last 30 days: ' . $startDate);
            }
            
            if (!$endDate) {
                $endDate = now()->format('Y-m-d');
                Log::info('No end date provided, defaulting to today: ' . $endDate);
            }
            
            // Format dates if needed
            if ($startDate && preg_match('/^\d{2}\/\d{2}\/\d{2}$/', $startDate)) {
                $parsedDate = \DateTime::createFromFormat('m/d/y', $startDate);
                if ($parsedDate) {
                    $startDate = $parsedDate->format('Y-m-d');
                    Log::info('Converted start_date to: ' . $startDate);
                }
            }
            
            if ($endDate && preg_match('/^\d{2}\/\d{2}\/\d{2}$/', $endDate)) {
                $parsedDate = \DateTime::createFromFormat('m/d/y', $endDate);
                if ($parsedDate) {
                    $endDate = $parsedDate->format('Y-m-d');
                    Log::info('Converted end_date to: ' . $endDate);
                }
            }
            
            // Build query
            $query = DB::connection('asterisk')
                    ->table('cdr')
                    ->whereDate('calldate', '>=', $startDate)
                    ->whereDate('calldate', '<=', $endDate)
                    ->orderBy('calldate', 'desc');
            
            // Only get calls newer than the provided timestamp (if specified)
            if ($since) {
                $query->where('calldate', '>', $since);
            }
            
            // Apply limit to query
            $query->limit($limit);
            
            // Execute the query
            $records = $query->get();
            Log::info('Found ' . count($records) . ' CDR records within date range');
            
            // Create a map that tracks unique caller-receiver pairs
            $pairCounts = [];
            $pairDetails = [];
            
            // First pass - analyze all records and build call count by unique pairs
            foreach ($records as $record) {
                // Extract caller number from clid field more accurately
                $callerNumber = $record->src;
                if (preg_match('/".*" <(.+)>/', $record->clid, $matches)) {
                    $callerNumber = $matches[1];
                }
                
                // Normalize for consistent comparison
                $normalizedCaller = $this->normalizePhoneNumber($callerNumber);
                $normalizedReceiver = $this->normalizePhoneNumber($record->dst);
                
                if (!$normalizedCaller || !$normalizedReceiver) {
                    continue; // Skip records with invalid numbers
                }
                
                // Create a unique key for this caller-receiver pair
                $pairKey = $normalizedCaller . '_' . $normalizedReceiver;
                
                // Initialize pair tracking if this is the first time we see this pair
                if (!isset($pairCounts[$pairKey])) {
                    $pairCounts[$pairKey] = 0;
                    $pairDetails[$pairKey] = [
                        'latest' => null,
                        'calls' => []
                    ];
                }
                
                // Count all calls - removed self-call check
                $pairCounts[$pairKey]++;
                $pairDetails[$pairKey]['calls'][] = $record;
                
                // Track the most recent call for this pair
                if (!$pairDetails[$pairKey]['latest'] || 
                    strtotime($record->calldate) > strtotime($pairDetails[$pairKey]['latest']->calldate)) {
                    $pairDetails[$pairKey]['latest'] = $record;
                }
            }
            
            Log::info('Found ' . count($pairCounts) . ' unique caller-receiver pairs');
            
            // Second pass - format records with accurate call counts
            $processedCalls = [];
            
            foreach ($pairDetails as $pairKey => $details) {
                // Use the latest call record for this pair
                $record = $details['latest'];
                
                // Extract caller number from clid field
                $callerNumber = $record->src;
                if (preg_match('/".*" <(.+)>/', $record->clid, $matches)) {
                    $callerNumber = $matches[1];
                }
                
                // Check if this is a self-call (still detect it, but don't filter)
                $normalizedCaller = $this->normalizePhoneNumber($callerNumber);
                $normalizedReceiver = $this->normalizePhoneNumber($record->dst);
                $isSelfCall = ($normalizedCaller === $normalizedReceiver);
                
                // Look up receiver name by checking all contact phone fields
                $receiverName = $this->lookupReceiverNameFromContacts($record->dst);
                $callerName = $this->lookupReceiverNameFromContacts($callerNumber);
                
                // Format the call record with the correct count for this specific pair
                $processedCalls[] = [
                    'id' => $record->uniqueid,
                    'callerNumber' => $callerNumber,
                    'callerName' => $callerName,
                    'receiverNumber' => $record->dst,
                    'receiverName' => $isSelfCall ? 'Self-Call' : $receiverName,
                    'callDate' => $record->calldate,
                    'callDuration' => (int)$record->duration,
                    'formattedDuration' => $this->formatDuration((int)$record->duration),
                    'callStatus' => $record->disposition,
                    'recordingFile' => $record->recordingfile ?? null,
                    'billsec' => (int)$record->billsec,
                    'timestamp' => strtotime($record->calldate),
                    'callCount' => $pairCounts[$pairKey], // Always use the count regardless of self-call
                    'pairKey' => $pairKey,
                    'isSelfCall' => $isSelfCall
                ];
            }
            
            // Sort by timestamp (newest first)
            usort($processedCalls, function($a, $b) {
                return $b['timestamp'] - $a['timestamp'];
            });
            
            return response()->json([
                'success' => true,
                'data' => $processedCalls,
                'timestamp' => now()->toIso8601String(),
                'date_range' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting live CDR data: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'success' => false, 
                'error' => 'Failed to fetch live CDR data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Improved function to lookup contact names from phone numbers
     */
    private function lookupReceiverNameFromContacts($phoneNumber)
    {
        if (empty($phoneNumber)) {
            return '';
        }
        
        try {
            // Clean the number for consistent matching
            $cleanNumber = $this->normalizePhoneNumber($phoneNumber);
            if (empty($cleanNumber)) {
                return '';
            }
            
            $possibleFormats = $this->generatePhoneFormats($cleanNumber);
            
            // Check import_companies table - enhanced to match on any phone field
            $callerData = $this->findBestContactMatch('import_companies', $possibleFormats, [
                'tel1' => 'contact_person1', 
                'tel2' => 'contact_person2', 
                'tel3' => 'contact_person3'
            ], 'company_name');
            
            if ($callerData) {
                return $callerData['name'];
            }
            
            return '';
        } catch (\Exception $e) {
            \Log::error('Error in lookupReceiverNameFromContacts: ' . $e->getMessage());
            return '';
        }
    }

    /**
     * Find the best match for a phone number across all contact fields
     */
    private function findBestContactMatch($tableName, $phoneFormats, $fieldMapping, $fallbackField)
    {
        try {
            // Create SQL with OR conditions for each phone format and field
            $conditions = [];
            foreach ($phoneFormats as $format) {
                foreach (array_keys($fieldMapping) as $phoneField) {
                    $conditions[] = "`$phoneField` LIKE '%$format%'";
                }
            }
            
            if (empty($conditions)) {
                return null;
            }
            
            $conditionSql = implode(' OR ', $conditions);
            $result = DB::select("SELECT * FROM `$tableName` WHERE $conditionSql LIMIT 10");
            
            if (empty($result)) {
                return null;
            }
            
            // Find best match across all records
            $bestMatch = null;
            $bestMatchLength = 0;
            
            foreach ($result as $record) {
                foreach ($fieldMapping as $phoneField => $nameField) {
                    // Skip if field doesn't exist or is empty
                    if (!property_exists($record, $phoneField) || empty($record->$phoneField)) {
                        continue;
                    }
                    
                    $recordPhoneNumber = $this->normalizePhoneNumber($record->$phoneField);
                    
                    // Check for a match with any format
                    foreach ($phoneFormats as $format) {
                        if (stripos($recordPhoneNumber, $format) !== false || stripos($format, $recordPhoneNumber) !== false) {
                            // Calculate match quality - longer matches are better
                            $matchLength = min(strlen($recordPhoneNumber), strlen($format));
                            
                            if ($matchLength > $bestMatchLength) {
                                $name = property_exists($record, $nameField) ? $record->$nameField : '';
                                
                                // Use fallback if name field is empty
                                if (empty($name) && property_exists($record, $fallbackField)) {
                                    $name = $record->$fallbackField;
                                }
                                
                                $bestMatch = [
                                    'field' => $phoneField,
                                    'name' => $name ?: '',
                                    'record_id' => $record->id ?? ''
                                ];
                                $bestMatchLength = $matchLength;
                            }
                        }
                    }
                }
            }
            
            return $bestMatch;
        } catch (\Exception $e) {
            \Log::error('Error in findBestContactMatch: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Normalize phone number to clean format
     */
    private function normalizePhoneNumber($number)
    {
        // Remove all non-digit characters except +
        $cleaned = preg_replace('/[^0-9+]/', '', $number);
        
        // Remove leading zeros
        while (strlen($cleaned) > 1 && $cleaned[0] === '0') {
            $cleaned = substr($cleaned, 1);
        }
        
        return $cleaned;
    }

    /**
     * Generate possible formats of a phone number - enhanced version
     */
    private function generatePhoneFormats($number)
    {
        $formats = [$number]; // Original cleaned number
        
        // Extract the last digits for fuzzy matching
        if (strlen($number) >= 7) {
            $formats[] = substr($number, -7); // Last 7 digits
        }
        if (strlen($number) >= 9) {
            $formats[] = substr($number, -9); // Last 9 digits
        }
        
        // Remove country code if present (e.g., +995, 995)
        if (strlen($number) > 9 && (substr($number, 0, 4) === '+995' || substr($number, 0, 3) === '995')) {
            $formats[] = substr($number, 0, 1) === '+' ? substr($number, 4) : substr($number, 3);
        }
        
        // Add country code if not present
        if (strlen($number) <= 9 && !in_array('995' . $number, $formats)) {
            $formats[] = '995' . $number;
            $formats[] = '+995' . $number;
        }
        
        // Add spaces variations (common in human-entered phone numbers)
        $digits = preg_replace('/\D/', '', $number);
        if (strlen($digits) === 9) {
            $formats[] = substr($digits, 0, 3) . ' ' . substr($digits, 3, 3) . ' ' . substr($digits, 6);
            $formats[] = substr($digits, 0, 3) . '-' . substr($digits, 3, 3) . '-' . substr($digits, 6);
        }
        
        return array_unique($formats);
    }

    /**
     * Helper method to lookup receiver name from a directory if available
     */
    private function lookupReceiverName($receiverNumber)
    {
        // This is where you would implement a lookup to map phone numbers to names
        // For now, we'll return an empty string
        return '';
    }
    
    /**
     * Helper method to format duration in seconds to HH:MM:SS
     */
    private function formatDuration($seconds)
    {
        if (!$seconds) return '00:00:00';
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        return sprintf("%02d:%02d:%02d", $hours, $minutes, $secs);
    }
    
    /**
     * Return empty data structure for invalid numbers
     */
    private function getEmptyCallData()
    {
        return [
            'receiverName' => '',
            'receiverNumber' => '',
            'callCount' => 0,
            'callDuration' => 0,
            'formattedDuration' => '00:00:00',
            'callStatus' => '',
            'lastCallDate' => '',
        ];
    }
}
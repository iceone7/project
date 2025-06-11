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

    // Generate possible formats of a phone number
    private function generatePhoneFormats($number)
    {
        $formats = [$number]; // Original cleaned number
        
        // Remove country code if present (e.g., +995, 995)
        if (strlen($number) > 9 && (substr($number, 0, 4) === '+995' || substr($number, 0, 3) === '995')) {
            $formats[] = substr($number, 0, 1) === '+' ? substr($number, 4) : substr($number, 3);
        }
        
        // Add country code if not present
        if (strlen($number) <= 9 && !in_array('995' . $number, $formats)) {
            $formats[] = '995' . $number;
            $formats[] = '+995' . $number;
        }
        
        return array_unique($formats);
    }

    // Normalize phone number to clean format
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

    // Helper method to lookup receiver name from a directory if available
    private function lookupReceiverName($receiverNumber)
    {
        // This is where you would implement a lookup to map phone numbers to names
        // For now, we'll return an empty string
        return '';
    }
    
    // Helper method to format duration in seconds to HH:MM:SS
    private function formatDuration($seconds)
    {
        if (!$seconds) return '00:00:00';
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;
        return sprintf("%02d:%02d:%02d", $hours, $minutes, $secs);
    }
    
    // Return empty data structure for invalid numbers
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
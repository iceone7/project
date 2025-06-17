<?php

namespace App\Http\Controllers;

use App\Models\CallRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class CdrImportController extends Controller
{
    /**
     * Import CDR records from Asterisk database to local database
     */
    public function import(Request $request)
    {
        try {
            // Validate request parameters
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:10000',
                'since' => 'nullable|date',
                'days' => 'nullable|integer|min:1|max:365',
                'all' => 'nullable|boolean'
            ]);
            
            $limit = $request->input('limit', 1000);
            $since = $request->input('since');
            $days = $request->input('days', 30);
            $importAll = filter_var($request->input('all', false), FILTER_VALIDATE_BOOLEAN);
            
            Log::info('Starting CDR import with params:', [
                'limit' => $limit,
                'since' => $since,
                'days' => $days,
                'all' => $importAll ? 'true' : 'false'
            ]);

            // Check if the call_records table has the expected columns
            $this->validateTableStructure();
            
            // Track existing records to avoid duplicates
            $lastRecord = CallRecord::max('calldate');
            
            // Build query to fetch from Asterisk CDR database
            $query = DB::connection('asterisk')
                ->table('cdr')
                ->select(['uniqueid', 'calldate', 'clid', 'src', 'dst', 'duration', 'disposition', 'recordingfile'])
                ->orderBy('calldate', 'desc');
            
            // Apply date filters if not importing all records
            if (!$importAll) {
                if ($since) {
                    $query->where('calldate', '>=', $since);
                    Log::info("Filtering records since: $since");
                } elseif ($lastRecord) {
                    $query->where('calldate', '>', $lastRecord);
                    Log::info("Filtering records newer than last import: $lastRecord");
                } else {
                    $query->where('calldate', '>=', now()->subDays($days));
                    Log::info("Filtering records from the last $days days");
                }
            }
            
            // Apply limit to query
            $query->limit($limit);
            
            // Execute query and get results
            $cdrRecords = $query->get();
            
            Log::info('Found ' . count($cdrRecords) . ' CDR records to import');
            
            // Skip duplicates by checking uniqueid
            $existingIds = $this->getExistingUniqueIds($cdrRecords->pluck('uniqueid')->toArray());
            
            $newRecords = $cdrRecords->filter(function($record) use ($existingIds) {
                return !in_array($record->uniqueid, $existingIds);
            });
            
            Log::info('New records to import after filtering: ' . count($newRecords));
            
            if (count($newRecords) === 0) {
                return response()->json([
                    'status' => 'success',
                    'message' => "No new records to import",
                    'imported_count' => 0
                ]);
            }
            
            // Process in batches to avoid memory issues
            $batchSize = 100;
            $totalImported = 0;
            $batches = array_chunk($newRecords->toArray(), $batchSize);
            
            foreach ($batches as $batch) {
                $records = [];
                foreach ($batch as $record) {
                    $records[] = [
                        'uniqueid' => $record->uniqueid,
                        'calldate' => $record->calldate,
                        'clid' => $record->clid,
                        'src' => $record->src,
                        'dst' => $record->dst,
                        'duration' => $record->duration,
                        'disposition' => $record->disposition,
                        'recordingfile' => $record->recordingfile ?? '',
                        'created_at' => now(),
                        'updated_at' => now()
                    ];
                }
                
                // Insert batch
                if (!empty($records)) {
                    CallRecord::insert($records);
                    $totalImported += count($records);
                    Log::info("Imported batch of " . count($records) . " records, total: {$totalImported}");
                }
            }
            
            return response()->json([
                'status' => 'success',
                'message' => "Successfully imported {$totalImported} CDR records",
                'imported_count' => $totalImported,
                'query_params' => [
                    'limit' => $limit,
                    'since' => $since,
                    'days' => $days,
                    'all' => $importAll
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error importing CDR records: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to import CDR records: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Show stats about imported CDR records
     */
    public function stats()
    {
        try {
            $totalRecords = CallRecord::count();
            $oldestRecord = CallRecord::min('calldate');
            $newestRecord = CallRecord::max('calldate');
            $dispositionCounts = CallRecord::select('disposition', DB::raw('count(*) as count'))
                ->groupBy('disposition')
                ->get()
                ->pluck('count', 'disposition')
                ->toArray();
            
            $lastDay = CallRecord::where('calldate', '>=', now()->subDay())
                ->count();
            
            $lastWeek = CallRecord::where('calldate', '>=', now()->subDays(7))
                ->count();
            
            $lastMonth = CallRecord::where('calldate', '>=', now()->subDays(30))
                ->count();
            
            // Get sample records for verification
            $recentRecords = CallRecord::orderBy('calldate', 'desc')
                ->limit(5)
                ->get();
            
            return response()->json([
                'status' => 'success',
                'stats' => [
                    'total_records' => $totalRecords,
                    'oldest_record' => $oldestRecord,
                    'newest_record' => $newestRecord,
                    'disposition_counts' => $dispositionCounts,
                    'last_day_count' => $lastDay,
                    'last_week_count' => $lastWeek,
                    'last_month_count' => $lastMonth,
                    'recent_records' => $recentRecords
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error getting CDR stats: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to get CDR stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate that the call_records table has the required columns
     */
    private function validateTableStructure()
    {
        // Check if the table exists and has required columns
        if (!Schema::hasTable('call_records')) {
            throw new \Exception('The call_records table does not exist');
        }

        $requiredColumns = ['uniqueid', 'calldate', 'clid', 'src', 'dst', 'duration', 'disposition', 'recordingfile'];
        foreach ($requiredColumns as $column) {
            if (!Schema::hasColumn('call_records', $column)) {
                throw new \Exception("The call_records table is missing the required column: $column");
            }
        }
    }

    /**
     * Get existing uniqueids to avoid duplicates
     */
    private function getExistingUniqueIds(array $uniqueIds)
    {
        if (empty($uniqueIds)) {
            return [];
        }

        return CallRecord::whereIn('uniqueid', $uniqueIds)
            ->pluck('uniqueid')
            ->toArray();
    }
}

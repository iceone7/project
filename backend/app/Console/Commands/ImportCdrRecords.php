<?php

namespace App\Console\Commands;

use App\Models\CallRecord;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ImportCdrRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cdr:import 
                            {--limit=1000 : Maximum number of records to import}
                            {--days=30 : Import records from the last N days}
                            {--since= : Import records since this date (format: Y-m-d)}
                            {--all : Import all records}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import CDR records from Asterisk database to local database';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        try {
            $limit = (int) $this->option('limit');
            $days = (int) $this->option('days');
            $since = $this->option('since');
            $importAll = $this->option('all');
            
            $this->info('Starting CDR import...');
            $this->info("Params: limit=$limit, days=$days, since=$since, all=" . ($importAll ? 'true' : 'false'));
            
            // Check if the table exists and has required columns
            if (!Schema::hasTable('call_records')) {
                $this->error('The call_records table does not exist.');
                return Command::FAILURE;
            }

            $requiredColumns = ['uniqueid', 'calldate', 'clid', 'src', 'dst', 'duration', 'disposition', 'recordingfile'];
            foreach ($requiredColumns as $column) {
                if (!Schema::hasColumn('call_records', $column)) {
                    $this->error("The call_records table is missing the required column: $column");
                    return Command::FAILURE;
                }
            }
            
            // Track existing records to avoid duplicates
            $lastRecord = CallRecord::max('calldate');
            $this->info('Last imported record date: ' . ($lastRecord ?? 'none'));
            
            // Build query to fetch from Asterisk CDR database
            $query = DB::connection('asterisk')
                ->table('cdr')
                ->select(['uniqueid', 'calldate', 'clid', 'src', 'dst', 'duration', 'disposition', 'recordingfile'])
                ->orderBy('calldate', 'desc');
            
            // Apply filters if not importing all records
            if (!$importAll) {
                if ($since) {
                    $query->where('calldate', '>=', $since);
                    $this->info("Filtering records since: $since");
                } elseif ($lastRecord) {
                    $query->where('calldate', '>', $lastRecord);
                    $this->info("Filtering records newer than last import: $lastRecord");
                } else {
                    $query->where('calldate', '>=', now()->subDays($days));
                    $this->info("Filtering records from the last $days days");
                }
            } else {
                $this->info('Importing all records (no date filter)');
            }
            
            // Apply limit
            $query->limit($limit);
            
            // Execute query and get results
            $cdrRecords = $query->get();
            
            $this->info('Found ' . count($cdrRecords) . ' CDR records to import');
            
            if (count($cdrRecords) === 0) {
                $this->info('No new records to import');
                return Command::SUCCESS;
            }
            
            // Skip duplicates by checking uniqueid
            $existingIds = CallRecord::whereIn('uniqueid', $cdrRecords->pluck('uniqueid'))
                ->pluck('uniqueid')
                ->toArray();
            
            $newRecords = $cdrRecords->filter(function($record) use ($existingIds) {
                return !in_array($record->uniqueid, $existingIds);
            });
            
            $this->info('New records to import after filtering duplicates: ' . count($newRecords));
            
            if (count($newRecords) === 0) {
                $this->info('No new unique records to import');
                return Command::SUCCESS;
            }
            
            $bar = $this->output->createProgressBar(count($newRecords));
            $bar->start();
            
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
                    $bar->advance();
                }
                
                // Insert batch
                if (!empty($records)) {
                    CallRecord::insert($records);
                    $totalImported += count($records);
                }
            }
            
            $bar->finish();
            $this->newLine();
            $this->info("Successfully imported {$totalImported} CDR records");
            
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Error importing CDR records: ' . $e->getMessage());
            Log::error('CDR import command error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}

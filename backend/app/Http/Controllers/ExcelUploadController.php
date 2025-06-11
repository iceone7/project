<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ImportCompany;
use Illuminate\Support\Facades\Log;

class ExcelUploadController extends Controller
{
    private function parseCallDuration($value)
    {
        if (is_numeric($value)) {
            return (int) round($value * 86400);
        }

        if (preg_match('/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/', $value, $matches)) {
            return (int)$matches[1] * 3600 + (int)$matches[2] * 60 + (int)$matches[3];
        }

        return null;
    }

    // Преобразует секунды → HH:MM:SS
    private function formatCallDuration($seconds)
    {
        if ($seconds === null) return '';
        return gmdate('H:i:s', $seconds);
    }

    public function store(Request $request)
    {
        try {
            // Log received data for debugging
            Log::info('Received import-company request', [
                'data_count' => count($request->input('data', [])),
                'first_record' => $request->has('data') && count($request->input('data')) > 0 ? 
                    json_encode($request->input('data')[0]) : 'No data'
            ]);

            // Validate request structure first
            $request->validate([
                'data' => 'required|array',
            ]);

            // Then validate individual records with less strict rules
            foreach ($request->input('data') as $index => $row) {
                // Ensure every field is at least present, even if empty
                if (!isset($row['company_name'])) $row['company_name'] = '';
                if (!isset($row['identification_code'])) $row['identification_code'] = '';
                if (!isset($row['contact_person1'])) $row['contact_person1'] = '';
                if (!isset($row['tel1'])) $row['tel1'] = '';
                if (!isset($row['contact_person2'])) $row['contact_person2'] = '';
                if (!isset($row['tel2'])) $row['tel2'] = '';
                if (!isset($row['contact_person3'])) $row['contact_person3'] = '';
                if (!isset($row['tel3'])) $row['tel3'] = '';
                if (!isset($row['caller_name'])) $row['caller_name'] = '';
                if (!isset($row['caller_number'])) $row['caller_number'] = '';
                if (!isset($row['receiver_name'])) $row['receiver_name'] = '';
                if (!isset($row['receiver_number'])) $row['receiver_number'] = '';
                if (!isset($row['call_count'])) $row['call_count'] = 0;
                if (!isset($row['call_date'])) $row['call_date'] = '';
                if (!isset($row['call_duration'])) $row['call_duration'] = '';
                if (!isset($row['call_status'])) $row['call_status'] = '';
            }

            ImportCompany::truncate();

            foreach ($request->input('data') as $index => $row) {
                $parsedDuration = isset($row['call_duration']) && !empty($row['call_duration']) 
                    ? $this->parseCallDuration($row['call_duration']) 
                    : null;
                
                // Log processing of each row for debugging
                if ($index === 0 || $index === count($request->input('data')) - 1) {
                    Log::info('Processing row ' . ($index + 1) . '/' . count($request->input('data')), [
                        'company_name' => $row['company_name'] ?? 'N/A',
                        'caller_number' => $row['caller_number'] ?? 'N/A',
                        'receiver_name' => $row['receiver_name'] ?? 'N/A',
                        'receiver_number' => $row['receiver_number'] ?? 'N/A',
                        'call_status' => $row['call_status'] ?? 'N/A'
                    ]);
                }

                ImportCompany::create([
                    'company_name' => $row['company_name'] ?? '',
                    'identification_code' => $row['identification_code'] ?? '',
                    'contact_person1' => $row['contact_person1'] ?? '',
                    'tel1' => $row['tel1'] ?? '',
                    'contact_person2' => $row['contact_person2'] ?? '',
                    'tel2' => $row['tel2'] ?? '',
                    'contact_person3' => $row['contact_person3'] ?? '',
                    'tel3' => $row['tel3'] ?? '',
                    'caller_name' => $row['caller_name'] ?? '',
                    'caller_number' => $row['caller_number'] ?? '',
                    'receiver_name' => $row['receiver_name'] ?? '',
                    'receiver_number' => $row['receiver_number'] ?? '',
                    'call_count' => $row['call_count'] ?? 0,
                    'call_date' => $row['call_date'] ?? null,
                    'call_duration' => $parsedDuration,
                    'call_status' => $row['call_status'] ?? '',
                ]);
            }

            Log::info('Import completed successfully', ['count' => count($request->input('data'))]);
            return response()->json(['message' => 'Data imported successfully', 'count' => count($request->input('data'))], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation error: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation error', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('Data import error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Failed to import data', 'message' => $e->getMessage()], 500);
        }
    }

    public function index()
    {
        try {
            $data = ImportCompany::all()->map(function ($item) {
                $item->call_duration = $this->formatCallDuration($item->call_duration);
                return $item;
            });

            return response()->json(['data' => $data], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching data: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to get data: ' . $e->getMessage()], 500);
        }
    }
}

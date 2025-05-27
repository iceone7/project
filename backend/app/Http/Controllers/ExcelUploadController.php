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
            Log::info('Полученные данные:', $request->all());

            $request->validate([
                'data' => 'required|array',
                'data.*.companyName' => 'nullable|string|max:255',
                'data.*.identificationCode' => 'nullable|string|max:255',
                'data.*.contactPerson1' => 'nullable|string|max:255',
                'data.*.tel1' => 'nullable|string|max:255',
                'data.*.contactPerson2' => 'nullable|string|max:255',
                'data.*.tel2' => 'nullable|string|max:255',
                'data.*.contactPerson3' => 'nullable|string|max:255',
                'data.*.tel3' => 'nullable|string|max:255',
                'data.*.callerName' => 'nullable|string|max:255',
                'data.*.callerNumber' => 'nullable|string|max:255',
                'data.*.receiverNumber' => 'nullable|string|max:255',
                'data.*.callCount' => 'nullable|integer',
                'data.*.callDate' => 'nullable|date_format:Y-m-d H:i:s',
                'data.*.callDuration' => 'nullable|string|max:255',
                'data.*.callStatus' => 'nullable|string|in:Answered,No Answer,Busy,Failed,answered,no answer,busy,failed ',
            ]);

            ImportCompany::truncate();

            foreach ($request->input('data') as $row) {
                $parsedDuration = isset($row['callDuration']) ? $this->parseCallDuration($row['callDuration']) : null;

                ImportCompany::create([
                    'company_name' => $row['companyName'] ?? null,
                    'identification_code' => $row['identificationCode'] ?? null,
                    'contact_person1' => $row['contactPerson1'] ?? null,
                    'tel1' => $row['tel1'] ?? null,
                    'contact_person2' => $row['contactPerson2'] ?? null,
                    'tel2' => $row['tel2'] ?? null,
                    'contact_person3' => $row['contactPerson3'] ?? null,
                    'tel3' => $row['tel3'] ?? null,
                    'caller_name' => $row['callerName'] ?? null,
                    'caller_number' => $row['callerNumber'] ?? null,
                    'receiver_number' => $row['receiverNumber'] ?? null,
                    'call_count' => $row['callCount'] ?? 0,
                    'call_date' => $row['callDate'] ?? null,
                    'call_duration' => $parsedDuration,
                    'call_status' => $row['callStatus'] ?? null,
                ]);
            }

            return response()->json(['message' => 'Данные успешно импортированы'], 200);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Ошибка валидации: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Ошибка валидации: ' . json_encode($e->errors())], 422);
        } catch (\Exception $e) {
            Log::error('Ошибка импорта данных: ' . $e->getMessage());
            return response()->json(['error' => 'Не удалось импортировать данные: ' . $e->getMessage()], 500);
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
            Log::error('Ошибка получения данных: ' . $e->getMessage());
            return response()->json(['error' => 'Не удалось получить данные: ' . $e->getMessage()], 500);
        }
    }

}

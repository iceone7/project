<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CompanyExcelUpload;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CompanyExcelUploadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    public function index()
    {
        try {
            return response()->json([
                'data' => CompanyExcelUpload::all()
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching company uploads: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch data'], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            Log::info('Received data:', $request->all());

            $request->validate([
                'data' => 'required|array',
                'data.*.tenderNumber' => 'nullable|string|max:255',
                'data.*.buyer' => 'nullable|string|max:255',
                'data.*.contact1' => 'nullable|string|max:255',
                'data.*.phone1' => 'nullable|string|max:255',
                'data.*.contact2' => 'nullable|string|max:255',
                'data.*.phone2' => 'nullable|string|max:255',
                'data.*.contact3' => 'nullable|string|max:255',
                'data.*.phone3' => 'nullable|string|max:255',
                'data.*.email' => 'nullable|string|max:255',
                'data.*.executor' => 'nullable|string|max:255',
                'data.*.idCode' => 'nullable|string|max:255',
                'data.*.contractValue' => 'nullable|string|max:255',
                'data.*.totalValueGorgia' => 'nullable|string|max:255',
                'data.*.lastPurchaseDateGorgia' => 'nullable|string|max:255',
                'data.*.contractEndDate' => 'nullable|string|max:255',
                'data.*.foundationDate' => 'nullable|string|max:255',
                'data.*.manager' => 'nullable|string|max:255',
                'data.*.status' => 'nullable|string|max:255',
            ]);

            // If this is an Excel upload (not a single create), truncate before insert
            // Detect Excel upload by checking if there are more than 1 row, or a special flag
            $isExcelUpload = count($request->input('data', [])) > 1;

            if ($isExcelUpload) {
                CompanyExcelUpload::truncate();
            }

            foreach ($request->input('data') as $row) {
                // Sanitize the data
                $sanitizedData = $this->sanitizeRow($row);
                
                CompanyExcelUpload::create([
                    'tender_number' => $sanitizedData['tenderNumber'] ?? null,
                    'buyer' => $sanitizedData['buyer'] ?? null,
                    'contact1' => $sanitizedData['contact1'] ?? null,
                    'phone1' => $sanitizedData['phone1'] ?? null,
                    'contact2' => $sanitizedData['contact2'] ?? null,
                    'phone2' => $sanitizedData['phone2'] ?? null,
                    'contact3' => $sanitizedData['contact3'] ?? null,
                    'phone3' => $sanitizedData['phone3'] ?? null,
                    'email' => $sanitizedData['email'] ?? null,
                    'executor' => $sanitizedData['executor'] ?? null,
                    'id_code' => $sanitizedData['idCode'] ?? null,
                    'contract_value' => $sanitizedData['contractValue'] ?? null,
                    'total_value_gorgia' => $sanitizedData['totalValueGorgia'] ?? null,
                    'last_purchase_date_gorgia' => $sanitizedData['lastPurchaseDateGorgia'] ?? null,
                    'contract_end_date' => $sanitizedData['contractEndDate'] ?? null,
                    'foundation_date' => $sanitizedData['foundationDate'] ?? null,
                    'manager' => $sanitizedData['manager'] ?? null,
                    'status' => $sanitizedData['status'] ?? null,
                ]);
            }

            return response()->json(['message' => 'Company Excel data imported successfully'], 200);
        } catch (\Exception $e) {
            Log::error('Error storing company uploads: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to store data: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Sanitize a data row before saving
     * 
     * @param array $row
     * @return array
     */
    private function sanitizeRow($row)
    {
        // Process email - make sure it's a valid email or null
        if (isset($row['email']) && !empty($row['email']) && !filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            $row['email'] = null;
        }
        
        // Clean other fields as needed
        return $row;
    }

    public function update(Request $request, $id)
    {
        try {
            $company = CompanyExcelUpload::findOrFail($id);
            $company->update($request->all());
            return response()->json(['message' => 'Record updated', 'data' => $company], 200);
        } catch (\Exception $e) {
            Log::error('Error updating company upload: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update record: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $company = CompanyExcelUpload::findOrFail($id);
            $company->delete();
            return response()->json(['message' => 'Record deleted'], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting company upload: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete record: ' . $e->getMessage()], 500);
        }
    }

    public function preview(Request $request)
    {
        try {
            if (!$request->hasFile('file')) {
                Log::error('No file uploaded');
                return response()->json(['error' => 'No file uploaded'], 400);
            }

            $file = $request->file('file');
            Log::info('Uploaded file info', [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension(),
                'size' => $file->getSize(),
            ]);

            $allowed = ['xls', 'xlsx'];
            if (!in_array(strtolower($file->getClientOriginalExtension()), $allowed)) {
                Log::error('Invalid file type: ' . $file->getClientOriginalExtension());
                return response()->json(['error' => 'Invalid file type. Only .xls and .xlsx allowed.'], 400);
            }

            if (!class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
                Log::error('PhpSpreadsheet library is not installed');
                return response()->json(['error' => 'Server error: PhpSpreadsheet library is not installed'], 500);
            }

            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray(null, true, true, true);

            if (empty($rows)) {
                Log::warning('Excel file is empty');
                return response()->json(['data' => []], 200);
            }

            // Предполагаем, что первая строка — это заголовки
            $header = array_shift($rows);
            $header = array_map('trim', $header);

            // Нормализация заголовков для соответствия фронтенду
            $normalizedHeaders = array_map(function ($header) {
                $headerMap = [
                    'Tender Number' => 'tenderNumber',
                    'Buyer' => 'buyer',
                    'Contact Person #1' => 'contact1',
                    'Phone #1' => 'phone1',
                    'Contact Person #2' => 'contact2',
                    'Phone #2' => 'phone2',
                    'Contact Person #3' => 'contact3',
                    'Phone #3' => 'phone3',
                    'Email' => 'email',
                    'Executor' => 'executor',
                    'ID Code' => 'idCode',
                    'Contract Value' => 'contractValue',
                    'Total Value Gorgia' => 'totalValueGorgia',
                    'Last Purchase Date Gorgia' => 'lastPurchaseDateGorgia',
                    'Contract End Date' => 'contractEndDate',
                    'Foundation Date' => 'foundationDate',
                    'Manager' => 'manager',
                    'Status' => 'status',
                ];
                return $headerMap[$header] ?? $header;
            }, $header);

            $data = [];
            foreach ($rows as $row) {
                $item = [];
                $colIndex = 0;
                foreach ($normalizedHeaders as $colName) {
                    // Instead of chr(65 + $colIndex), use array_keys($row) to get the correct key
                    $keys = array_keys($row);
                    $key = isset($keys[$colIndex]) ? $keys[$colIndex] : null;
                    $item[$colName] = $key !== null && isset($row[$key]) ? $row[$key] : '';
                    $colIndex++;
                }
                $data[] = $item;
            }

            Log::info('Excel preview parsed rows', ['count' => count($data)]);
            return response()->json(['data' => $data], 200);
        } catch (\Exception $e) {
            Log::error('Excel preview error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to parse Excel: ' . $e->getMessage()], 500);
        }
    }
}
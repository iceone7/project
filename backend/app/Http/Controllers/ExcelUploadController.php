<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ImportCompany;

class ExcelUploadController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->input('data');

        ImportCompany::truncate();

        foreach ($data as $row) {
            ImportCompany::create([
                'company_name'        => $row['companyName'] ?? '',
                'identification_code' => $row['identificationCode'] ?? '',
                'contact_person1'     => $row['contactPerson1'] ?? '',
                'tel1'                => $row['tel1'] ?? '',
                'contact_person2'     => $row['contactPerson2'] ?? '',
                'tel2'                => $row['tel2'] ?? '',
                'contact_person3'     => $row['contactPerson3'] ?? '',
                'tel3'                => $row['tel3'] ?? '',
                'caller_name'         => $row['callerName'] ?? '',
                'caller_number'       => $row['callerNumber'] ?? '',
                'receiver_number'     => $row['receiverNumber'] ?? '',
                'call_count'          => $row['callCount'] ?? 0,
                'call_date'           => $row['callDate'] ?? null,
                'call_duration'       => $row['callDuration'] ?? '',
                'call_status'         => $row['callStatus'] ?? '',
            ]);
        }

        return response()->json(['message' => 'Data imported successfully']);

    }

    public function index()
    {
        $data = ImportCompany::all();

        // Group by tel2 and get the first row for each unique tel2
        $uniqueTel2Rows = $data->groupBy('receiver_number')->map(function ($items, $tel2) {
            $firstItem = $items->first()->toArray();
            $firstItem['call_count'] = $items->count();
            return $firstItem;
        })->values();

        return response()->json(['data' => $uniqueTel2Rows]);
    }

}
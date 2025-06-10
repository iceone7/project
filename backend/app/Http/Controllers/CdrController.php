<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class CdrController extends Controller
{
    public function index()
    {
        $cdrs = DB::connection('asterisk')
            ->table('cdr')
            ->select('uniqueid', 'calldate', 'src', 'dst', 'duration', 'recordingfile') // Добавляем uniqueid
            ->orderBy('calldate', 'desc')
            ->limit(70)
            ->get();

        return response()->json($cdrs);
    }
}
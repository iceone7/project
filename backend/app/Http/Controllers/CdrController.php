<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class CdrController extends Controller
{
    public function index()
    {
        $cdrs = DB::connection('asterisk') // если другая БД, укажи здесь соединение
            ->table('cdr')
            ->select('calldate', 'src', 'dst', 'duration', 'recordingfile')
            ->orderBy('calldate', 'desc')
            ->limit(50)
            ->get();

        return response()->json($cdrs);
    }
}


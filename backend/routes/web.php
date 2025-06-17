<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CallerExcelUploadController;

Route::get('/', function () {
    return response()->json(['message' => 'Welcome to the Calls!']);
})->withoutMiddleware('auth:sanctum');

Route::get('/test', [CallerExcelUploadController::class, 'test']);


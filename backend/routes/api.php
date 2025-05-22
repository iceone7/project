<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ExcelImportController;
use App\Http\Controllers\ExcelUploadController;

Route::delete('companies/{id}', [CompanyController::class, 'destroy']);
Route::put('companies/{id}', [CompanyController::class, 'update']);

// call
Route::get('/companies', [CompanyController::class, 'index']);
Route::post('/companies', [CompanyController::class, 'store']);

// upload excel
Route::middleware('throttle:1300,1')->group(function () {
    Route::get('/get-imported-companies', [ExcelUploadController::class, 'index']);
    Route::post('/import-company', [ExcelUploadController::class, 'store']);
});
Route::post('/upload-excel', [ExcelUploadController::class, 'store']);

Route::post('/import-excel', [ExcelImportController::class, 'upload']);
Route::post('/excel-import', [ExcelImportController::class, 'import']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

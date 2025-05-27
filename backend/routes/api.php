<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ExcelImportController;
use App\Http\Controllers\ExcelUploadController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\CompanyExcelImportController;
use App\Http\Controllers\CompanyExcelUploadController;

Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
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

    // admin and login
    Route::post('/admin/create-user', [AdminController::class, 'createUser'])->withoutMiddleware('auth:sanctum');
    Route::get('/admin/users', [AdminController::class, 'getUsers'])->withoutMiddleware('auth:sanctum');
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser'])->withoutMiddleware('auth:sanctum');
    Route::put('/admin/users/{id}', [AdminController::class, 'updateUser'])->withoutMiddleware('auth:sanctum');

    // --- Company Excel Import routes ---
    Route::get('/import-company-list', [CompanyExcelImportController::class, 'index']);
    Route::post('/import-company-list', [CompanyExcelImportController::class, 'store']);
    Route::put('/import-company-list/{id}', [CompanyExcelImportController::class, 'update']);
    Route::delete('/import-company-list/{id}', [CompanyExcelImportController::class, 'destroy']);

    // --- Company Excel Upload routes ---
    Route::get('/company-excel-uploads', [CompanyExcelUploadController::class, 'index']);
    Route::post('/company-excel-uploads', [CompanyExcelUploadController::class, 'store']);
    Route::put('/company-excel-uploads/{id}', [CompanyExcelUploadController::class, 'update']);
    Route::delete('/company-excel-uploads/{id}', [CompanyExcelUploadController::class, 'destroy']);
    Route::post('/company-excel-preview', [CompanyExcelUploadController::class, 'preview']);

    // --- Company Excel Preview route ---
    Route::post('/company-excel-preview', [CompanyExcelUploadController::class, 'preview']);
});

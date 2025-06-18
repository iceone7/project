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
use App\Http\Controllers\CdrController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CallerExcelUploadController;


Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/login', [AuthController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    Route::delete('companies/{id}', [CompanyController::class, 'destroy']);
    Route::put('companies/{id}', [CompanyController::class, 'update']);

    // call
    Route::get('/companies', [CompanyController::class, 'index']);
    Route::post('/companies', [CompanyController::class, 'store']);

    // upload excel
    Route::middleware('throttle:1500,1')->group(function () {
        Route::get('/get-imported-companies', [ExcelUploadController::class, 'index']);
        Route::post('/import-company', [ExcelUploadController::class, 'store']);
    });
    Route::post('/upload-excel', [ExcelUploadController::class, 'store']);

    Route::post('/import-excel', [ExcelImportController::class, 'upload']);
    Route::post('/excel-import', [ExcelImportController::class, 'import']);

    // admin and login
    Route::post('/admin/create-user', [AdminController::class, 'createUser']);
    Route::get('/admin/users', [AdminController::class, 'getUsers']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);
    Route::put('/admin/users/{id}', [AdminController::class, 'updateUser']);

    // Departments for super_admin
    Route::get('/departments', function() {
        return \App\Models\Department::all();
    });

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
    Route::post('/company-excel-preview', [CompanyExcelUploadController::class, 'preview'])->withoutMiddleware('auth:sanctum');


    // --- Caller Excel Upload routes ---
    Route::get('/caller-excel-data', [CallerExcelUploadController::class, 'index']);
    Route::post('/caller-excel-uploads', [CallerExcelUploadController::class, 'store']);
    Route::post('/caller-excel-preview', [CallerExcelUploadController::class, 'preview'])->withoutMiddleware('auth:sanctum');

    
    // Enhanced CDR data processing endpoints
    Route::post('/process-cdr-data', [CallerExcelUploadController::class, 'processCdrData']);
    Route::post('/match-caller-records', [CallerExcelUploadController::class, 'processCdrData']); // Alias for clarity


    Route::get('/cdr', [CdrController::class, 'index']);
    Route::post('/caller-data', [CdrController::class, 'getCallerData']); // New endpoint
    Route::post('/enhanced-caller-data', [CdrController::class, 'getEnhancedCallerData']); // New endpoint for enhanced caller data
    Route::get('/live-cdr', [CdrController::class, 'getLiveCdrData']); // New endpoint for live CDR data
    Route::post('/calls-by-caller', [CdrController::class, 'getCallsByCallerNumber']); // New route for getting calls by caller number from clid field
    
    // Update route definition to properly handle special characters including dots
    Route::get('/comments/{cdr_id}', [CommentController::class, 'index'])
         ->where('cdr_id', '.*'); // Allow any character in the cdr_id parameter
    
    Route::post('/comments', [CommentController::class, 'store']);
    // logout
    Route::post('/logout', [AuthController::class, 'logout']);

    // CDR Import routes
    Route::post('/cdr/import', [App\Http\Controllers\CdrImportController::class, 'import']);
    Route::get('/cdr/stats', [App\Http\Controllers\CdrImportController::class, 'stats']);
});

// Optionally expose a public endpoint for CDR webhooks from Asterisk
// Route::post('/cdr-webhook', [CdrController::class, 'handleCdrWebhook'])->withoutMiddleware('auth:sanctum');


Route::get('/recordings/{path}', function ($path) {
    $pbxUrl = 'http://10.150.20.117/recordings/' . $path;
    try {
        $file = file_get_contents($pbxUrl);
        return response($file)->header('Content-Type', 'audio/wav');
    } catch (\Exception $e) {
        abort(404, 'File not found');
    }
})->where('path', '.*');

// Call Records and CDR routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/cdr', [App\Http\Controllers\CdrController::class, 'index']);
    Route::post('/process-cdr-data', [App\Http\Controllers\CallerExcelUploadController::class, 'processCdrData']);
    Route::get('/live-cdr', [App\Http\Controllers\CdrController::class, 'getLiveCdrData']);
    Route::get('/caller-recordings', [App\Http\Controllers\CdrController::class, 'getCallerRecordings']);
    
    // Comment routes
    Route::get('/comments/{cdrId}', [App\Http\Controllers\CommentsController::class, 'index']);
    Route::post('/comments', [App\Http\Controllers\CommentsController::class, 'store']);
});

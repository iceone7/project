<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CompanyController;
use App\Http\Controllers\ExcelImportController;
use App\Http\Controllers\ExcelUploadController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminAuthController;

Route::post('/admin/login', [AdminAuthController::class, 'login']);
Route::post('/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::delete('companies/{id}', [CompanyController::class, 'destroy']);
    Route::put('companies/{id}', [CompanyController::class, 'update']);

    // call
    Route::get('/companies', [CompanyController::class, 'index'])->withoutMiddleware('auth:sanctum');
    Route::post('/companies', [CompanyController::class, 'store'])->withoutMiddleware('auth:sanctum');

    // upload excel
    Route::middleware('throttle:1300,1')->group(function () {
        Route::get('/get-imported-companies', [ExcelUploadController::class, 'index'])->withoutMiddleware('auth:sanctum');
        Route::post('/import-company', [ExcelUploadController::class, 'store'])->withoutMiddleware('auth:sanctum');
    });
    Route::post('/upload-excel', [ExcelUploadController::class, 'store']);

    Route::post('/import-excel', [ExcelImportController::class, 'upload']);
    Route::post('/excel-import', [ExcelImportController::class, 'import']);

    // admin and login
    Route::post('/admin/create-user', [AdminController::class, 'createUser'])->withoutMiddleware('auth:sanctum');
    Route::get('/admin/users', [AdminController::class, 'getUsers'])->withoutMiddleware('auth:sanctum');
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser'])->withoutMiddleware('auth:sanctum');
});

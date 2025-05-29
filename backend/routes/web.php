<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['message' => 'Welcome to the Calls!']);
})->withoutMiddleware('auth:sanctum');

Route::get('/login', function () {
    return response()->json(['status' => 'OK']);
})->withoutMiddleware('auth:sanctum');
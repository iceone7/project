<?php

use Illuminate\Support\Facades\Route;

Route::get('/{any}', function () {
    return response()->file(public_path('index.html'));
})->where('any', '.*');

Route::get('/', function () {
    return response()->file(public_path('index.html'));
});



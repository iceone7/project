<?php

use Illuminate\Support\Facades\Route;

Route::get('/react/{any}', function () {
    return response()->file(public_path('react/index.html'));
})->where('any', '.*');

Route::get('/react', function () {
    return response()->file(public_path('react/index.html'));
});



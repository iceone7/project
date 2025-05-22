<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;

class ReactController extends Controller
{
    public function index()
    {
        $reactIndexPath = public_path('react/index.html');
        if (File::exists($reactIndexPath)) {
            return File::get($reactIndexPath);
        }
        abort(404);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // Попытка авторизации
        if (Auth::guard('admin')->attempt($credentials)) {
            $admin = Auth::guard('admin')->user();
            return response()->json([
                'status' => 'success',
                'admin' => [
                    'email' => $admin->email,
                    'role' => 'admin',
                ],
            ], 200);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Неверный логин или пароль',
        ], 401);
    }
}
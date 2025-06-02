<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Admin; // ადმინის მოდელის იმპორტი
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException; // სწორი იმპორტი

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users',
            'password' => 'required|confirmed|min:6',
        ]);

        $user = User::create([
            'email' => $request->email,
            'password' => bcrypt($request->password),
        ]);

        return response()->json($user);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // მომხმარებლების ცხრილში შემოწმება
        $user = User::where('email', $request->email)->first();
        if ($user && Hash::check($request->password, $user->password)) {
            return response()->json([
                'token' => $user->createToken('api-token')->plainTextToken,
                // 'isGorgiaAdmin' => false, // ჩვეულებრივი მომხმარებლები ადმინები არ არიან
                'user' => $user,
            ]);
        }

        // თუ არცერთი მომხმარებელი არ მოიძებნა
        throw ValidationException::withMessages([
            'email' => ['არასწორი ავტორიზაციის მონაცემები'],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'გამოსვლა წარმატებით შესრულდა']);
    }
}

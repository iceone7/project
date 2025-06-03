<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Department;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    public function createUser(Request $request)
    {
        $authUser = $request->user();
        if ($request->input('role') === 'admin') {
            // Only super_admin can create admins
            if (!$authUser || $authUser->role !== 'super_admin') {
                return response()->json(['message' => 'Only super_admin can create admins'], 403);
            }
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'department_id' => 'required|exists:departments,id',
            ]);
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
                'department_id' => $validated['department_id'],
            ]);
            return response()->json(['message' => 'Admin created successfully', 'user' => $user]);
        } elseif ($authUser && $authUser->role === 'super_admin' && $request->input('role') === 'user') {
            // super_admin can create users in any department
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
                'department_id' => 'required|exists:departments,id',
            ]);
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'user',
                'department_id' => $validated['department_id'],
            ]);
            return response()->json(['message' => 'User created successfully', 'user' => $user]);
        } else {
            // Only admin can create users, and only in their department
            if (!$authUser || $authUser->role !== 'admin') {
                return response()->json(['message' => 'Only admin can create users'], 403);
            }
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|string|min:6',
            ]);
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'user',
                'department_id' => $authUser->department_id,
            ]);
            return response()->json(['message' => 'User created successfully', 'user' => $user]);
        }
    }

    public function getUsers(Request $request)
    {
        $authUser = $request->user();
        if ($authUser->role === 'super_admin') {
            $users = User::with('department')->get();
        } elseif ($authUser->role === 'admin') {
            $users = User::with('department')->where('department_id', $authUser->department_id)->get();
        } else {
            return response()->json(['message' => 'Forbidden'], 403);
        }
        return response()->json($users);
    }

    public function deleteUser($id)
    {
        $user = User::find($id);
        if (!$user) return response()->json(['message' => 'User not found'], 404);

        $user->delete();
        return response()->json(['message' => 'User deleted']);
    }

    public function updateUser(Request $request, $id)
    {
        $authUser = $request->user();
        $user = User::find($id);
        if (!$user) return response()->json(['message' => 'User not found'], 404);

        // Only super_admin can update admins, only admin can update users in their department
        if ($user->role === 'admin') {
            if (!$authUser || $authUser->role !== 'super_admin') {
                return response()->json(['message' => 'Only super_admin can update admins'], 403);
            }
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $user->id,
                'role' => 'required|in:admin',
                'department_id' => 'required|exists:departments,id',
                'password' => 'nullable|string|min:6',
            ]);
            $user->name = $validated['name'];
            $user->email = $validated['email'];
            $user->role = 'admin';
            $user->department_id = $validated['department_id'];
            if (!empty($validated['password'])) {
                $user->password = \Hash::make($validated['password']);
            }
            $user->save();
            return response()->json(['message' => 'Admin updated successfully', 'user' => $user]);
        } else {
            if (!$authUser || $authUser->role !== 'admin' || $user->department_id !== $authUser->department_id) {
                return response()->json(['message' => 'Only admin can update users in their department'], 403);
            }
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email,' . $user->id,
                'role' => 'required|in:user',
                'password' => 'nullable|string|min:6',
            ]);
            $user->name = $validated['name'];
            $user->email = $validated['email'];
            $user->role = 'user';
            // department_id cannot be changed by user/admin
            if (!empty($validated['password'])) {
                $user->password = \Hash::make($validated['password']);
            }
            $user->save();
            return response()->json(['message' => 'User updated successfully', 'user' => $user]);
        }
    }

}


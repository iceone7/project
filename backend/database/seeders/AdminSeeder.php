<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run()
    {
        // Удаляем старого админа, чтобы избежать дубликатов
        Admin::where('email', 'admin@example.com')->delete();

        // Создаём нового админа
        Admin::create([
            'email' => 'gorgia@gmail.com',
            'password' => Hash::make('gorgia@1234!'),
        ]);
    }
}

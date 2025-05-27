<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    use HasFactory;

    protected $fillable = ['email', 'password'];

    // Скрываем пароль при сериализации
    protected $hidden = ['password', 'remember_token'];
}
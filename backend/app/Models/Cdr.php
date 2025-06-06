<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cdr extends Model
{
    protected $connection = 'asterisk';
    protected $table = 'cdr';
    public $timestamps = false;
}


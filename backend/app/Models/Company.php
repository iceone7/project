<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $fillable = [
    'tenderNumber', 'buyer', 'contact1', 'phone1', 'contact2', 'phone2', 'email',
    'executor', 'idCode', 'contractValue', 'totalValueGorgia', 'lastPurchaseDateGorgia',
    'contractEndDate', 'foundationDate', 'manager', 'status'
    ];
    use HasFactory;
}

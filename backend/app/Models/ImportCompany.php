<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportCompany extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'identification_code',
        'contact_person1',
        'tel1',
        'contact_person2',
        'tel2',
        'contact_person3',
        'tel3',
        'caller_name',
        'caller_number',
        'receiver_name',
        'receiver_number',
        'call_count',
        'call_date',
        'call_duration',
        'call_status',
    ];

    // Allow all fields to be nullable for flexibility with imported data
    protected $casts = [
        'call_count' => 'integer',
        'call_date' => 'datetime',
        'call_duration' => 'integer',
    ];
}
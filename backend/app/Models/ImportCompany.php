<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportCompany extends Model
{
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
        'receiver_number',
        'call_count',
        'call_date',
        'call_duration',
        'call_status',
    ];
    
}


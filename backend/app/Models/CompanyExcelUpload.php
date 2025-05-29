<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyExcelUpload extends Model
{
    use HasFactory;

    protected $fillable = [
        'tender_number',
        'buyer',
        'contact1',
        'phone1',
        'contact2',
        'phone2',
        'email',
        'executor',
        'id_code',
        'contract_value',
        'total_value_gorgia',
        'last_purchase_date_gorgia',
        'contract_end_date',
        'foundation_date',
        'manager',
        'status',
    ];
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'tenderNumber',
        'buyer',
        'contact1',
        'phone1',
        'contact2',
        'phone2',
        'email',
        'executor',
        'idCode',
        'contractValue',
        'totalValueGorgia',
        'lastPurchaseDateGorgia',
        'contractEndDate',
        'foundationDate',
        'manager',
        'managerNumber',
        'status',
        'contact3',
        'phone3'
    ];

    /**
     * Get the comments for this company.
     */
    public function comments()
    {
        return $this->hasMany(CompanyComment::class);
    }
}

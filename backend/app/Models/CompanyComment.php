<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyComment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'user_id',
        'comment',
        'source_table'
    ];

    /**
     * Get the user who created this comment.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the related company based on source_table value.
     */
    public function company()
    {
        if ($this->source_table === 'company_excel_uploads') {
            // If the source is company_excel_uploads, use that model
            return $this->belongsTo(CompanyExcelUpload::class, 'company_id');
        }
        
        // Default to the standard Company model
        return $this->belongsTo(Company::class);
    }
}

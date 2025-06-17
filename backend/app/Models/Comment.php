<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\CallRecord;

class Comment extends Model
{
    use HasFactory;
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'cdr_id',
        'user_id',
        'comment'
    ];
    
    /**
     * Get the user that created the comment.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the call record that this comment belongs to.
     */
    public function callRecord()
    {
        return $this->belongsTo(CallRecord::class, 'cdr_id', 'uniqueid');
    }
}
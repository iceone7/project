<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecordingComment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'recording_id',
        'user_id',
        'comment'
    ];

    /**
     * Get the user who made the comment.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

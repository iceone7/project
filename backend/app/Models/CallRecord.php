<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CallRecord extends Model
{
    use HasFactory;
    
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'call_records';
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'uniqueid',
        'calldate',
        'clid',
        'src',
        'dst',
        'duration',
        'disposition',
        'recordingfile'
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'calldate' => 'datetime',
        'duration' => 'integer'
    ];
    
    /**
     * Format the call duration as HH:MM:SS
     *
     * @return string
     */
    public function getFormattedDurationAttribute()
    {
        if (!$this->duration) return '00:00:00';
        
        $hours = floor($this->duration / 3600);
        $minutes = floor(($this->duration % 3600) / 60);
        $seconds = $this->duration % 60;
        
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }
    
    /**
     * Extract caller number from clid
     *
     * @return string
     */
    public function getCallerNumberAttribute()
    {
        if (preg_match('/".*" <(.+)>/', $this->clid, $matches)) {
            return preg_replace('/\D/', '', $matches[1]);
        }
        
        return preg_replace('/\D/', '', $this->src);
    }
}

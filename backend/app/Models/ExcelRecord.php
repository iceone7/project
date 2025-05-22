<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExcelRecord extends Model
{
    public function up()
    {
        Schema::create('excel_records', function (Blueprint $table) {
            $table->id();
            $table->integer('N');
            $table->string('company_name')->nullable();
            $table->string('identification_code')->nullable();
            $table->string('contact_person1')->nullable();
            $table->string('tel1')->nullable();
            $table->string('contact_person2')->nullable();
            $table->string('tel2')->nullable();
            $table->string('contact_person3')->nullable();
            $table->string('tel3')->nullable();
            $table->string('caller_name')->nullable();
            $table->string('caller_number')->nullable();
            $table->string('receiver_number')->nullable();
            $table->integer('call_count')->default(0);
            $table->string('call_date')->nullable();
            $table->string('call_duration')->nullable();
            $table->string('call_status')->nullable();
            $table->timestamps();
        });
    }

    use HasFactory;
}

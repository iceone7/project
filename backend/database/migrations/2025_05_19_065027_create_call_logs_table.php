<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('call_logs', function (Blueprint $table) {
            $table->id();
            $table->string('caller_name')->nullable();
            $table->string('caller_number')->nullable();
            $table->string('receiver_number')->nullable();
            $table->integer('call_count')->default(0);
            $table->date('call_date')->nullable();
            $table->string('call_duration')->nullable();
            $table->string('call_status')->nullable();
            $table->string('company_name')->nullable(); 
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('call_logs');
    }
};

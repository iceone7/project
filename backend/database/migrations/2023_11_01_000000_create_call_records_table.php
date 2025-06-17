<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateCallRecordsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('call_records', function (Blueprint $table) {
            $table->id();
            $table->string('uniqueid')->nullable()->index();
            $table->dateTime('calldate')->nullable()->index();
            $table->string('clid')->nullable();
            $table->string('src')->nullable()->index();
            $table->string('dst')->nullable()->index();
            $table->integer('duration')->nullable();
            $table->string('disposition', 50)->nullable()->index();
            $table->string('recordingfile')->nullable();
            $table->timestamps();
            
            // Add index for common queries
            $table->index('calldate');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('call_records');
    }
}

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
        Schema::create('import_companies', function (Blueprint $table) {
            $table->id();
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
            $table->integer('call_count')->nullable();
            $table->date('call_date')->nullable();
            $table->string('call_duration')->nullable();
            $table->string('call_status')->nullable();
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
        Schema::dropIfExists('import_companies');
    }
};

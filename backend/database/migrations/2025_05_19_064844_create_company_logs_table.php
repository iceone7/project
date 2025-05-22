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
        Schema::create('company_logs', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('identification_code')->unique();
            $table->string('contact_person1')->nullable();
            $table->string('tel1')->nullable();
            $table->string('contact_person2')->nullable();
            $table->string('tel2')->nullable();
            $table->string('contact_person3')->nullable();
            $table->string('tel3')->nullable();
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
        Schema::dropIfExists('company_logs');
    }
};

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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('tenderNumber');
            $table->string('buyer');
            $table->string('contact1')->nullable();
            $table->string('phone1')->nullable();
            $table->string('contact2')->nullable();
            $table->string('phone2')->nullable();
            $table->string('email')->nullable();
            $table->string('executor')->nullable();
            $table->string('idCode')->nullable();
            $table->string('contractValue')->nullable();
            $table->string('totalValueGorgia')->nullable();
            $table->string('lastPurchaseDateGorgia')->nullable();
            $table->string('contractEndDate')->nullable();
            $table->string('foundationDate')->nullable();
            $table->string('manager')->nullable();
            $table->string('status')->nullable();
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
        Schema::dropIfExists('companies');
    }

    
};

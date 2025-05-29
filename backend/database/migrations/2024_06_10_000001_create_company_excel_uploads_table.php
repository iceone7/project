<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('company_excel_uploads', function (Blueprint $table) {
            $table->id();
            $table->string('tender_number')->nullable();
            $table->string('buyer')->nullable();
            $table->string('contact1')->nullable();
            $table->string('phone1')->nullable();
            $table->string('contact2')->nullable();
            $table->string('phone2')->nullable();
            $table->string('email')->nullable();
            $table->string('executor')->nullable();
            $table->string('id_code')->nullable();
            $table->string('contract_value')->nullable();
            $table->string('total_value_gorgia')->nullable();
            $table->string('last_purchase_date_gorgia')->nullable();
            $table->string('contract_end_date')->nullable();
            $table->string('foundation_date')->nullable();
            $table->string('manager')->nullable();
            $table->string('status')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('company_excel_uploads');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('company_excel_uploads', function (Blueprint $table) {
            $table->string('contact3')->nullable()->after('phone2');
            $table->string('phone3')->nullable()->after('contact3');
        });
    }

    public function down()
    {
        Schema::table('company_excel_uploads', function (Blueprint $table) {
            $table->dropColumn(['contact3', 'phone3']);
        });
    }
};

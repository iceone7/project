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
        // Check if columns already exist
        if (!Schema::hasColumn('company_excel_uploads', 'contact3')) {
            Schema::table('company_excel_uploads', function (Blueprint $table) {
                $table->string('contact3')->nullable()->after('phone2');
            });
        }
        
        if (!Schema::hasColumn('company_excel_uploads', 'phone3')) {
            Schema::table('company_excel_uploads', function (Blueprint $table) {
                $table->string('phone3')->nullable()->after('contact3');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('company_excel_uploads', function (Blueprint $table) {
            if (Schema::hasColumn('company_excel_uploads', 'contact3')) {
                $table->dropColumn('contact3');
            }
            if (Schema::hasColumn('company_excel_uploads', 'phone3')) {
                $table->dropColumn('phone3');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('company_excel_uploads', function (Blueprint $table) {
            if (!Schema::hasColumn('company_excel_uploads', 'manager_number')) {
                $table->string('manager_number')->nullable()->after('manager');
            }
        });
    }

    public function down()
    {
        Schema::table('company_excel_uploads', function (Blueprint $table) {
            if (Schema::hasColumn('company_excel_uploads', 'manager_number')) {
                $table->dropColumn('manager_number');
            }
        });
    }
};

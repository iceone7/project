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
        // Check if column already exists
        if (!Schema::hasColumn('company_excel_uploads', 'manager_number')) {
            Schema::table('company_excel_uploads', function (Blueprint $table) {
                $table->string('manager_number')->nullable()->after('manager');
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
            if (Schema::hasColumn('company_excel_uploads', 'manager_number')) {
                $table->dropColumn('manager_number');
            }
        });
    }
};

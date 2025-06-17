<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class UpdateCallDateInImportCompaniesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('import_companies', function (Blueprint $table) {
            // Change call_date to string type instead of date/datetime
            // First check if the column exists and change it
            if (Schema::hasColumn('import_companies', 'call_date')) {
                // For MySQL, convert to VARCHAR
                if (DB::connection()->getDriverName() === 'mysql') {
                    DB::statement('ALTER TABLE import_companies MODIFY call_date VARCHAR(100)');
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('import_companies', function (Blueprint $table) {
            // If needed, convert back to date type
            if (DB::connection()->getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE import_companies MODIFY call_date DATE NULL');
            }
        });
    }
}

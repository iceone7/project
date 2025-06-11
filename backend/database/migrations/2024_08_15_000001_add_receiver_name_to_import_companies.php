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
        if (!Schema::hasColumn('import_companies', 'receiver_name')) {
            Schema::table('import_companies', function (Blueprint $table) {
                $table->string('receiver_name')->nullable()->after('caller_number');
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
        Schema::table('import_companies', function (Blueprint $table) {
            if (Schema::hasColumn('import_companies', 'receiver_name')) {
                $table->dropColumn('receiver_name');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // First, check if the table exists
        if (Schema::hasTable('company_comments')) {
            // If foreign key exists, drop it
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE CONSTRAINT_SCHEMA = DATABASE()
                AND TABLE_NAME = 'company_comments'
                AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                AND CONSTRAINT_NAME LIKE '%company_id%'
            ");
            
            foreach ($foreignKeys as $foreignKey) {
                Schema::table('company_comments', function (Blueprint $table) use ($foreignKey) {
                    $table->dropForeign($foreignKey->CONSTRAINT_NAME);
                });
            }
            
            // Add source_table column if it doesn't exist
            if (!Schema::hasColumn('company_comments', 'source_table')) {
                Schema::table('company_comments', function (Blueprint $table) {
                    $table->string('source_table')->default('companies')->after('comment');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        if (Schema::hasTable('company_comments') && Schema::hasColumn('company_comments', 'source_table')) {
            Schema::table('company_comments', function (Blueprint $table) {
                $table->dropColumn('source_table');
            });
            
            // Re-add the foreign key
            Schema::table('company_comments', function (Blueprint $table) {
                $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            });
        }
    }
};

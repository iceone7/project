<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Check if the table exists
        if (!Schema::hasTable('import_companies')) {
            Schema::create('import_companies', function (Blueprint $table) {
                $table->id();
                $table->string('company_name')->nullable();
                $table->string('identification_code')->nullable();
                $table->string('contact_person1')->nullable();
                $table->string('tel1')->nullable();
                $table->string('contact_person2')->nullable();
                $table->string('tel2')->nullable();
                $table->string('contact_person3')->nullable();
                $table->string('tel3')->nullable();
                $table->string('caller_name')->nullable();
                $table->string('caller_number')->nullable();
                $table->string('receiver_name')->nullable();
                $table->string('receiver_number')->nullable();
                $table->integer('call_count')->default(0);
                $table->string('call_date')->nullable();
                $table->integer('call_duration')->nullable();
                $table->string('call_status')->nullable();
                $table->timestamps();
            });
        } else {
            // Add any missing columns
            Schema::table('import_companies', function (Blueprint $table) {
                if (!Schema::hasColumn('import_companies', 'receiver_name')) {
                    $table->string('receiver_name')->nullable()->after('caller_number');
                }
                
                if (!Schema::hasColumn('import_companies', 'receiver_number')) {
                    $table->string('receiver_number')->nullable()->after('receiver_name');
                }
            });
        }
    }

    public function down()
    {
        // We don't want to drop the table on rollback
    }
};

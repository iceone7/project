<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateDepartmentsAndUpdateUsers extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('departments')) {
            Schema::create('departments', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'role')) {
                    $table->enum('role', ['user', 'admin', 'super_admin'])->default('user')->after('password');
                }
                if (!Schema::hasColumn('users', 'department_id')) {
                    $table->unsignedBigInteger('department_id')->nullable()->after('role');
                    $table->foreign('department_id')->references('id')->on('departments')->onDelete('set null');
                }
            });
        }
    }


    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropColumn(['role', 'department_id']);
        });
        Schema::dropIfExists('departments');
    }
}

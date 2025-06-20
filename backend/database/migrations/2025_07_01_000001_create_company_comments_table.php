<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('company_comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('user_id');
            $table->text('comment');
            $table->string('source_table')->default('companies');
            $table->timestamps();
            
            // Foreign key to users table
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // We do NOT add a foreign key constraint for company_id since
            // it might reference either companies or company_excel_uploads tables
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_comments');
    }
};

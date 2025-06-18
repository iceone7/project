<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRecordingCommentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('recording_comments', function (Blueprint $table) {
            $table->id();
            $table->string('recording_id')->index(); // The recording file identifier
            $table->foreignId('user_id')->constrained(); // Who made the comment
            $table->text('comment'); // The comment content
            $table->timestamps();
            
            // Add an index to improve query performance
            $table->index(['recording_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('recording_comments');
    }
}

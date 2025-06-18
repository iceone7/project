<?php

namespace App\Http\Controllers;

use App\Models\RecordingComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class RecordingCommentController extends Controller
{
    /**
     * Get comments for a specific recording
     */
    public function index($recordingId)
    {
        try {
            Log::info('Fetching comments for recording ID: ' . $recordingId);
            
            $comments = RecordingComment::where('recording_id', $recordingId)
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->get();
                
            Log::info('Found ' . count($comments) . ' comments for recording ID: ' . $recordingId);
            
            return response()->json($comments);
        } catch (\Exception $e) {
            Log::error('Error fetching recording comments: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch comments'], 500);
        }
    }

    /**
     * Store a new comment for a recording
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'recording_id' => 'required|string',
                'comment' => 'required|string'
            ]);
            
            Log::info('Adding new comment for recording ID: ' . $request->recording_id);
            
            $comment = new RecordingComment();
            $comment->recording_id = $request->recording_id;
            $comment->user_id = Auth::id();
            $comment->comment = $request->comment;
            $comment->save();
            
            // Reload with user relationship
            $comment->load('user:id,name');
            
            Log::info('Successfully added comment ID: ' . $comment->id . ' for recording ID: ' . $request->recording_id);
            
            return response()->json($comment);
        } catch (\Exception $e) {
            Log::error('Error saving recording comment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to save comment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a comment for a recording
     * Only super_admin or the user who created the comment can delete it
     */
    public function destroy($id)
    {
        try {
            Log::info('Attempting to delete recording comment ID: ' . $id);
            
            $comment = RecordingComment::find($id);
            
            if (!$comment) {
                Log::warning('Comment not found for deletion: ' . $id);
                return response()->json(['error' => 'Comment not found'], 404);
            }
            
            // Check if user is authorized to delete (super_admin or comment owner)
            $user = Auth::user();
            if ($user->role !== 'super_admin' && $user->id !== $comment->user_id) {
                Log::warning('Unauthorized deletion attempt for comment ID: ' . $id . ' by user ID: ' . $user->id);
                return response()->json(['error' => 'You are not authorized to delete this comment'], 403);
            }
            
            // Delete the comment
            $comment->delete();
            
            Log::info('Successfully deleted comment ID: ' . $id . ' by user ID: ' . $user->id);
            
            return response()->json(['success' => true, 'message' => 'Comment deleted successfully']);
        } catch (\Exception $e) {
            Log::error('Error deleting recording comment: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to delete comment: ' . $e->getMessage()], 500);
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CommentsController extends Controller
{
    /**
     * Display comments for a specific call record
     *
     * @param string $cdrId The uniqueid of the call record
     * @return \Illuminate\Http\Response
     */
    public function index($cdrId)
    {
        try {
            Log::info('Fetching comments for call record', ['cdr_id' => $cdrId]);
            
            $comments = Comment::where('cdr_id', $cdrId)
                ->with('user:id,name')
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json($comments);
        } catch (\Exception $e) {
            Log::error('Error fetching comments: ' . $e->getMessage(), [
                'cdr_id' => $cdrId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch comments: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Store a new comment
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'cdr_id' => 'required|string',
                'comment' => 'required|string|max:1000'
            ]);
            
            $comment = Comment::create([
                'cdr_id' => $validated['cdr_id'],
                'user_id' => Auth::id(),
                'comment' => $validated['comment']
            ]);
            
            // Load the user relationship for the response
            $comment->load('user:id,name');
            
            Log::info('Comment created successfully', [
                'comment_id' => $comment->id,
                'cdr_id' => $validated['cdr_id']
            ]);
            
            return response()->json($comment, 201);
        } catch (\Exception $e) {
            Log::error('Error creating comment: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create comment: ' . $e->getMessage()
            ], 500);
        }
    }
}

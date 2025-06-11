<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CommentController extends Controller
{
    public function index($cdr_id)
    {
        Log::info('Fetching comments for cdr_id: ' . $cdr_id);
        
        try {
            // Clean the cdr_id
            $normalizedCdrId = strval(trim($cdr_id));
            Log::info('Normalized request cdr_id: "' . $normalizedCdrId . '"');
            
            // List all comments first for full debugging
            $allComments = Comment::with('user')->get();
            Log::info('Total comments in database: ' . $allComments->count());
            
            foreach ($allComments as $comment) {
                Log::info("DB Comment #" . $comment->id . " has cdr_id: '" . $comment->cdr_id . "'");
            }
            
            // Direct exact string comparison - most basic approach
            $comments = [];
            foreach ($allComments as $comment) {
                if (strcmp($comment->cdr_id, $normalizedCdrId) === 0) {
                    $comments[] = $comment;
                }
            }
            
            if (count($comments) > 0) {
                Log::info('Found ' . count($comments) . ' comments with exact string comparison');
                // Convert to collection and sort
                $comments = collect($comments)->sortByDesc('created_at')->values();
            } else {
                Log::info('No comments found with exact comparison. Using database query as fallback.');
                // If manual comparison failed, try standard query
                $comments = Comment::where('cdr_id', $normalizedCdrId)
                    ->orWhere('cdr_id', 'LIKE', '%' . $normalizedCdrId . '%')
                    ->with('user')
                    ->orderBy('created_at', 'desc')
                    ->get();
                
                Log::info('Database query found ' . $comments->count() . ' comments');
            }
            
            return response()->json($comments);
        } catch (\Exception $e) {
            Log::error('Error fetching comments: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'message' => 'Error fetching comments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'cdr_id' => 'required|string',
                'comment' => 'required|string',
            ]);

            $cdrId = strval($request->cdr_id);
            Log::info('Creating comment for cdr_id: "' . $cdrId . '"');

            $comment = Comment::create([
                'cdr_id' => $cdrId,
                'comment' => $request->comment,
                'user_id' => Auth::id(),
            ]);

            Log::info('Comment created successfully with ID: ' . $comment->id);
            Log::info('Stored cdr_id: "' . $comment->cdr_id . '"');

            return response()->json($comment->load('user'), 201);
        } catch (\Exception $e) {
            Log::error('Error creating comment: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            
            return response()->json([
                'message' => 'Error creating comment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    public function index($cdr_id)
    {
        $comments = Comment::where('cdr_id', $cdr_id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($comments);
    }

    public function store(Request $request)
    {
        $request->validate([
            'cdr_id' => 'required|string',
            'comment' => 'required|string',
        ]);

        $comment = Comment::create([
            'cdr_id' => $request->cdr_id,
            'comment' => $request->comment,
            'user_id' => Auth::id(),
        ]);

        return response()->json($comment->load('user'), 201);
    }
}
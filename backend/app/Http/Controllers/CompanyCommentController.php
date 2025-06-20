<?php

namespace App\Http\Controllers;

use App\Models\CompanyComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class CompanyCommentController extends Controller
{
    /**
     * Get comments for a specific company
     *
     * @param int $companyId
     * @return \Illuminate\Http\Response
     */
    public function index($companyId)
    {
        try {
            // Check if company exists before querying comments
            $companyInfo = $this->findCompanyInfo($companyId);
            
            if (!$companyInfo) {
                return response()->json([
                    'error' => 'Company not found'
                ], 404);
            }
            
            $comments = CompanyComment::where('company_id', $companyId)
                ->where('source_table', $companyInfo['table'])
                ->whereNull('parent_id')  // Only get top-level comments
                ->with(['user:id,name', 'replies.user:id,name'])  // Load replies with their users
                ->orderBy('created_at', 'desc')
                ->get();
            
            return response()->json($comments);
        } catch (\Exception $e) {
            Log::error('Error fetching company comments: ' . $e->getMessage(), [
                'company_id' => $companyId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to fetch comments: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new comment for a company
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        try {
            // First validate the basic required fields
            $validated = $request->validate([
                'company_id' => 'required',
                'comment' => 'required|string|max:1000',
                'parent_id' => 'nullable|exists:company_comments,id'
            ]);
            
            // Then manually check if the company exists and determine which table it's in
            $companyId = $validated['company_id'];
            $companyInfo = $this->findCompanyInfo($companyId);
            
            if (!$companyInfo) {
                return response()->json([
                    'error' => 'The selected company does not exist.'
                ], 422);
            }
            
            $comment = CompanyComment::create([
                'company_id' => $companyId,
                'user_id' => Auth::id(),
                'comment' => $validated['comment'],
                'source_table' => $companyInfo['table'],
                'parent_id' => $validated['parent_id'] ?? null
            ]);
            
            // Load the user relationship for the response
            $comment->load('user:id,name');
            
            Log::info('Company comment created successfully', [
                'comment_id' => $comment->id,
                'company_id' => $companyId,
                'source_table' => $companyInfo['table'],
                'is_reply' => isset($validated['parent_id'])
            ]);
            
            return response()->json($comment, 201);
        } catch (\Exception $e) {
            Log::error('Error creating company comment: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create comment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a comment
     * Only super_admin can delete comments
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        try {
            $comment = CompanyComment::findOrFail($id);
            $user = Auth::user();
            
            // Check if user is authorized to delete this comment - only super_admin
            if ($user->role !== 'super_admin') {
                return response()->json([
                    'error' => 'Only super admins can delete comments'
                ], 403);
            }
            
            $comment->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Comment deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting company comment: ' . $e->getMessage(), [
                'comment_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to delete comment: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Helper method to find a company and determine which table it's in
     * 
     * @param int $companyId
     * @return array|null
     */
    private function findCompanyInfo($companyId)
    {
        // First check in companies table
        $companyExists = DB::table('companies')->where('id', $companyId)->exists();
        if ($companyExists) {
            return [
                'exists' => true,
                'table' => 'companies'
            ];
        }
        
        // Then check in company_excel_uploads
        $uploadExists = DB::table('company_excel_uploads')->where('id', $companyId)->exists();
        if ($uploadExists) {
            return [
                'exists' => true,
                'table' => 'company_excel_uploads'
            ];
        }
        
        return null;
    }
}

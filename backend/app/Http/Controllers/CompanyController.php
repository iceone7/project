<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Company;

class CompanyController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tenderNumber' => 'required|string',
            'buyer' => 'required|string',
            'contact1' => 'nullable|string',
            'phone1' => 'nullable|string',
            'contact2' => 'nullable|string',
            'phone2' => 'nullable|string',
            'email' => 'nullable|email',
            'executor' => 'nullable|string',
            'idCode' => 'nullable|string',
            'contractValue' => 'nullable|string',
            'totalValueGorgia' => 'nullable|string',
            'lastPurchaseDateGorgia' => 'nullable|string',
            'contractEndDate' => 'nullable|string',
            'foundationDate' => 'nullable|string',
            'manager' => 'nullable|string',
            'managerNumber' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => $validator->errors()
            ], 400);
        }

        $company = Company::create($request->all());

        return response()->json([
            'status' => 'success',
            'data' => $company
        ]);
    }

    public function index()
    {
        $companies = Company::all();

        return response()->json([
            'status' => 'success',
            'data' => $companies
        ]);
    }

    public function destroy($id)
    {
        $company = Company::findOrFail($id);
        $company->delete();
        
        return response()->json(['success' => true]);
    }

    public function update(Request $request, $id)
    {
        $company = Company::findOrFail($id);
        $company->update($request->all());
        
        return response()->json(['success' => true, 'data' => $company]);
    }

}

package com.kevin.monvin.finance.models

import com.google.gson.annotations.SerializedName

// Response List Transaksi (Bisa menggunakan ulang TransactionItem dari Dasbor)
data class TransactionListResponse(
    val success: Boolean,
    val data: List<TransactionItem>?
)

// Response Kategori
data class CategoryResponse(
    val success: Boolean,
    val data: List<CategoryItem>?
)

data class CategoryItem(
    val id: String,
    val name: String,
    val type: String
)

// Request Simpan Transaksi Manual
data class CreateTransactionRequest(
    val amount: Double,
    val note: String,
    val date: String,
    val walletId: String,
    val categoryId: String
)

// Request Buat Kategori Baru (On-The-Fly)
data class CreateCategoryRequest(
    val name: String,
    val type: String
)

data class CreateCategoryResponse(
    val success: Boolean,
    @SerializedName("data") val category: CategoryItem?
)

// Model AI Gemini
data class AiParseRequest(val text: String)

data class AiParseResponse(
    val success: Boolean,
    val suggestion: AiSuggestion?
)

data class AiSuggestion(
    val amount: Double?,
    val note: String?,
    val walletId: String?,
    val categoryId: String?
)
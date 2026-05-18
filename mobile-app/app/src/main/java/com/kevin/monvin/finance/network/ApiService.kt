package com.kevin.monvin.finance.network

import com.kevin.monvin.finance.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @POST("users/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("users/check-username")
    suspend fun checkUsername(
        @Body request: CheckUsernameRequest
    ): Response<RegisterResponse>

    @POST("users/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @GET("dashboard")
    suspend fun getDashboard(@Header("Authorization") token: String): Response<DashboardResponse>

    // 🔥 AMBIL DAFTAR DOMPET
    @GET("wallets")
    suspend fun getWallets(@Header("Authorization") token: String): Response<WalletResponse>

    // 🔥 BUAT DOMPET BARU
    @POST("wallets")
    suspend fun createWallet(
        @Header("Authorization") token: String,
        @Body request: CreateWalletRequest
    ): Response<CreateWalletResponse>

    // 🔥 TRANSAKSI & KATEGORI
    @GET("transactions")
    suspend fun getTransactions(@Header("Authorization") token: String): Response<TransactionListResponse>

    @GET("categories")
    suspend fun getCategories(@Header("Authorization") token: String): Response<CategoryResponse>

    @POST("transactions")
    suspend fun createTransaction(@Header("Authorization") token: String, @Body request: CreateTransactionRequest): Response<Any>

    @POST("categories")
    suspend fun createCategory(@Header("Authorization") token: String, @Body request: CreateCategoryRequest): Response<CreateCategoryResponse>

    // 🔥 AI GEMINI PARSER
    @POST("gemini/parse")
    suspend fun parseTransactionAi(@Header("Authorization") token: String, @Body request: AiParseRequest): Response<AiParseResponse>
}
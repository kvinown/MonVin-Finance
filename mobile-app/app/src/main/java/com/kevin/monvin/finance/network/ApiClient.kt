package com.kevin.monvin.finance.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    // IP khusus Emulator Android untuk menembak localhost komputer
    // Sesuaikan port 5000 dengan port backend Node.js kamu!
    private const val BASE_URL = "http://192.168.137.1:5000/api/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        // Tampilkan log request & response di panel Logcat (sangat berguna untuk debugging)
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val instance: ApiService by lazy {
        val retrofit = Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        retrofit.create(ApiService::class.java)
    }
}
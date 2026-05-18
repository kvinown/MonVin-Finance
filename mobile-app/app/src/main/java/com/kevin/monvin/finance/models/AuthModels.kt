package com.kevin.monvin.finance.models

import com.google.gson.annotations.SerializedName

// Model untuk Payload (Data yang dikirim saat Login)
data class LoginRequest(
    val identifier: String,
    val password: String
)

// Model untuk Response (Data balasan dari Backend)
data class LoginResponse(
    val success: Boolean,
    val message: String,
    val token: String?,
    @SerializedName("data") val user: UserData?
)

data class UserData(
    val id: String,
    val name: String,
    val username: String,
    val email: String
)

// Model untuk Payload Pendaftaran
data class RegisterRequest(
    val name: String,
    val username: String,
    val email: String,
    val password: String
)

// Model untuk Response Pendaftaran
data class RegisterResponse(
    val success: Boolean,
    val message: String,
    @SerializedName("data") val user: UserData?
)

data class CheckUsernameRequest(
    val username: String
)
package com.kevin.monvin.finance.models

import com.google.gson.annotations.SerializedName

data class WalletResponse(
    val success: Boolean,
    val message: String,
    val data: List<WalletItem>?
)

data class CreateWalletRequest(
    val name: String,
    val type: String, // "CASH" atau "BANK"
    val balance: Double
)

data class CreateWalletResponse(
    val success: Boolean,
    val message: String,
    @SerializedName("data") val wallet: WalletItem?
)

data class WalletItem(
    val id: String,
    val name: String,
    val type: String,
    val balance: Double
)
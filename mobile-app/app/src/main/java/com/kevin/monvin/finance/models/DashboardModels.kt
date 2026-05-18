package com.kevin.monvin.finance.models

data class DashboardResponse(
    val success: Boolean,
    val message: String,
    val data: DashboardData?
)

data class DashboardData(
    val summary: DashboardSummary,
    val recentTransactions: List<TransactionItem>
)

data class DashboardSummary(
    val totalBalance: Double,
    val totalIncome: Double,
    val totalExpense: Double
)

data class TransactionItem(
    val id: String,
    val amount: Double,
    val note: String?,
    val date: String,
    val category: CategoryInfo,
    val wallet: WalletInfo
)

data class CategoryInfo(
    val name: String,
    val type: String // "INCOME" atau "EXPENSE"
)

data class WalletInfo(
    val name: String
)
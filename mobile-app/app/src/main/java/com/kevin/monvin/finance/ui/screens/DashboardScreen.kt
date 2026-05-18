package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.models.DashboardData
import com.kevin.monvin.finance.network.ApiClient
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    sessionManager: SessionManager,
    navController: NavController,
    isDarkMode: Boolean
) {
    val userName by sessionManager.userName.collectAsState(initial = "Pengguna")
    val token by sessionManager.userToken.collectAsState(initial = null)

    var dashboardData by remember { mutableStateOf<DashboardData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Helper Format Rupiah
    val formatIDR = { amount: Double ->
        val format = NumberFormat.getCurrencyInstance(Locale("in", "ID"))
        format.maximumFractionDigits = 0
        format.format(amount).replace("Rp", "Rp ")
    }

    // Helper Format Tanggal
    val formatDate = { dateString: String ->
        try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            val formatter = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
            parser.parse(dateString)?.let { formatter.format(it) } ?: dateString
        } catch (e: Exception) {
            dateString
        }
    }

    // Menembak API secara otomatis saat layar terbuka dan token tersedia
    // ✅ PERBAIKAN: Hapus coroutineScope.launch, biarkan berjalan native di LaunchedEffect
    LaunchedEffect(token) {
        if (!token.isNullOrEmpty()) {
            try {
                isLoading = true
                errorMessage = null // Reset error state sebelum fetch

                // Panggil API langsung tanpa dibungkus scope luar lagi
                val response = ApiClient.instance.getDashboard("Bearer $token")
                if (response.isSuccessful && response.body()?.success == true) {
                    dashboardData = response.body()?.data
                } else {
                    errorMessage = "Gagal memuat data dasbor."
                }
            } catch (e: Exception) {
                // Sekarang e.localizedMessage tidak akan membawa error "left composition" lagi
                errorMessage = "Koneksi ke server bermasalah: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        bottomBar = { BottomNavigationBar(navController) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Blue600)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            if (errorMessage != null) {
                item {
                    Text(text = errorMessage!!, color = Red600, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp))
                }
            }

            // HEADER
            item {
                Column {
                    Text(text = "Ringkasan Finansial", style = Typography.labelMedium, color = Slate400)
                    Text(text = "Halo, $userName", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)
                }
            }

            // KARTU 1: TOTAL ASET
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(modifier = Modifier.size(48.dp).background(Blue600.copy(alpha = 0.1f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Wallet, contentDescription = null, tint = Blue600)
                        }
                        Column {
                            Text(text = "TOTAL KOMBINASI ASET", style = Typography.labelMedium, color = Slate400)
                            Text(
                                text = formatIDR(dashboardData?.summary?.totalBalance ?: 0.0),
                                style = Typography.displayLarge,
                                fontSize = 24.sp,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        }
                    }
                }
            }

            // KARTU 2 & 3: PEMASUKAN & PENGELUARAN
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Icon(Icons.Default.TrendingUp, contentDescription = null, tint = Green600, modifier = Modifier.padding(bottom = 8.dp))
                            Text(text = "PEMASUKAN", style = Typography.labelMedium, color = Slate400)
                            Text(text = formatIDR(dashboardData?.summary?.totalIncome ?: 0.0), style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = Green600)
                        }
                    }
                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Icon(Icons.Default.TrendingDown, contentDescription = null, tint = Red600, modifier = Modifier.padding(bottom = 8.dp))
                            Text(text = "PENGELUARAN", style = Typography.labelMedium, color = Slate400)
                            Text(text = formatIDR(dashboardData?.summary?.totalExpense ?: 0.0), style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = Red600)
                        }
                    }
                }
            }

            // BLOK AI GEMINI
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isDarkMode) Slate800 else Slate900)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Blue400, modifier = Modifier.size(16.dp))
                            Text(text = "MODUL ANALISIS KOMPUTASI", style = Typography.labelMedium, color = Blue400)
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = "Optimasi Efisiensi Finansial Bulanan Anda", style = Typography.displayLarge, fontSize = 20.sp, color = Slate50)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { /* TODO: Tembak API Insight */ },
                            colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text("Minta Saran AI", fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            // JUDUL TRANSAKSI TERBARU
            item {
                Text(text = "Aktivitas Transaksi Terakhir", style = Typography.labelMedium, color = Slate500, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
            }

            // LIST TRANSAKSI TERBARU MENGGUNAKAN ITEMS
            if (dashboardData?.recentTransactions.isNullOrEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(text = "Belum ada aktivitas rekam transaksi.", style = Typography.bodyLarge, color = Slate400)
                        }
                    }
                }
            } else {
                items(dashboardData!!.recentTransactions) { trx ->
                    val isIncome = trx.category.type == "INCOME"
                    val textColor = if (isIncome) Green600 else MaterialTheme.colorScheme.onBackground
                    val sign = if (isIncome) "+" else "-"

                    Card(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                                // Badge Kategori
                                Surface(shape = RoundedCornerShape(4.dp), color = Slate200.copy(alpha = 0.5f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
                                        Icon(
                                            imageVector = if (isIncome) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                                            contentDescription = null,
                                            tint = if (isIncome) Green600 else Red600,
                                            modifier = Modifier.size(12.dp).padding(end = 4.dp)
                                        )
                                        Text(text = trx.category.name, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate800)
                                    }
                                }
                                // Nominal
                                Text(text = "$sign${formatIDR(trx.amount)}", fontWeight = FontWeight.Bold, color = textColor)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            // Catatan
                            Text(text = trx.note ?: "Tanpa catatan", style = Typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                            Spacer(modifier = Modifier.height(8.dp))
                            // Footer: Dompet & Tanggal
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Wallet, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(text = trx.wallet.name, fontSize = 12.sp, color = Slate500)
                                }
                                Text(text = formatDate(trx.date), fontSize = 12.sp, color = Slate500)
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(32.dp)) }
        }
    }
}
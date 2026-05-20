package com.kevin.monvin.finance.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Layers
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import com.kevin.monvin.finance.BuildConfig

// --- Data Models Internal ---
data class LocalWallet(val id: String, val name: String, val type: String, val balance: Double)
data class LocalCategory(val name: String, val type: String)
data class LocalTransaction(val id: String, val amount: Double, val note: String, val date: String, val category: LocalCategory, val walletName: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    sessionManager: SessionManager,
    navController: NavController,
    isDarkMode: Boolean
) {
    val userName by sessionManager.userName.collectAsState(initial = "Pengguna")
    val uid by sessionManager.userToken.collectAsState(initial = null) // UID Firebase

    val coroutineScope = rememberCoroutineScope()
    val db = FirebaseFirestore.getInstance()

    // State Data Dasbor
    var totalBalance by remember { mutableDoubleStateOf(0.0) }
    var totalIncome by remember { mutableDoubleStateOf(0.0) }
    var totalExpense by remember { mutableDoubleStateOf(0.0) }
    var walletsList by remember { mutableStateOf<List<LocalWallet>>(emptyList()) }
    var recentTransactions by remember { mutableStateOf<List<LocalTransaction>>(emptyList()) }

    // State AI Insight & Profil
    var insightText by remember { mutableStateOf("") }
    var tokenUsed by remember { mutableIntStateOf(0) }
    var tokenMax by remember { mutableIntStateOf(5) }
    var isProfileComplete by remember { mutableStateOf(false) }
    var userProfileData by remember { mutableStateOf<Map<String, Any>>(emptyMap()) }

    var isLoading by remember { mutableStateOf(true) }
    var isInsightLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Helpers Formatting
    val formatIDR = { amount: Double ->
        val format = NumberFormat.getCurrencyInstance(Locale("in", "ID"))
        format.maximumFractionDigits = 0
        format.format(amount).replace("Rp", "Rp ")
    }

    val formatDate = { dateString: String ->
        try {
            val parser = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val formatter = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
            val date = parser.parse(dateString.substringBefore("T"))
            date?.let { formatter.format(it) } ?: dateString
        } catch (e: Exception) {
            dateString
        }
    }

    // 1. FUNGSI FETCH DATA DASHBOARD DARI FIREBASE
    LaunchedEffect(uid) {
        if (!uid.isNullOrEmpty()) {
            try {
                isLoading = true
                errorMessage = null

                // A. Ambil Data Dompet
                val wSnap = db.collection("wallets").whereEqualTo("userId", uid).get().await()
                var tBalance = 0.0
                val wList = mutableListOf<LocalWallet>()
                for (doc in wSnap.documents) {
                    val bal = doc.getDouble("balance") ?: 0.0
                    tBalance += bal
                    wList.add(LocalWallet(doc.id, doc.getString("name") ?: "", doc.getString("type") ?: "", bal))
                }
                totalBalance = tBalance
                walletsList = wList.sortedBy { it.name }

                // B. Ambil Data Transaksi
                val currentMonthStart = SimpleDateFormat("yyyy-MM-01'T'00:00:00.000'Z'", Locale.getDefault()).format(Date())
                val tSnap = db.collection("transactions")
                    .whereEqualTo("userId", uid)
                    .orderBy("date", Query.Direction.DESCENDING)
                    .get().await()

                var tInc = 0.0
                var tExp = 0.0
                val trxList = mutableListOf<LocalTransaction>()

                for (doc in tSnap.documents) {
                    val amount = doc.getDouble("amount") ?: 0.0
                    val date = doc.getString("date") ?: ""
                    val catMap = doc.get("category") as? Map<*, *>
                    val catType = catMap?.get("type") as? String ?: ""
                    val catName = catMap?.get("name") as? String ?: ""
                    val walMap = doc.get("wallet") as? Map<*, *>
                    val walName = walMap?.get("name") as? String ?: ""

                    trxList.add(LocalTransaction(doc.id, amount, doc.getString("note") ?: "", date, LocalCategory(catName, catType), walName))

                    if (date >= currentMonthStart) {
                        if (catType == "INCOME") tInc += amount
                        if (catType == "EXPENSE") tExp += amount
                    }
                }
                totalIncome = tInc
                totalExpense = tExp
                recentTransactions = trxList.take(5)

                // C. Ambil Data User (Token & Profil AI)
                val uSnap = db.collection("users").document(uid!!).get().await()
                val currentMonthId = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date())

                if (uSnap.exists()) {
                    val dataMap = uSnap.data ?: emptyMap()
                    userProfileData = dataMap

                    val bDate = dataMap["birthDate"] as? String
                    val status = dataMap["status"] as? String
                    val field = dataMap["field"] as? String
                    val loc = dataMap["location"] as? String
                    isProfileComplete = !bDate.isNullOrBlank() && !status.isNullOrBlank() && !field.isNullOrBlank() && !loc.isNullOrBlank()

                    val resetMonth = dataMap["aiResetMonth"] as? String
                    if (resetMonth == currentMonthId) {
                        tokenUsed = (dataMap["aiInsightCount"] as? Number)?.toInt() ?: 0
                    } else {
                        db.collection("users").document(uid!!).update(mapOf("aiInsightCount" to 0, "aiResetMonth" to currentMonthId)).await()
                        tokenUsed = 0
                    }
                }

                // D. Ambil Riwayat Insight Terakhir
                val iSnap = db.collection("insights")
                    .whereEqualTo("userId", uid)
                    .orderBy("createdAt", Query.Direction.DESCENDING)
                    .limit(1)
                    .get().await()
                if (!iSnap.isEmpty) {
                    insightText = iSnap.documents[0].getString("content") ?: ""
                }

            } catch (e: Exception) {
                errorMessage = "Gagal memuat dasbor: ${e.localizedMessage}"
                Log.e("Dashboard", "Error", e)
            } finally {
                isLoading = false
            }
        }
    }

    // 2. FUNGSI REQUEST AI KE GEMINI
    val handleFetchInsight: () -> Unit = {
        coroutineScope.launch {
            if (uid.isNullOrEmpty()) return@launch
            isInsightLoading = true

            try {
                val uSnap = db.collection("users").document(uid!!).get().await()
                val currentMonthId = SimpleDateFormat("yyyy-MM", Locale.getDefault()).format(Date())
                var currentUsed = 0
                if (uSnap.getString("aiResetMonth") == currentMonthId) {
                    currentUsed = (uSnap.getLong("aiInsightCount"))?.toInt() ?: 0
                }

                if (currentUsed >= tokenMax) {
                    insightText = "⚠️ Kuota pembuatan saran AI Anda bulan ini telah habis (Maksimal $tokenMax kali). Sisa kuota akan pulih otomatis di bulan baru."
                    isInsightLoading = false
                    return@launch
                }

                var prompt = ""
                if (isProfileComplete) {
                    val bDateStr = userProfileData["birthDate"] as? String ?: ""
                    var age = 0
                    try {
                        val dob = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(bDateStr)
                        val calDOB = Calendar.getInstance().apply { time = dob!! }
                        val today = Calendar.getInstance()
                        age = today.get(Calendar.YEAR) - calDOB.get(Calendar.YEAR)
                        if (today.get(Calendar.DAY_OF_YEAR) < calDOB.get(Calendar.DAY_OF_YEAR)) age--
                    } catch (e: Exception) {}

                    val status = userProfileData["status"]
                    val field = userProfileData["field"]
                    val loc = userProfileData["location"]

                    prompt = "Berperanlah sebagai penasihat keuangan taktis. Klien Anda adalah seorang $status di bidang/jurusan $field berusia $age tahun yang berdomisili di $loc. Data bulan ini: Pemasukan Rp$totalIncome, Pengeluaran Rp$totalExpense, Sisa Saldo Total Rp$totalBalance. Berikan maksimal 3 kalimat saran restrukturisasi anggaran yang tajam, relevan dengan gaya hidup profesi di area tersebut, dan langsung pada intinya."
                } else {
                    prompt = "Berperanlah sebagai penasihat keuangan makro. Data bulan ini: Pemasukan Rp$totalIncome, Pengeluaran Rp$totalExpense, Sisa Saldo Total Rp$totalBalance. Berikan maksimal 3 kalimat saran restrukturisasi kas anggaran secara umum, taktis, dan mudah dipahami tanpa data demografi."
                }

                val resultText = withContext(Dispatchers.IO) {
                    val client = OkHttpClient()
                    val mediaType = "application/json; charset=utf-8".toMediaType()

                    // 🔥 GANTI DENGAN API KEY GEMINI KAMU (Sama dengan di .env web)
                    val apiKey = BuildConfig.GEMINI_API_KEY
                    val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=$apiKey"

                    val safePrompt = prompt.replace("\"", "\\\"").replace("\n", " ")
                    val jsonBody = """{"contents": [{"parts": [{"text": "$safePrompt"}]}]}"""

                    val request = Request.Builder().url(url).post(jsonBody.toRequestBody(mediaType)).build()
                    val response = client.newCall(request).execute()

                    if (response.isSuccessful) {
                        val respBody = response.body?.string() ?: ""
                        val jsonResp = JSONObject(respBody)
                        jsonResp.getJSONArray("candidates")
                            .getJSONObject(0).getJSONObject("content")
                            .getJSONArray("parts").getJSONObject(0)
                            .getString("text")
                    } else {
                        throw Exception("Google AI Error: ${response.code}")
                    }
                }

                val isoTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
                val newInsightData = hashMapOf(
                    "userId" to uid,
                    "content" to resultText,
                    "createdAt" to isoTime,
                    "balancesSnapshot" to mapOf("income" to totalIncome, "expense" to totalExpense, "balance" to totalBalance)
                )
                db.collection("insights").add(newInsightData).await()

                val newUsedCount = currentUsed + 1
                db.collection("users").document(uid!!).update(mapOf(
                    "aiInsightCount" to newUsedCount,
                    "aiResetMonth" to currentMonthId
                )).await()

                insightText = resultText
                tokenUsed = newUsedCount

            } catch (e: Exception) {
                insightText = "Kecerdasan buatan sedang sibuk atau terjadi kesalahan koneksi. Silakan coba lagi nanti."
                Log.e("Gemini", "Error AI", e)
            } finally {
                isInsightLoading = false
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
                item { Text(text = errorMessage!!, color = Red600, fontSize = 14.sp, modifier = Modifier.padding(bottom = 8.dp)) }
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
                            Text(text = formatIDR(totalBalance), style = Typography.displayLarge, fontSize = 24.sp, color = MaterialTheme.colorScheme.onBackground)
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
                            Text(text = formatIDR(totalIncome), style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = Green600)
                        }
                    }
                    Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Icon(Icons.Default.TrendingDown, contentDescription = null, tint = Red600, modifier = Modifier.padding(bottom = 8.dp))
                            Text(text = "PENGELUARAN", style = Typography.labelMedium, color = Slate400)
                            Text(text = formatIDR(totalExpense), style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = Red600)
                        }
                    }
                }
            }

            // BLOK BARU: KOMPOSISI ALOKASI DOMPET
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
                            Icon(Icons.Default.Layers, contentDescription = null, tint = Slate400, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("KOMPOSISI ALOKASI DOMPET", style = Typography.labelMedium, color = Slate900.copy(alpha = 0.8f))
                        }

                        if (walletsList.isEmpty()) {
                            Text("Belum ada aset terdaftar.", color = Slate400, fontSize = 12.sp, modifier = Modifier.padding(vertical = 8.dp))
                        } else {
                            walletsList.forEach { wallet ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).background(if (isDarkMode) Slate800 else Slate50, RoundedCornerShape(8.dp)).padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(text = wallet.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground)
                                        Text(text = wallet.type, fontSize = 10.sp, color = Slate400, fontWeight = FontWeight.Bold)
                                    }
                                    Text(text = formatIDR(wallet.balance), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                                }
                            }
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
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Blue400, modifier = Modifier.size(16.dp))
                                Text(text = "MODUL AI GEMINI", style = Typography.labelMedium, color = Blue400)
                            }
                            Surface(color = if(isDarkMode) Slate700 else Slate950, shape = RoundedCornerShape(16.dp)) {
                                Text(text = "${tokenMax - tokenUsed} / $tokenMax Sisa", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate300, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Text(text = "Optimasi Efisiensi Finansial", style = Typography.displayLarge, fontSize = 20.sp, color = Slate50)

                        if (!isProfileComplete) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(color = Amber600.copy(alpha = 0.2f), shape = RoundedCornerShape(8.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Amber600.copy(alpha = 0.5f))) {
                                Text(text = "⚠️ Saran saat ini bersifat umum. Lengkapi profil di menu Pengaturan untuk analisis presisi.", fontSize = 11.sp, color = Amber400, modifier = Modifier.padding(10.dp))
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (insightText.isNotEmpty()) {
                            Surface(color = Slate950.copy(alpha = 0.4f), shape = RoundedCornerShape(8.dp)) {
                                Text(text = insightText, fontSize = 13.sp, color = Slate200, modifier = Modifier.padding(12.dp), lineHeight = 20.sp)
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                        }

                        Button(
                            onClick = handleFetchInsight,
                            enabled = !isInsightLoading && tokenUsed < tokenMax,
                            colors = ButtonDefaults.buttonColors(containerColor = Blue600, disabledContainerColor = Slate700),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (isInsightLoading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            else Text(if (tokenUsed >= tokenMax) "Kuota Habis" else "Minta Saran AI", fontWeight = FontWeight.Medium, color = if(tokenUsed >= tokenMax) Slate400 else Color.White)
                        }
                    }
                }
            }

            // TRANSAKSI TERBARU
            item {
                Text(text = "Aktivitas Transaksi Terakhir", style = Typography.labelMedium, color = Slate500, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
            }

            if (recentTransactions.isEmpty()) {
                item {
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(text = "Belum ada aktivitas rekam transaksi.", style = Typography.bodyLarge, color = Slate400)
                        }
                    }
                }
            } else {
                items(recentTransactions) { trx ->
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
                                Surface(shape = RoundedCornerShape(4.dp), color = Slate200.copy(alpha = 0.5f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
                                        Icon(
                                            imageVector = if (isIncome) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                                            contentDescription = null, tint = if (isIncome) Green600 else Red600, modifier = Modifier.size(12.dp).padding(end = 4.dp)
                                        )
                                        Text(text = trx.category.name, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate800)
                                    }
                                }
                                Text(text = "$sign${formatIDR(trx.amount)}", fontWeight = FontWeight.Bold, color = textColor)
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = trx.note.ifEmpty { "Tanpa catatan" }, style = Typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Wallet, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(text = trx.walletName, fontSize = 12.sp, color = Slate500)
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
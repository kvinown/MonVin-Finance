package com.kevin.monvin.finance.ui.screens

import android.util.Log
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.kevin.monvin.finance.BuildConfig
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
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// --- Data Models Internal ---
data class TxWallet(val id: String, val name: String, val balance: Double)
data class TxCategory(val id: String, val name: String, val type: String)
data class TxTransaction(val id: String, val amount: Double, val note: String, val date: String, val walletId: String, val walletName: String, val categoryId: String, val categoryName: String, val categoryType: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(sessionManager: SessionManager, navController: NavController, isDarkMode: Boolean) {
    val uid by sessionManager.userToken.collectAsState(initial = null)
    val coroutineScope = rememberCoroutineScope()
    val db = FirebaseFirestore.getInstance()

    // State Master Data
    var transactionsList by remember { mutableStateOf<List<TxTransaction>>(emptyList()) }
    var walletsList by remember { mutableStateOf<List<TxWallet>>(emptyList()) }
    var categoriesList by remember { mutableStateOf<List<TxCategory>>(emptyList()) }

    var isLoading by remember { mutableStateOf(true) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // State Filter ("ALL", "INCOME", "EXPENSE")
    var currentFilter by remember { mutableStateOf("ALL") }

    // State Dialog Kontrol
    var isManualDialogOpen by remember { mutableStateOf(false) }
    var isAiDialogOpen by remember { mutableStateOf(false) }
    var isAddingNewCategoryForm by remember { mutableStateOf(false) }
    var transactionToDelete by remember { mutableStateOf<TxTransaction?>(null) }

    // State Fields Form Manual
    var formAmount by remember { mutableStateOf("") }
    var formNote by remember { mutableStateOf("") }
    var formDate by remember { mutableStateOf(SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())) }
    var selectedWalletId by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf("") }
    var formCategoryType by remember { mutableStateOf("EXPENSE") } // EXPENSE atau INCOME

    // State Fields Buat Kategori Baru Instan
    var newCategoryName by remember { mutableStateOf("") }

    // State Fields AI Input
    var aiInputText by remember { mutableStateOf("") }
    var isAiParsing by remember { mutableStateOf(false) }

    val formatIDR = { amount: Double ->
        val format = NumberFormat.getCurrencyInstance(Locale("in", "ID"))
        format.maximumFractionDigits = 0
        format.format(amount).replace("Rp", "Rp ")
    }

    // 🔥 1. SYNC DEPENDENCIES & TRANSAKSI DARI FIRESTORE
    val fetchAllData = {
        if (!uid.isNullOrEmpty()) {
            coroutineScope.launch {
                try {
                    isLoading = true
                    errorMessage = null

                    // A. Ambil Dompet
                    val wSnap = db.collection("wallets").whereEqualTo("userId", uid).get().await()
                    walletsList = wSnap.documents.map { TxWallet(it.id, it.getString("name") ?: "", it.getDouble("balance") ?: 0.0) }

                    // B. Ambil Kategori
                    val cSnap = db.collection("categories").whereEqualTo("userId", uid).get().await()
                    categoriesList = cSnap.documents.map { TxCategory(it.id, it.getString("name") ?: "", it.getString("type") ?: "EXPENSE") }

                    // C. Ambil Transaksi
                    val tSnap = db.collection("transactions")
                        .whereEqualTo("userId", uid)
                        .orderBy("date", Query.Direction.DESCENDING)
                        .get().await()

                    transactionsList = tSnap.documents.map { doc ->
                        val catMap = doc.get("category") as? Map<*, *>
                        val walMap = doc.get("wallet") as? Map<*, *>
                        TxTransaction(
                            id = doc.id,
                            amount = doc.getDouble("amount") ?: 0.0,
                            note = doc.getString("note") ?: "",
                            date = doc.getString("date") ?: "",
                            walletId = doc.getString("walletId") ?: "",
                            walletName = walMap?.get("name") as? String ?: "",
                            categoryId = doc.getString("categoryId") ?: "",
                            categoryName = catMap?.get("name") as? String ?: "",
                            categoryType = catMap?.get("type") as? String ?: "EXPENSE"
                        )
                    }
                } catch (e: Exception) {
                    errorMessage = "Gagal memuat mutasi transaksi: ${e.localizedMessage}"
                    Log.e("FirestoreTx", "Error sync", e)
                } finally {
                    isLoading = false
                }
            }
        }
    }

    LaunchedEffect(uid) { fetchAllData() }

    // 🔥 2. LOGIKA PROSES PARSING BAHASA NATURAL DENGAN AI GEMINI
    val handleAiParseSubmit: () -> Unit = {
        coroutineScope.launch {
            if (aiInputText.trim().isEmpty()) return@launch
            isAiParsing = true
            try {
                // Konversi daftar dompet & kategori saat ini ke JSON String untuk dikirim ke prompt
                val walletsJson = JSONArray()
                walletsList.forEach { w -> walletsJson.put(JSONObject().put("id", w.id).put("name", w.name)) }

                val categoriesJson = JSONArray()
                categoriesList.forEach { c -> categoriesJson.put(JSONObject().put("id", c.id).put("name", c.name).put("type", c.type)) }

                val prompt = """
                    Bertindaklah sebagai pemroses data keuangan. Analisis teks berikut dan ekstrak menjadi format JSON murni.
                    Teks masukan: "${aiInputText.trim()}"
                    Daftar Dompet yang Valid: $walletsJson
                    Daftar Kategori yang Valid: $categoriesJson
                    Aturan ekstraksi:
                    1. "amount": Cari nominal angka mutasi.
                    2. "note": Ringkasan catatan (maksimal 5 kata).
                    3. "walletId": Cocokkan dengan id dari Daftar Dompet yang paling relevan. Jika tidak tahu, kosongkan "".
                    4. "categoryId": Cocokkan dengan id dari Daftar Kategori yang paling relevan. Jika tidak tahu, kosongkan "".
                    HANYA KEMBALIKAN OUTPUT BERUPA JSON MURNI TANPA MARKDOWN ATAU TEKS LAINNYA.
                    Format wajib: {"amount": angka, "note": "string", "walletId": "string", "categoryId": "string"}
                """.trimIndent()

                val extractedJson = withContext(Dispatchers.IO) {
                    val client = OkHttpClient()
                    val mediaType = "application/json; charset=utf-8".toMediaType()
                    val apiKey = BuildConfig.GEMINI_API_KEY
                    val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"

                    val safePrompt = prompt.replace("\"", "\\\"").replace("\n", " ")
                    val jsonBody = """{"contents": [{"parts": [{"text": "$safePrompt"}]}]}"""

                    val request = Request.Builder().url(url).post(jsonBody.toRequestBody(mediaType)).build()
                    val response = client.newCall(request).execute()

                    if (response.isSuccessful) {
                        val body = response.body?.string() ?: ""
                        val cleanText = JSONObject(body).getJSONArray("candidates")
                            .getJSONObject(0).getJSONObject("content")
                            .getJSONArray("parts").getJSONObject(0).getString("text")

                        cleanText.replace("```json", "").replace("```", "").trim()
                    } else {
                        throw Exception("Gagal menghubungi Google AI")
                    }
                }

                // Masukkan hasil tebakan AI ke form manual
                val resObj = JSONObject(extractedJson)
                val parsedAmount = resObj.optDouble("amount", 0.0)
                formAmount = if (parsedAmount > 0) parsedAmount.toLong().toString() else ""
                formNote = resObj.optString("note", aiInputText)
                selectedWalletId = resObj.optString("walletId", "")
                selectedCategoryId = resObj.optString("categoryId", "")

                val matchedCatType = categoriesList.find { it.id == selectedCategoryId }?.type ?: "EXPENSE"
                formCategoryType = matchedCatType

                // Tutup modal AI, buka modal manual untuk konfirmasi user
                isAiDialogOpen = false
                aiInputText = ""
                isManualDialogOpen = true

            } catch (e: Exception) {
                errorMessage = "AI gagal membaca teks otomatis. Silakan gunakan pencatatan manual."
            } finally {
                isAiParsing = false
            }
        }
    }

    // 🔥 3. SIMPAN TRANSAKSI (BATCH WRITE)
    val handleSaveTransaction: () -> Unit = {
        coroutineScope.launch {
            val amountVal = formAmount.toDoubleOrNull() ?: 0.0
            val wallet = walletsList.find { it.id == selectedWalletId }
            val category = categoriesList.find { it.id == selectedCategoryId }

            if (amountVal <= 0 || wallet == null || category == null) return@launch
            isSubmitting = true

            try {
                val batch = db.batch()
                val isoTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())

                // A. Buat Dokumen Transaksi Baru
                val txRef = db.collection("transactions").document()
                val txData = hashMapOf(
                    "userId" to uid,
                    "amount" to amountVal,
                    "note" to formNote.trim(),
                    "date" to formDate,
                    "walletId" to wallet.id,
                    "wallet" to mapOf("name" to wallet.name),
                    "categoryId" to category.id,
                    "category" to mapOf("name" to category.name, "type" to category.type),
                    "createdAt" to isoTime,
                    "updatedAt" to isoTime
                )
                batch.set(txRef, txData)

                // B. Sesuaikan Saldo Dompet
                val walletRef = db.collection("wallets").document(wallet.id)
                val newBalance = if (category.type == "INCOME") wallet.balance + amountVal else wallet.balance - amountVal
                batch.update(walletRef, mapOf("balance" to newBalance, "updatedAt" to isoTime))

                batch.commit().await()

                // Reset Form
                isManualDialogOpen = false
                formAmount = ""; formNote = ""; selectedWalletId = ""; selectedCategoryId = ""
                fetchAllData()
            } catch (e: Exception) {
                errorMessage = "Gagal menyimpan transaksi."
            } finally {
                isSubmitting = false
            }
        }
    }

    // 🔥 4. HAPUS TRANSAKSI (BATCH WRITE)
    val handleDeleteTransaction: (TxTransaction) -> Unit = { trx ->
        coroutineScope.launch {
            isSubmitting = true
            try {
                val batch = db.batch()
                val wallet = walletsList.find { it.id == trx.walletId }

                // Hapus Dokumen
                batch.delete(db.collection("transactions").document(trx.id))

                // Balikkan Saldo Dompet
                if (wallet != null) {
                    val walletRef = db.collection("wallets").document(wallet.id)
                    val reversedBalance = if (trx.categoryType == "INCOME") wallet.balance - trx.amount else wallet.balance + trx.amount
                    batch.update(walletRef, "balance", reversedBalance)
                }

                batch.commit().await()
                transactionToDelete = null
                fetchAllData()
            } catch (e: Exception) {
                errorMessage = "Gagal menghapus catatan."
            } finally {
                isSubmitting = false
            }
        }
    }

    // Filter list lokal berdasarkan pilihan filter tab
    val filteredTx = when (currentFilter) {
        "INCOME" -> transactionsList.filter { it.categoryType == "INCOME" }
        "EXPENSE" -> transactionsList.filter { it.categoryType == "EXPENSE" }
        else -> transactionsList
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
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            // HEADER & TOMBOL AKSI
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(text = "Riwayat Arus Kas", style = Typography.labelMedium, color = Slate400)
                        Text(text = "Transaksi", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // AI Input Button
                        IconButton(
                            onClick = { isAiDialogOpen = true },
                            modifier = Modifier.background(if (isDarkMode) Slate800 else Slate200, RoundedCornerShape(8.dp))
                        ) { Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Blue600) }

                        // Manual Input Button
                        Button(
                            onClick = { isManualDialogOpen = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Manual", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // HORIZONTAL CHIPS FILTER BAR
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    val filters = listOf("ALL" to "Semua", "INCOME" to "Pemasukan", "EXPENSE" to "Pengeluaran")
                    items(filters) { (key, label) ->
                        val isSelected = currentFilter == key
                        FilterChip(
                            selected = isSelected,
                            onClick = { currentFilter = key },
                            label = { Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = if (isDarkMode) Slate50 else Slate900,
                                selectedLabelColor = if (isDarkMode) Slate900 else Slate50,
                                containerColor = MaterialTheme.colorScheme.surface,
                                labelColor = Slate400
                            ),
                            border = BorderStroke(1.dp, if (isSelected) Color.Transparent else if (isDarkMode) Slate800 else Slate200)
                        )
                    }
                }
            }

            if (errorMessage != null) {
                item { Text(text = errorMessage!!, color = Red600, fontSize = 13.sp) }
            }

            if (filteredTx.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 64.dp), contentAlignment = Alignment.Center) {
                        Text(text = "Belum ada catatan mutasi kas.", color = Slate400, style = Typography.bodyLarge)
                    }
                }
            }

            // RENDERING LIST TRANSAKSI
            items(filteredTx) { trx ->
                val isIncome = trx.categoryType == "INCOME"
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // BARIS ATAS: Kategori & (Nominal + Tombol Hapus)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(shape = RoundedCornerShape(4.dp), color = Slate200.copy(alpha = 0.5f)) {
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)) {
                                    Icon(
                                        imageVector = if (isIncome) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                                        contentDescription = null,
                                        tint = if (isIncome) Green600 else Red600,
                                        modifier = Modifier.size(12.dp).padding(end = 4.dp)
                                    )
                                    Text(text = trx.categoryName, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Slate800)
                                }
                            }

                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "${if (isIncome) "+" else "-"}${formatIDR(trx.amount)}",
                                    fontWeight = FontWeight.Bold,
                                    color = if (isIncome) Green600 else MaterialTheme.colorScheme.onBackground,
                                    fontSize = 15.sp
                                )
                                IconButton(
                                    onClick = { transactionToDelete = trx },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Slate400, modifier = Modifier.size(16.dp))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // BARIS TENGAH: Catatan
                        Text(
                            text = trx.note.ifEmpty { "Tanpa catatan" },
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // BARIS BAWAH: Dompet & Tanggal
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Wallet, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(trx.walletName, fontSize = 12.sp, color = Slate500)
                            }
                            Text(trx.date, fontSize = 12.sp, color = Slate500)
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(32.dp)) }
        }
    }

    // --- DIALOG A: AI INPUT PARSER ---
    if (isAiDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isAiParsing) isAiDialogOpen = false },
            title = { Text("Pencatatan Cerdas AI", style = Typography.displayLarge, fontSize = 18.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Ketik transaksi Anda dengan bahasa santai sehari-hari. Modul AI Gemini akan mengekstrak data tersebut.", fontSize = 12.sp, color = Slate400)
                    OutlinedTextField(
                        value = aiInputText, onValueChange = { aiInputText = it },
                        placeholder = { Text("Contoh: Makan siang sate kambing 45 ribu pakai kas tunai") },
                        modifier = Modifier.fillMaxWidth().height(100.dp), enabled = !isAiParsing
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600), enabled = aiInputText.isNotBlank() && !isAiParsing,
                    onClick = handleAiParseSubmit
                ) {
                    if (isAiParsing) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    else Text("Proses AI")
                }
            },
            dismissButton = { TextButton(onClick = { isAiDialogOpen = false }, enabled = !isAiParsing) { Text("Batal", color = Slate500) } }
        )
    }

    // --- DIALOG B: MANUAL FORM & REVIEW CONFIRMATION AI ---
    if (isManualDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) isManualDialogOpen = false },
            title = { Text("Detail Formulir Transaksi", style = Typography.displayLarge, fontSize = 18.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Selector Tipe (Pemasukan / Pengeluaran)
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { formCategoryType = "EXPENSE"; selectedCategoryId = "" },
                            modifier = Modifier.weight(1f), shape = RoundedCornerShape(8.dp, 0.dp, 0.dp, 8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (formCategoryType == "EXPENSE") Red600 else if (isDarkMode) Slate800 else Slate200)
                        ) { Text("Pengeluaran", color = if (formCategoryType == "EXPENSE") Color.White else Slate500) }
                        Button(
                            onClick = { formCategoryType = "INCOME"; selectedCategoryId = "" },
                            modifier = Modifier.weight(1f), shape = RoundedCornerShape(0.dp, 8.dp, 8.dp, 0.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (formCategoryType == "INCOME") Green600 else if (isDarkMode) Slate800 else Slate200)
                        ) { Text("Pemasukan", color = if (formCategoryType == "INCOME") Color.White else Slate500) }
                    }

                    // Input Nominal
                    OutlinedTextField(
                        value = formAmount, onValueChange = { formAmount = it.replace(Regex("\\D"), "") },
                        label = { Text("Nominal Angka (Rp)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !isSubmitting
                    )

                    // Dropdown Dompet Sumber
                    Text("Dompet Pembayaran:", style = Typography.labelMedium, color = Slate500)
                    var isWalletDropdownExpanded by remember { mutableStateOf(false) }
                    val currentWalletName = walletsList.find { it.id == selectedWalletId }?.name ?: "Pilih Dompet Akun"
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(onClick = { isWalletDropdownExpanded = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), enabled = !isSubmitting) {
                            Text(currentWalletName, color = MaterialTheme.colorScheme.onBackground)
                        }
                        DropdownMenu(expanded = isWalletDropdownExpanded, onDismissRequest = { isWalletDropdownExpanded = false }) {
                            walletsList.forEach { w ->
                                DropdownMenuItem(text = { Text("${w.name} (${formatIDR(w.balance)})") }, onClick = { selectedWalletId = w.id; isWalletDropdownExpanded = false })
                            }
                        }
                    }

                    // Dropdown Kategori Terfilter
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Kategori Mutasi:", style = Typography.labelMedium, color = Slate500)
                        TextButton(onClick = { isAddingNewCategoryForm = true }) { Text("+ Kategori Baru", fontSize = 11.sp, color = Blue600) }
                    }

                    if (isAddingNewCategoryForm) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = newCategoryName, onValueChange = { newCategoryName = it }, placeholder = { Text("Nama...") }, modifier = Modifier.weight(1f), singleLine = true)
                            Button(
                                colors = ButtonDefaults.buttonColors(containerColor = Green600),
                                onClick = {
                                    if (newCategoryName.isNotBlank()) {
                                        coroutineScope.launch {
                                            val isoTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
                                            val newCatData = hashMapOf("userId" to uid, "name" to newCategoryName.trim(), "type" to formCategoryType, "isActive" to true, "createdAt" to isoTime)
                                            val addedDoc = db.collection("categories").add(newCatData).await()
                                            categoriesList = categoriesList + TxCategory(addedDoc.id, newCategoryName.trim(), formCategoryType)
                                            selectedCategoryId = addedDoc.id
                                            newCategoryName = ""
                                            isAddingNewCategoryForm = false
                                        }
                                    }
                                }
                            ) { Text("✔") }
                            IconButton(onClick = { isAddingNewCategoryForm = false }) { Icon(Icons.Default.Add, null) }
                        }
                    } else {
                        var isCatDropdownExpanded by remember { mutableStateOf(false) }
                        val terfilterCategories = categoriesList.filter { it.type == formCategoryType }
                        val currentCatName = terfilterCategories.find { it.id == selectedCategoryId }?.name ?: "Pilih Kategori"
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedButton(onClick = { isCatDropdownExpanded = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp), enabled = !isSubmitting) {
                                Text(currentCatName, color = MaterialTheme.colorScheme.onBackground)
                            }
                            DropdownMenu(expanded = isCatDropdownExpanded, onDismissRequest = { isCatDropdownExpanded = false }) {
                                terfilterCategories.forEach { c ->
                                    DropdownMenuItem(text = { Text(c.name) }, onClick = { selectedCategoryId = c.id; isCatDropdownExpanded = false })
                                }
                            }
                        }
                    }

                    // Input Catatan & Tanggal
                    OutlinedTextField(value = formNote, onValueChange = { formNote = it }, label = { Text("Catatan Deskripsi (Opsional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !isSubmitting)
                    OutlinedTextField(value = formDate, onValueChange = { formDate = it }, label = { Text("Tanggal Transaksi (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !isSubmitting)
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                    enabled = formAmount.isNotBlank() && selectedWalletId.isNotBlank() && selectedCategoryId.isNotBlank() && !isSubmitting,
                    onClick = handleSaveTransaction
                ) {
                    if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    else Text("Simpan")
                }
            },
            dismissButton = { TextButton(onClick = { isManualDialogOpen = false }, enabled = !isSubmitting) { Text("Batal", color = Slate500) } }
        )
    }

    // --- DIALOG C: HAPUS TRANSAKSI ---
    transactionToDelete?.let { trx ->
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) transactionToDelete = null },
            title = { Text("Hapus Catatan Keuangan", style = Typography.displayLarge, fontSize = 18.sp) },
            text = { Text("Yakin ingin menghapus transaksi '${trx.categoryName}' sebesar ${formatIDR(trx.amount)}? Saldo akun dompet Anda akan disesuaikan kembali secara otomatis di database.") },
            confirmButton = { Button(colors = ButtonDefaults.buttonColors(containerColor = Red600), enabled = !isSubmitting, onClick = { handleDeleteTransaction(trx) }) { Text("Hapus") } },
            dismissButton = { TextButton(onClick = { transactionToDelete = null }, enabled = !isSubmitting) { Text("Batal", color = Slate500) } }
        )
    }
}
package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
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
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.models.*
import com.kevin.monvin.finance.network.ApiClient
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(sessionManager: SessionManager, navController: NavController, isDarkMode: Boolean) {
    val token by sessionManager.userToken.collectAsState(initial = null)
    val coroutineScope = rememberCoroutineScope()

    // Data States
    var transactions by remember { mutableStateOf<List<TransactionItem>>(emptyList()) }
    var wallets by remember { mutableStateOf<List<WalletItem>>(emptyList()) }
    var categories by remember { mutableStateOf<List<CategoryItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Dialog States
    var isManualDialogOpen by remember { mutableStateOf(false) }
    var isAiDialogOpen by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }

    // Form Manual States
    var amountInput by remember { mutableStateOf("") }
    var noteInput by remember { mutableStateOf("") }
    var selectedWalletId by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf("") }
    var newCategoryName by remember { mutableStateOf("") }
    var newCategoryType by remember { mutableStateOf("EXPENSE") }

    // Form AI States
    var aiTextInput by remember { mutableStateOf("") }

    val borderColor = if (isDarkMode) Slate800 else Slate200
    val chipBgColor = if (isDarkMode) Slate900 else Slate50

    // Helpers
    val formatIDR = { amount: Double ->
        val format = NumberFormat.getCurrencyInstance(Locale("in", "ID"))
        format.maximumFractionDigits = 0
        format.format(amount).replace("Rp", "Rp ")
    }

    val formatIDRInput = { raw: String ->
        val cleanStr = raw.replace(Regex("\\D"), "")
        if (cleanStr.isNotEmpty()) {
            val parsed = cleanStr.toDoubleOrNull() ?: 0.0
            NumberFormat.getNumberInstance(Locale("in", "ID")).format(parsed)
        } else ""
    }

    val fetchDependencies = {
        if (!token.isNullOrEmpty()) {
            coroutineScope.launch {
                try {
                    isLoading = true
                    val trxRes = ApiClient.instance.getTransactions("Bearer $token")
                    val walRes = ApiClient.instance.getWallets("Bearer $token")
                    val catRes = ApiClient.instance.getCategories("Bearer $token")

                    if (trxRes.isSuccessful) transactions = trxRes.body()?.data ?: emptyList()
                    if (walRes.isSuccessful) wallets = walRes.body()?.data ?: emptyList()
                    if (catRes.isSuccessful) categories = catRes.body()?.data ?: emptyList()
                } catch (e: Exception) {
                    // Tangani error
                } finally {
                    isLoading = false
                }
            }
        }
    }

    LaunchedEffect(token) { fetchDependencies() }

    Scaffold(
        bottomBar = { BottomNavigationBar(navController) },
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            Column(horizontalAlignment = Alignment.End) {
                FloatingActionButton(
                    onClick = { isAiDialogOpen = true },
                    containerColor = if (isDarkMode) Slate50 else Slate900,
                    contentColor = if (isDarkMode) Slate900 else Slate50,
                    modifier = Modifier.padding(bottom = 8.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = "AI")
                }
                FloatingActionButton(
                    onClick = {
                        amountInput = ""; noteInput = ""; selectedWalletId = ""; selectedCategoryId = ""; newCategoryName = ""
                        isManualDialogOpen = true
                    },
                    containerColor = Blue600,
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Manual")
                }
            }
        }
    ) { innerPadding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Blue600)
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            item {
                Column(modifier = Modifier.padding(bottom = 8.dp)) {
                    Text(text = "Riwayat Arus Kas", style = Typography.labelMedium, color = Slate400)
                    Text(text = "Transaksi Saya", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)
                }
            }

            if (transactions.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 64.dp), contentAlignment = Alignment.Center) {
                        Text(text = "Belum ada transaksi.", color = Slate400, style = Typography.bodyLarge)
                    }
                }
            }

            items(transactions) { trx ->
                val isIncome = trx.category.type == "INCOME"
                Card(
                    modifier = Modifier.fillMaxWidth(),
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
                            Text(text = "${if(isIncome) "+" else "-"}${formatIDR(trx.amount)}", fontWeight = FontWeight.Bold, color = if (isIncome) Green600 else MaterialTheme.colorScheme.onBackground)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = trx.note ?: "-", style = Typography.bodyLarge, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Wallet, contentDescription = null, tint = Slate400, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(text = trx.wallet.name, fontSize = 12.sp, color = Slate500)
                        }
                    }
                }
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }

    // --- DIALOG: AI GEMINI PARSER ---
    if (isAiDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) isAiDialogOpen = false },
            title = { Text("Asisten AI Gemini", style = Typography.displayLarge, fontSize = 20.sp) },
            text = {
                OutlinedTextField(
                    value = aiTextInput,
                    onValueChange = { aiTextInput = it },
                    label = { Text("Ketik catatan bebas") },
                    placeholder = { Text("Makan sate 25rb pakai bca") },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    enabled = !isSubmitting
                )
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                    enabled = aiTextInput.isNotBlank() && !isSubmitting,
                    onClick = {
                        coroutineScope.launch {
                            isSubmitting = true
                            try {
                                val res = ApiClient.instance.parseTransactionAi("Bearer $token", AiParseRequest(aiTextInput))
                                if (res.isSuccessful && res.body()?.success == true) {
                                    val suggestion = res.body()?.suggestion
                                    amountInput = formatIDRInput((suggestion?.amount ?: 0.0).toString())
                                    noteInput = suggestion?.note ?: aiTextInput
                                    selectedWalletId = suggestion?.walletId ?: ""
                                    selectedCategoryId = suggestion?.categoryId ?: ""

                                    isAiDialogOpen = false
                                    isManualDialogOpen = true
                                    aiTextInput = ""
                                }
                            } catch (e: Exception) {} finally { isSubmitting = false }
                        }
                    }
                ) {
                    if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    else Text("Strukturkan")
                }
            },
            dismissButton = {
                TextButton(onClick = { isAiDialogOpen = false }, enabled = !isSubmitting) { Text("Batal", color = Slate500) }
            }
        )
    }

    // --- DIALOG: FORM MANUAL / HASIL REVIEW AI ---
    if (isManualDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) isManualDialogOpen = false },
            title = { Text("Rekam Transaksi", style = Typography.displayLarge, fontSize = 20.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    // Input Nominal Rupiah
                    OutlinedTextField(
                        value = amountInput,
                        onValueChange = { amountInput = formatIDRInput(it) },
                        label = { Text("Nominal Transaksi (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isSubmitting
                    )

                    // Catatan
                    OutlinedTextField(
                        value = noteInput,
                        onValueChange = { noteInput = it },
                        label = { Text("Catatan") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isSubmitting
                    )

                    // 🔥 UI BARU: PILIHAN DOMPET DENGAN HORIZONTAL SCROLL CHIPS
                    Column {
                        Text("PILIH DOMPET", style = Typography.labelMedium, color = Slate500)
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            items(wallets) { w ->
                                val isSelected = selectedWalletId == w.id
                                Surface(
                                    onClick = { selectedWalletId = w.id },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) Blue600 else chipBgColor,
                                    border = BorderStroke(1.dp, if (isSelected) Blue600 else borderColor)
                                ) {
                                    Text(
                                        text = w.name,
                                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                        fontSize = 13.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) Color.White else MaterialTheme.colorScheme.onBackground
                                    )
                                }
                            }
                        }
                    }

                    // 🔥 UI BARU: PILIHAN KATEGORI DENGAN HORIZONTAL SCROLL CHIPS
                    Column {
                        Text("KATEGORI", style = Typography.labelMedium, color = Slate500)
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            items(categories) { c ->
                                val isSelected = selectedCategoryId == c.id
                                val isIncome = c.type == "INCOME"
                                Surface(
                                    onClick = { selectedCategoryId = c.id },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) Blue600 else chipBgColor,
                                    border = BorderStroke(1.dp, if (isSelected) Blue600 else borderColor)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                                    ) {
                                        Icon(
                                            imageVector = if (isIncome) Icons.Default.TrendingUp else Icons.Default.TrendingDown,
                                            contentDescription = null,
                                            tint = if (isSelected) Color.White else if (isIncome) Green600 else Red600,
                                            modifier = Modifier.size(14.dp).padding(end = 4.dp)
                                        )
                                        Text(
                                            text = c.name,
                                            fontSize = 13.sp,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                            color = if (isSelected) Color.White else MaterialTheme.colorScheme.onBackground
                                        )
                                    }
                                }
                            }
                            // Opsi Kategori Baru
                            item {
                                val isSelected = selectedCategoryId == "NEW"
                                Surface(
                                    onClick = { selectedCategoryId = "NEW" },
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) Blue600 else chipBgColor,
                                    border = BorderStroke(1.dp, if (isSelected) Blue600 else borderColor)
                                ) {
                                    Text(
                                        text = "+ Buat Baru",
                                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSelected) Color.White else Blue600
                                    )
                                }
                            }
                        }
                    }

                    // Dinamis Input Kategori Baru
                    if (selectedCategoryId == "NEW") {
                        Card(colors = CardDefaults.cardColors(containerColor = chipBgColor), border = BorderStroke(1.dp, borderColor)) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                OutlinedTextField(
                                    value = newCategoryName,
                                    onValueChange = { newCategoryName = it },
                                    label = { Text("Nama Kategori Baru", fontSize = 12.sp) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        RadioButton(selected = newCategoryType == "EXPENSE", onClick = { newCategoryType = "EXPENSE" })
                                        Text("Pengeluaran", fontSize = 13.sp, color = MaterialTheme.colorScheme.onBackground)
                                    }
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        RadioButton(selected = newCategoryType == "INCOME", onClick = { newCategoryType = "INCOME" })
                                        Text("Pemasukan", fontSize = 13.sp, color = MaterialTheme.colorScheme.onBackground)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                    enabled = amountInput.isNotBlank() && selectedWalletId.isNotBlank() && selectedCategoryId.isNotBlank() && !isSubmitting,
                    onClick = {
                        coroutineScope.launch {
                            isSubmitting = true
                            try {
                                val rawAmount = amountInput.replace(Regex("\\D"), "").toDoubleOrNull() ?: 0.0
                                val todayDate = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                                var finalCatId = selectedCategoryId

                                // Logika Kategori Baru (On-The-Fly)
                                if (finalCatId == "NEW" && newCategoryName.isNotBlank()) {
                                    val catRes = ApiClient.instance.createCategory("Bearer $token", CreateCategoryRequest(newCategoryName, newCategoryType))
                                    if (catRes.isSuccessful) {
                                        finalCatId = catRes.body()?.category?.id ?: ""
                                    }
                                }

                                val payload = CreateTransactionRequest(rawAmount, noteInput, todayDate, selectedWalletId, finalCatId)
                                val response = ApiClient.instance.createTransaction("Bearer $token", payload)

                                if (response.isSuccessful) {
                                    isManualDialogOpen = false
                                    fetchDependencies() // Refresh tabel
                                }
                            } catch (e: Exception) {
                                // Gagal
                            } finally {
                                isSubmitting = false
                            }
                        }
                    }
                ) {
                    if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    else Text("Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { isManualDialogOpen = false }, enabled = !isSubmitting) { Text("Batal", color = Slate500) }
            }
        )
    }
}
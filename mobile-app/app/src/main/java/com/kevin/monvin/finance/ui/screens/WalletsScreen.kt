package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CreditCard
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
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Data model lokal agar mandiri dari struktur Retrofit lama
data class WalletData(val id: String, val name: String, val type: String, val balance: Double)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WalletsScreen(sessionManager: SessionManager, navController: NavController) {
    val uid by sessionManager.userToken.collectAsState(initial = null) // Token adalah UID Firebase
    val coroutineScope = rememberCoroutineScope()

    // State Data
    var walletList by remember { mutableStateOf<List<WalletData>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // State Dialog Form Tambah Dompet
    var isDialogOpen by remember { mutableStateOf(false) }
    var walletName by remember { mutableStateOf("") }
    var walletType by remember { mutableStateOf("CASH") } // CASH atau BANK
    var initialBalance by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    val formatIDR = { amount: Double ->
        val format = NumberFormat.getCurrencyInstance(Locale("in", "ID"))
        format.maximumFractionDigits = 0
        format.format(amount).replace("Rp", "Rp ")
    }

    // Fungsi fetch data dari Firestore
    val fetchWallets = {
        if (!uid.isNullOrEmpty()) {
            coroutineScope.launch {
                try {
                    isLoading = true
                    errorMessage = null

                    val db = FirebaseFirestore.getInstance()
                    val snapshot = db.collection("wallets")
                        .whereEqualTo("userId", uid)
                        .get()
                        .await()

                    val list = snapshot.documents.map { doc ->
                        WalletData(
                            id = doc.id,
                            name = doc.getString("name") ?: "",
                            type = doc.getString("type") ?: "CASH",
                            balance = doc.getDouble("balance") ?: 0.0
                        )
                    }

                    // Urutkan berdasarkan abjad nama
                    walletList = list.sortedBy { it.name }
                } catch (e: Exception) {
                    errorMessage = "Gagal mengambil data rekening: ${e.localizedMessage}"
                } finally {
                    isLoading = false
                }
            }
        }
    }

    // Trigger pengambilan data otomatis
    LaunchedEffect(uid) {
        fetchWallets()
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            // BARIS HEADER & TOMBOL TAMBAH
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "Ekosistem Kas", style = Typography.labelMedium, color = Slate400)
                        Text(text = "Dompet Saya", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)
                    }
                    Button(
                        onClick = { isDialogOpen = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Tambah", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            if (errorMessage != null) {
                item { Text(text = errorMessage!!, color = Red600, fontSize = 14.sp) }
            }

            // KONDISI JIKA KOSONG
            if (walletList.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 64.dp), contentAlignment = Alignment.Center) {
                        Text(text = "Belum ada dompet terdaftar.", color = Slate400, style = Typography.bodyLarge)
                    }
                }
            }

            // LIST RENDER KARTU DOMPET
            items(walletList) { wallet ->
                val isBank = wallet.type == "BANK"
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(
                                        if (isBank) Blue600.copy(alpha = 0.1f) else Green600.copy(alpha = 0.1f),
                                        RoundedCornerShape(10.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isBank) Icons.Default.CreditCard else Icons.Default.Wallet,
                                    contentDescription = null,
                                    tint = if (isBank) Blue600 else Green600
                                )
                            }
                            Text(
                                text = wallet.type,
                                style = Typography.labelMedium,
                                color = Slate400,
                                fontSize = 10.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(text = wallet.name, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onBackground)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = formatIDR(wallet.balance),
                            style = Typography.displayLarge,
                            fontSize = 22.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(32.dp)) }
        }
    }

    // --- POPUP DIALOG FORM TAMBAH DOMPET BARU ---
    if (isDialogOpen) {
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) isDialogOpen = false },
            title = { Text("Tambah Dompet Baru", style = Typography.displayLarge, fontSize = 20.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Input Nama
                    OutlinedTextField(
                        value = walletName,
                        onValueChange = { walletName = it },
                        label = { Text("Nama Dompet (Misal: BCA, Tunai)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isSubmitting
                    )

                    // Pilihan Tipe
                    Text("Tipe Penyimpanan:", style = Typography.labelMedium, color = Slate500)
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = walletType == "CASH", onClick = { walletType = "CASH" }, enabled = !isSubmitting)
                            Text("Tunai", fontSize = 14.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = walletType == "BANK", onClick = { walletType = "BANK" }, enabled = !isSubmitting)
                            Text("Bank / E-Wallet", fontSize = 14.sp)
                        }
                    }

                    // Input Saldo Awal
                    OutlinedTextField(
                        value = initialBalance,
                        onValueChange = { initialBalance = it.replace(Regex("\\D"), "") }, // Bersihkan input otomatis hanya angka
                        label = { Text("Saldo Awal (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        enabled = !isSubmitting
                    )
                }
            },
            confirmButton = {
                Button(
                    colors = ButtonDefaults.buttonColors(containerColor = Blue600),
                    enabled = walletName.isNotBlank() && initialBalance.isNotBlank() && !isSubmitting,
                    onClick = {
                        coroutineScope.launch {
                            isSubmitting = true
                            try {
                                val db = FirebaseFirestore.getInstance()
                                val isoTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())
                                val balanceVal = initialBalance.toDoubleOrNull() ?: 0.0

                                val newWalletData = hashMapOf(
                                    "userId" to uid,
                                    "name" to walletName.trim(),
                                    "type" to walletType,
                                    "balance" to balanceVal,
                                    "createdAt" to isoTime,
                                    "updatedAt" to isoTime
                                )

                                db.collection("wallets").add(newWalletData).await()

                                // Reset state dialog dan tutup popup
                                isDialogOpen = false
                                walletName = ""
                                walletType = "CASH"
                                initialBalance = ""

                                // Refresh list
                                fetchWallets()
                            } catch (e: Exception) {
                                errorMessage = "Gagal membuat dompet baru."
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
                TextButton(onClick = { isDialogOpen = false }, enabled = !isSubmitting) {
                    Text("Batal", color = Slate500)
                }
            }
        )
    }
}
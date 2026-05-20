package com.kevin.monvin.finance.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    sessionManager: SessionManager,
    navController: NavController,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit
) {
    val uid by sessionManager.userToken.collectAsState(initial = null)
    val coroutineScope = rememberCoroutineScope()
    val db = FirebaseFirestore.getInstance()

    // State Fields Informasi Profil
    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var birthDate by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var field by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }

    // State Kontrol UI
    var isEditing by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var isSubmitting by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Fungsi Pembantu Hitung Umur Real-time
    val calculateAge = { dobStr: String ->
        if (dobStr.isBlank()) "-"
        else {
            try {
                val dob = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(dobStr)
                val calDOB = Calendar.getInstance().apply { time = dob!! }
                val today = Calendar.getInstance()
                var age = today.get(Calendar.YEAR) - calDOB.get(Calendar.YEAR)
                if (today.get(Calendar.DAY_OF_YEAR) < calDOB.get(Calendar.DAY_OF_YEAR)) age--
                "$age thn"
            } catch (e: Exception) {
                "-"
            }
        }
    }

    val borderColor = if (isDarkMode) Slate800 else Slate200

    // 🔥 1. SYNC AMBIL DATA PROFIL PERMANEN DARI FIRESTORE
    LaunchedEffect(uid) {
        if (!uid.isNullOrEmpty()) {
            try {
                isLoading = true
                errorMessage = null

                val document = db.collection("users").document(uid!!).get().await()
                if (document.exists()) {
                    name = document.getString("name") ?: ""
                    username = document.getString("username") ?: ""
                    email = document.getString("email") ?: ""
                    birthDate = document.getString("birthDate") ?: ""
                    status = document.getString("status") ?: ""
                    field = document.getString("field") ?: ""
                    location = document.getString("location") ?: ""
                }
            } catch (e: Exception) {
                errorMessage = "Gagal memuat profil: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    // 🔥 2. LOGIKA SIMPAN PERUBAHAN KE DATABASE FIRESTORE
    val handleSaveProfile: () -> Unit = Button@{
        if (uid.isNullOrEmpty()) return@Button
        coroutineScope.launch {
            isSubmitting = true
            try {
                val isoTime = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()).format(Date())

                val updatedMap = hashMapOf(
                    "name" to name.trim(),
                    "username" to username.lowercase().trim(),
                    "birthDate" to birthDate.trim(),
                    "status" to status.trim(),
                    "field" to field.trim(),
                    "location" to location.trim(),
                    "updatedAt" to isoTime
                )

                // Simpan dengan aturan merge agar data token AI bulanan tidak hilang
                db.collection("users").document(uid!!)
                    .set(updatedMap, SetOptions.merge())
                    .await()

                // Sinkronisasikan nama baru ke DataStore lokal agar header dashboard langsung berubah
                sessionManager.saveSession(uid!!, name.trim())

                isEditing = false
                errorMessage = null
            } catch (e: Exception) {
                errorMessage = "Gagal menyimpan perubahan: ${e.localizedMessage}"
            } finally {
                isSubmitting = false
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

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // BARIS HEADER & KONTROL EDIT PROFIL
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Pengaturan Entitas", style = Typography.labelMedium, color = Slate400)
                    Text(text = "Profil Akun", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)
                }

                if (!isEditing) {
                    IconButton(
                        onClick = { isEditing = true },
                        modifier = Modifier.background(if (isDarkMode) Slate800 else Slate200, RoundedCornerShape(8.dp))
                    ) { Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Blue600) }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        IconButton(onClick = { isEditing = false; errorMessage = null }, enabled = !isSubmitting) {
                            Icon(Icons.Default.Cancel, contentDescription = "Batal", tint = Slate500)
                        }
                        IconButton(onClick = handleSaveProfile, enabled = name.isNotBlank() && username.isNotBlank() && !isSubmitting) {
                            if (isSubmitting) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Green600)
                            else Icon(Icons.Default.CheckCircle, contentDescription = "Simpan", tint = Green600)
                        }
                    }
                }
            }

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Red600, fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }

            // BLOK AVATAR RINGKASAN DATA ATAS
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(if (isDarkMode) Slate700 else Slate200),
                        contentAlignment = Alignment.Center
                    ) {
                        if (name.isNotEmpty()) {
                            Text(text = name.take(1).uppercase(), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        } else {
                            Icon(Icons.Default.Person, contentDescription = null, tint = Slate400)
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(text = name.ifEmpty { "Pengguna MonVin" }, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.onBackground)
                        Text(text = "@${username.ifEmpty { "username" }}", fontSize = 14.sp, color = Blue600, fontWeight = FontWeight.Medium)
                    }
                }
            }

            // KARTU FORM INPUT INPUT UTAMA
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

                    @Composable
                    fun ProfileField(label: String, value: String, placeholder: String = "", onValueChange: (String) -> Unit, isEnabled: Boolean = isEditing) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(text = label, style = Typography.labelMedium, color = Slate500)
                            Spacer(modifier = Modifier.height(4.dp))
                            OutlinedTextField(
                                value = value,
                                onValueChange = onValueChange,
                                placeholder = { Text(placeholder, color = Slate400, fontSize = 14.sp) },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                singleLine = true,
                                enabled = isEnabled,
                                colors = OutlinedTextFieldDefaults.colors(
                                    disabledBorderColor = borderColor,
                                    disabledTextColor = Slate400,
                                    focusedBorderColor = Slate500,
                                    unfocusedBorderColor = borderColor
                                )
                            )
                        }
                    }

                    ProfileField("ALAMAT EMAIL (READ-ONLY)", email, onValueChange = {}, isEnabled = false)
                    ProfileField("USERNAME PENGGUNA", username, onValueChange = { username = it })
                    ProfileField("NAMA LENGKAP", name, onValueChange = { name = it })

                    HorizontalDivider(color = borderColor, modifier = Modifier.padding(vertical = 4.dp))
                    Text(text = "DATA PERSONALISASI AI (OPSIONAL)", style = Typography.labelMedium, color = Blue600, fontWeight = FontWeight.Bold)

                    ProfileField(
                        label = "TANGGAL LAHIR (YYYY-MM-DD) ${if(birthDate.isNotEmpty()) " " + calculateAge(birthDate) else ""}",
                        value = birthDate, placeholder = "Contoh: 2004-02-02", onValueChange = { birthDate = it }
                    )
                    ProfileField("STATUS PROFESI", status, placeholder = "Contoh: Mahasiswa, Pekerja Freelance", onValueChange = { status = it })
                    ProfileField("BIDANG / JURUSAN KULIAH", field, placeholder = "Contoh: Teknik Informatika, Desain", onValueChange = { field = it })
                    ProfileField("DOMISILI KOTA", location, placeholder = "Contoh: Cimahi, Bandung", onValueChange = { location = it })
                }
            }

            // BLOK TOGGLE TEMA SISTEM VISUAL
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = "Tema Visual", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onBackground)
                        Text(text = "Sesuaikan antarmuka visual mata Anda.", fontSize = 11.sp, color = Slate400)
                    }
                    IconButton(
                        onClick = onToggleTheme,
                        modifier = Modifier.background(if (isDarkMode) Slate700 else Slate200, RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "Toggle Tema",
                            tint = if (isDarkMode) Amber400 else Slate800
                        )
                    }
                }
            }

            // BLOK TOMBOL OUTBOUND KELUAR AKUN
            Card(
                modifier = Modifier.fillMaxWidth().clickable { if (!isSubmitting) onLogout() },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Red600.copy(alpha = 0.1f))
            ) {
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(imageVector = Icons.Default.ExitToApp, contentDescription = null, tint = Red600, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(text = "Keluar dari Akun MonVin", style = Typography.bodyLarge, fontWeight = FontWeight.Bold, color = Red600)
                }
            }

            // WATERMARK VERSI
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(text = "MonVin Finance v1.0.0", style = Typography.labelMedium, color = Slate400, modifier = Modifier.padding(vertical = 16.dp))
            }
        }
    }
}
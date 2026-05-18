package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.models.LoginRequest
import com.kevin.monvin.finance.network.ApiClient
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    navController: NavController,
    sessionManager: SessionManager)
{
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    // State untuk mengontrol proses API
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    // Coroutine scope untuk menjalankan fungsi suspend Retrofit
    val coroutineScope = rememberCoroutineScope()

    val borderColor = if (isDarkMode) Slate800 else Slate200

    val token by sessionManager.userToken.collectAsState(initial = null)

    LaunchedEffect(token) {
        if (!token.isNullOrEmpty() && token!!.contains(".")) {
            navController.navigate("dashboard") {
                popUpTo("login") { inclusive = true }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
        // Tombol Toggle Tema
        Text(
            text = if (isDarkMode) "LIGHT MODE" else "DARK MODE",
            style = Typography.labelMedium,
            color = Slate400,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(24.dp)
                .clickable { onToggleTheme() }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "SISTEM OTENTIKASI",
                style = Typography.labelMedium,
                color = Blue600,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text(
                text = "Selamat Datang Kembali",
                style = Typography.displayLarge,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            // Area Pesan Error / Sukses
            if (errorMessage != null) {
                Text(
                    text = errorMessage!!,
                    color = Red600,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }
            if (successMessage != null) {
                Text(
                    text = successMessage!!,
                    color = Green600,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
            }

            // --- Form Email/Username ---
            Text(text = "EMAIL ATAU USERNAME", style = Typography.labelMedium, color = Slate500)
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedTextField(
                value = identifier,
                onValueChange = {
                    identifier = it
                    errorMessage = null // Hilangkan error saat user mulai mengetik ulang
                },
                placeholder = { Text("Masukkan kredensial Anda", color = Slate400, fontSize = 14.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onBackground,
                    unfocusedTextColor = MaterialTheme.colorScheme.onBackground,
                    focusedBorderColor = Slate500,
                    unfocusedBorderColor = borderColor,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    cursorColor = Blue600
                ),
                singleLine = true,
                enabled = !isLoading
            )

            Spacer(modifier = Modifier.height(16.dp))

            // --- Form Kata Sandi ---
            Text(text = "KATA SANDI", style = Typography.labelMedium, color = Slate500)
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedTextField(
                value = password,
                onValueChange = {
                    password = it
                    errorMessage = null
                },
                placeholder = { Text("••••••••", color = Slate400, fontSize = 14.sp) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                // 🔥 Ubah visual transformation secara dinamis
                visualTransformation = if (isPasswordVisible) androidx.compose.ui.text.input.VisualTransformation.None else PasswordVisualTransformation(),
                // 🔥 Tambahkan ikon mata di pojok kanan field
                trailingIcon = {
                    val image = if (isPasswordVisible) {
                        androidx.compose.material.icons.Icons.Filled.Visibility
                    } else {
                        androidx.compose.material.icons.Icons.Filled.VisibilityOff
                    }

                    IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                        Icon(
                            imageVector = image,
                            contentDescription = if (isPasswordVisible) "Sembunyikan sandi" else "Tampilkan sandi",
                            tint = Slate400
                        )
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onBackground,
                    unfocusedTextColor = MaterialTheme.colorScheme.onBackground,
                    focusedBorderColor = Slate500,
                    unfocusedBorderColor = borderColor,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    cursorColor = Blue600
                ),
                singleLine = true,
                enabled = !isLoading
            )

            Spacer(modifier = Modifier.height(32.dp))

            // --- Tombol Submit dengan Integrasi Retrofit ---
            Button(
                onClick = {
                    if (identifier.isBlank() || password.isBlank()) {
                        errorMessage = "Semua kolom wajib diisi."
                        return@Button
                    }

                    // Jalankan request ke background thread
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = null
                        successMessage = null

                        try {
                            val request = LoginRequest(identifier, password)
                            val response = ApiClient.instance.login(request)

                            if (response.isSuccessful && response.body()?.success == true) {
                                val user = response.body()?.user
                                val token = response.body()?.token

                                // Simpan token ke DataStore
                                if (token != null && user != null) {
                                    sessionManager.saveSession(token, user.name)
                                }

                                // Lempar ke halaman Dasbor dan hancurkan halaman Login agar tidak bisa di-back
                                navController.navigate("dashboard") {
                                    popUpTo("login") { inclusive = true }
                                }
                            } else {
                                errorMessage = "Kredensial tidak valid. Silakan coba lagi."
                            }
                        } catch (e: Exception) {
                            errorMessage = "Koneksi ke server gagal: ${e.localizedMessage}"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(8.dp),
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isDarkMode) Slate50 else Slate900,
                    contentColor = if (isDarkMode) Slate900 else Slate50,
                    disabledContainerColor = Slate500
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = if (isDarkMode) Slate900 else Slate50,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.5.dp
                    )
                } else {
                    Text(
                        text = "Masuk ke Dasbor",
                        fontWeight = FontWeight.Medium,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Teks Pindah ke Register
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                Text(text = "Belum memiliki entitas akun? ", color = Slate500, fontSize = 14.sp)
                Text(
                    text = "Daftar di sini.",
                    color = Blue600,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { navController.navigate("register") }
                )
            }
        }
    }
}
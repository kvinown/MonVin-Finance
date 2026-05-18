package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.kevin.monvin.finance.models.RegisterRequest
import com.kevin.monvin.finance.models.CheckUsernameRequest
import com.kevin.monvin.finance.network.ApiClient
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    navController: NavController
) {
    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    // State Validasi Username (POST)
    var isUsernameChecking by remember { mutableStateOf(false) }
    var usernameValidationMessage by remember { mutableStateOf<String?>(null) }
    var isUsernameValid by remember { mutableStateOf<Boolean?>(null) } // true = aman, false = terpakai

    // State Visibility Password
    var isPasswordVisible by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val borderColor = if (isDarkMode) Slate800 else Slate200

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

        // Tombol Kembali
        Text(
            text = "KEMBALI",
            style = Typography.labelMedium,
            color = Slate500,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(24.dp)
                .clickable { navController.popBackStack() }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Spacer(modifier = Modifier.height(48.dp))

            Text(
                text = "REGISTRASI AKUN BARU",
                style = Typography.labelMedium,
                color = Blue600,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Text(
                text = "Mulai Kelola Finansial",
                style = Typography.displayLarge,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Red600, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 16.dp))
            }
            if (successMessage != null) {
                Text(text = successMessage!!, color = Green600, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 16.dp))
            }

            // Helper Komponen InputField Dinamis
            @Composable
            fun InputField(
                label: String,
                value: String,
                onValueChange: (String) -> Unit,
                isPassword: Boolean = false,
                customTrailingIcon: @Composable (() -> Unit)? = null
            ) {
                Text(text = label, style = Typography.labelMedium, color = Slate500)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = value,
                    onValueChange = {
                        onValueChange(it)
                        errorMessage = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    visualTransformation = if (isPassword && isPasswordVisible) {
                        androidx.compose.ui.text.input.VisualTransformation.None
                    } else if (isPassword) {
                        PasswordVisualTransformation()
                    } else {
                        androidx.compose.ui.text.input.VisualTransformation.None
                    },
                    trailingIcon = customTrailingIcon ?: if (isPassword) {
                        {
                            val image = if (isPasswordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(imageVector = image, contentDescription = null, tint = Slate400)
                            }
                        }
                    } else null,
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
            }

            // 1. FIELD NAMA
            InputField("NAMA LENGKAP", name, { name = it })

            // 2. FIELD USERNAME + RETROFIT POST TRIGGER
            InputField(
                label = "USERNAME PENGGUNA",
                value = username,
                onValueChange = {
                    username = it.trim()
                    usernameValidationMessage = null
                    isUsernameValid = null
                },
                customTrailingIcon = {
                    TextButton(
                        enabled = username.isNotBlank() && !isUsernameChecking && !isLoading,
                        onClick = {
                            coroutineScope.launch {
                                isUsernameChecking = true
                                usernameValidationMessage = null
                                isUsernameValid = null
                                try {
                                    // Mengirim objek payload JSON via POST
                                    val requestBody = CheckUsernameRequest(username = username)
                                    val res = ApiClient.instance.checkUsername(requestBody)

                                    if (res.isSuccessful) {
                                        // Membaca ketersediaan berdasarkan response dari user.controller.ts
                                        // Perhatikan: Controller kamu mengembalikan 'message' langsung
                                        if (res.body()?.success == true && res.body()?.message?.contains("tersedia") == true) {
                                            isUsernameValid = true
                                            usernameValidationMessage = "Username tersedia."
                                        } else {
                                            isUsernameValid = false
                                            usernameValidationMessage = "Username sudah digunakan."
                                        }
                                    } else {
                                        isUsernameValid = false
                                        usernameValidationMessage = "Username tidak valid atau sudah digunakan."
                                    }
                                } catch (e: Exception) {
                                    usernameValidationMessage = "Gagal verifikasi koneksi jaringan."
                                    isUsernameValid = false
                                } finally {
                                    isUsernameChecking = false
                                }
                            }
                        }
                    ) {
                        if (isUsernameChecking) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Blue600)
                        } else {
                            Text("Cek", fontWeight = FontWeight.Bold, color = Blue600, fontSize = 12.sp)
                        }
                    }
                }
            )

            if (usernameValidationMessage != null) {
                Text(
                    text = usernameValidationMessage!!,
                    color = if (isUsernameValid == true) Green600 else Red600,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 12.dp)
                )
            }

            // 3. FIELD EMAIL (Sudah dibersihkan dari duplikasi)
            InputField("ALAMAT EMAIL", email, { email = it })

            // 4. FIELD PASSWORD
            InputField("KATA SANDI", password, { password = it }, isPassword = true)

            Spacer(modifier = Modifier.height(16.dp))

            // TOMBOL BUAT AKUN
            Button(
                onClick = {
                    if (name.isBlank() || username.isBlank() || email.isBlank() || password.isBlank()) {
                        errorMessage = "Semua kolom wajib diisi."
                        return@Button
                    }

                    if (isUsernameValid != true) {
                        errorMessage = "Silakan cek ketersediaan Username Anda terlebih dahulu."
                        return@Button
                    }

                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = null
                        try {
                            val request = RegisterRequest(name, username, email, password)
                            val response = ApiClient.instance.register(request)

                            if (response.isSuccessful && response.body()?.success == true) {
                                successMessage = "Akun berhasil dibuat! Silakan kembali dan login."
                                name = ""; username = ""; email = ""; password = ""
                                isUsernameValid = null
                                usernameValidationMessage = null
                            } else {
                                errorMessage = "Gagal mendaftar. Username/Email mungkin sudah terpakai."
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
                    contentColor = if (isDarkMode) Slate900 else Slate50
                )
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = if (isDarkMode) Slate900 else Slate50, modifier = Modifier.size(24.dp), strokeWidth = 2.5.dp)
                } else {
                    Text("Buat Akun MonVin", fontWeight = FontWeight.Medium, letterSpacing = 0.5.sp)
                }
            }
        }
    }
}
package com.kevin.monvin.finance.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.navigation.NavController
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.kevin.monvin.finance.R // PENTING: Sesuaikan dengan package name kamu
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    navController: NavController,
    sessionManager: SessionManager
) {
    val context = LocalContext.current
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()
    val borderColor = if (isDarkMode) Slate800 else Slate200
    val token by sessionManager.userToken.collectAsState(initial = null)

    LaunchedEffect(token) {
        if (!token.isNullOrEmpty()) {
            navController.navigate("dashboard") {
                popUpTo("login") { inclusive = true }
            }
        }
    }

    // FUNGSI GOOGLE SIGN-IN CREDENTIAL MANAGER
    val handleGoogleSignIn: () -> Unit = {
        coroutineScope.launch {
            isLoading = true
            errorMessage = null

            try {
                val credentialManager = CredentialManager.create(context)
                val webClientId = context.getString(R.string.default_web_client_id)

                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(webClientId)
                    .setAutoSelectEnabled(true)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(context, request)
                val credential = result.credential

                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val firebaseCredential = GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)

                    val auth = FirebaseAuth.getInstance()
                    val db = FirebaseFirestore.getInstance()

                    auth.signInWithCredential(firebaseCredential)
                        .addOnSuccessListener { authResult ->
                            val firebaseUser = authResult.user
                            val uid = firebaseUser?.uid ?: ""

                            // Cek apakah user ini sudah ada di Firestore
                            db.collection("users").document(uid).get()
                                .addOnSuccessListener { document ->
                                    if (!document.exists()) {
                                        // User baru dari Google, buat profil otomatis
                                        val baseEmail = firebaseUser?.email?.substringBefore("@")?.lowercase() ?: "user"
                                        val randomSuffix = (100..999).random()
                                        val genUsername = "${baseEmail}_$randomSuffix"

                                        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                        val currentIsoTime = sdf.format(Date())

                                        val userMap = hashMapOf(
                                            "id" to uid,
                                            "name" to (firebaseUser?.displayName ?: "Pengguna Google"),
                                            "username" to genUsername,
                                            "email" to (firebaseUser?.email ?: ""),
                                            "isActive" to true,
                                            "theme" to "DARK",
                                            "createdAt" to currentIsoTime,
                                            "updatedAt" to currentIsoTime
                                        )
                                        db.collection("users").document(uid).set(userMap)
                                    }

                                    // Simpan sesi dan masuk dasbor
                                    val finalName = document.getString("name") ?: firebaseUser?.displayName ?: "Pengguna"
                                    coroutineScope.launch {
                                        sessionManager.saveSession(uid, finalName)
                                        isLoading = false
                                        navController.navigate("dashboard") {
                                            popUpTo("login") { inclusive = true }
                                        }
                                    }
                                }
                                .addOnFailureListener {
                                    isLoading = false
                                    errorMessage = "Gagal sinkronisasi profil Google."
                                }
                        }
                        .addOnFailureListener { e ->
                            isLoading = false
                            errorMessage = "Otentikasi Google ditolak Firebase."
                        }
                } else {
                    isLoading = false
                    errorMessage = "Kredensial Google tidak valid."
                }
            } catch (e: Exception) {
                isLoading = false
                errorMessage = "Proses login Google dibatalkan atau error."
                Log.e("GoogleSignIn", e.toString())
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
    ) {
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

            if (errorMessage != null) {
                Text(text = errorMessage!!, color = Red600, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 16.dp))
            }

            Text(text = "EMAIL ATAU USERNAME", style = Typography.labelMedium, color = Slate500)
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedTextField(
                value = identifier,
                onValueChange = { identifier = it; errorMessage = null },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Slate500, unfocusedBorderColor = borderColor,
                    focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface
                ),
                singleLine = true, enabled = !isLoading
            )
            Spacer(modifier = Modifier.height(16.dp))

            Text(text = "KATA SANDI", style = Typography.labelMedium, color = Slate500)
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; errorMessage = null },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp),
                visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    val image = if (isPasswordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                    IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                        Icon(imageVector = image, contentDescription = null, tint = Slate400)
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Slate500, unfocusedBorderColor = borderColor,
                    focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface
                ),
                singleLine = true, enabled = !isLoading
            )
            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = {
                    if (identifier.trim().isBlank() || password.isBlank()) {
                        errorMessage = "Semua kolom wajib diisi."
                        return@Button
                    }
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = null
                        val auth = FirebaseAuth.getInstance()
                        val db = FirebaseFirestore.getInstance()

                        val performFirebaseSignIn: (String) -> Unit = { finalEmail ->
                            auth.signInWithEmailAndPassword(finalEmail, password)
                                .addOnSuccessListener { authResult ->
                                    val uid = authResult.user?.uid ?: ""
                                    db.collection("users").document(uid).get()
                                        .addOnSuccessListener { document ->
                                            val fullName = document.getString("name") ?: "Pengguna"
                                            coroutineScope.launch {
                                                sessionManager.saveSession(uid, fullName)
                                                isLoading = false
                                                navController.navigate("dashboard") { popUpTo("login") { inclusive = true } }
                                            }
                                        }
                                }
                                .addOnFailureListener { isLoading = false; errorMessage = "Kredensial salah atau kata sandi tidak cocok." }
                        }

                        val inputIdentifier = identifier.trim()
                        if (inputIdentifier.contains("@")) {
                            performFirebaseSignIn(inputIdentifier)
                        } else {
                            db.collection("users").whereEqualTo("username", inputIdentifier.lowercase()).get()
                                .addOnSuccessListener { documents ->
                                    if (documents.isEmpty) {
                                        isLoading = false; errorMessage = "Username tidak ditemukan."
                                    } else {
                                        val resolvedEmail = documents.documents[0].getString("email") ?: ""
                                        performFirebaseSignIn(resolvedEmail)
                                    }
                                }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(8.dp), enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = if (isDarkMode) Slate50 else Slate900, contentColor = if (isDarkMode) Slate900 else Slate50)
            ) {
                if (isLoading) CircularProgressIndicator(color = if (isDarkMode) Slate900 else Slate50, modifier = Modifier.size(24.dp), strokeWidth = 2.5.dp)
                else Text("Masuk ke Dasbor", fontWeight = FontWeight.Medium)
            }

            // PEMBATAS PROVIDER
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp)) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = borderColor)
                Text(" ATAU ", color = Slate400, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 12.dp))
                HorizontalDivider(modifier = Modifier.weight(1f), color = borderColor)
            }

            // TOMBOL GOOGLE
            OutlinedButton(
                onClick = handleGoogleSignIn,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(8.dp),
                enabled = !isLoading,
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onBackground)
            ) {
                Text("Lanjutkan dengan Google", fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                Text(text = "Belum memiliki entitas akun? ", color = Slate500, fontSize = 14.sp)
                Text(text = "Daftar di sini.", color = Blue600, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.clickable { navController.navigate("register") })
            }
        }
    }
}
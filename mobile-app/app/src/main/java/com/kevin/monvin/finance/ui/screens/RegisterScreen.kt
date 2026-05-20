package com.kevin.monvin.finance.ui.screens

import android.util.Log
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
import com.kevin.monvin.finance.R
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    navController: NavController
) {
    val context = LocalContext.current
    var name by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }

    var isUsernameChecking by remember { mutableStateOf(false) }
    var usernameValidationMessage by remember { mutableStateOf<String?>(null) }
    var isUsernameValid by remember { mutableStateOf<Boolean?>(null) }

    var isPasswordVisible by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val borderColor = if (isDarkMode) Slate800 else Slate200

    // FUNGSI GOOGLE SIGN-IN CREDENTIAL MANAGER (Sama dengan Login, tapi diarahkan ke halaman login jika berhasil)
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

                            db.collection("users").document(uid).get()
                                .addOnSuccessListener { document ->
                                    if (!document.exists()) {
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

                                    isLoading = false
                                    successMessage = "Registrasi Google berhasil! Silakan kembali dan login."
                                }
                        }
                        .addOnFailureListener {
                            isLoading = false
                            errorMessage = "Otentikasi Google ditolak Firebase."
                        }
                } else {
                    isLoading = false
                    errorMessage = "Kredensial Google tidak valid."
                }
            } catch (e: Exception) {
                isLoading = false
                errorMessage = "Proses registrasi Google dibatalkan."
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

            Text("REGISTRASI AKUN BARU", style = Typography.labelMedium, color = Blue600, modifier = Modifier.padding(bottom = 8.dp))
            Text("Mulai Kelola Finansial", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.padding(bottom = 24.dp))

            if (errorMessage != null) Text(text = errorMessage!!, color = Red600, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 16.dp))
            if (successMessage != null) Text(text = successMessage!!, color = Green600, fontSize = 13.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 16.dp))

            @Composable
            fun InputField(label: String, value: String, onValueChange: (String) -> Unit, isPassword: Boolean = false, customTrailingIcon: @Composable (() -> Unit)? = null) {
                Text(text = label, style = Typography.labelMedium, color = Slate500)
                Spacer(modifier = Modifier.height(4.dp))
                OutlinedTextField(
                    value = value, onValueChange = { onValueChange(it); errorMessage = null },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(8.dp),
                    visualTransformation = if (isPassword && !isPasswordVisible) PasswordVisualTransformation() else VisualTransformation.None,
                    trailingIcon = customTrailingIcon ?: if (isPassword) {
                        { IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) { Icon(if (isPasswordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, null, tint = Slate400) } }
                    } else null,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Slate500, unfocusedBorderColor = borderColor, focusedContainerColor = MaterialTheme.colorScheme.surface, unfocusedContainerColor = MaterialTheme.colorScheme.surface),
                    singleLine = true, enabled = !isLoading
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            InputField("NAMA LENGKAP", name, { name = it })
            InputField("USERNAME PENGGUNA", username, { username = it.trim(); usernameValidationMessage = null; isUsernameValid = null }, customTrailingIcon = {
                TextButton(
                    enabled = username.isNotBlank() && !isUsernameChecking && !isLoading,
                    onClick = {
                        coroutineScope.launch {
                            isUsernameChecking = true
                            usernameValidationMessage = null
                            isUsernameValid = null
                            val db = FirebaseFirestore.getInstance()
                            db.collection("users").whereEqualTo("username", username.lowercase().trim()).get()
                                .addOnSuccessListener { documents ->
                                    isUsernameChecking = false
                                    if (documents.isEmpty) { isUsernameValid = true; usernameValidationMessage = "Username tersedia." }
                                    else { isUsernameValid = false; usernameValidationMessage = "Username sudah digunakan." }
                                }
                        }
                    }
                ) {
                    if (isUsernameChecking) CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Blue600)
                    else Text("Cek", fontWeight = FontWeight.Bold, color = Blue600, fontSize = 12.sp)
                }
            })

            if (usernameValidationMessage != null) Text(text = usernameValidationMessage!!, color = if (isUsernameValid == true) Green600 else Red600, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 12.dp))

            InputField("ALAMAT EMAIL", email, { email = it })
            InputField("KATA SANDI", password, { password = it }, isPassword = true)
            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    if (name.isBlank() || username.isBlank() || email.isBlank() || password.isBlank()) { errorMessage = "Semua kolom wajib diisi."; return@Button }
                    if (isUsernameValid != true) { errorMessage = "Silakan cek ketersediaan Username Anda terlebih dahulu."; return@Button }
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = null
                        val auth = FirebaseAuth.getInstance()
                        val db = FirebaseFirestore.getInstance()
                        auth.createUserWithEmailAndPassword(email.trim(), password)
                            .addOnSuccessListener { authResult ->
                                val uid = authResult.user?.uid ?: ""
                                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                val userMap = hashMapOf("id" to uid, "name" to name.trim(), "username" to username.lowercase().trim(), "email" to email.trim(), "isActive" to true, "theme" to "DARK", "createdAt" to sdf.format(Date()), "updatedAt" to sdf.format(Date()))
                                db.collection("users").document(uid).set(userMap)
                                    .addOnSuccessListener {
                                        isLoading = false; successMessage = "Akun berhasil dibuat! Silakan kembali dan login."
                                        name = ""; username = ""; email = ""; password = ""; isUsernameValid = null; usernameValidationMessage = null
                                    }
                            }
                            .addOnFailureListener { e -> isLoading = false; errorMessage = e.localizedMessage ?: "Gagal mendaftarkan akun." }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(8.dp), enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = if (isDarkMode) Slate50 else Slate900, contentColor = if (isDarkMode) Slate900 else Slate50)
            ) {
                if (isLoading) CircularProgressIndicator(color = if (isDarkMode) Slate900 else Slate50, modifier = Modifier.size(24.dp), strokeWidth = 2.5.dp)
                else Text("Buat Akun MonVin", fontWeight = FontWeight.Medium)
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
                Text("Daftar dengan Google", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
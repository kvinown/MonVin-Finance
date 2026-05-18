package com.kevin.monvin.finance.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
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
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.components.BottomNavigationBar
import com.kevin.monvin.finance.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(
    sessionManager: SessionManager,
    navController: NavController,
    isDarkMode: Boolean,
    onToggleTheme: () -> Unit,
    onLogout: () -> Unit
) {
    val userName by sessionManager.userName.collectAsState(initial = "Pengguna")
    val coroutineScope = rememberCoroutineScope()

    Scaffold(
        bottomBar = { BottomNavigationBar(navController) },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
        ) {
            Spacer(modifier = Modifier.height(32.dp))

            // HEADER: JUDUL
            Text(text = "Pengaturan", style = Typography.labelMedium, color = Slate400)
            Text(text = "Profil Saya", style = Typography.displayLarge, color = MaterialTheme.colorScheme.onBackground)

            Spacer(modifier = Modifier.height(32.dp))

            // KARTU INFO USER (Avatar & Nama)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier.padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Avatar Placeholder (Inisial Nama)
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Blue600),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = userName?.firstOrNull()?.uppercase() ?: "U",
                            color = Color.White,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    Column {
                        Text(
                            text = userName ?: "Pengguna",
                            style = Typography.displayLarge,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(text = "Pengguna MonVin", style = Typography.bodyLarge, color = Slate500)
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            Text(text = "PREFERENSI APLIKASI", style = Typography.labelMedium, color = Slate500, modifier = Modifier.padding(bottom = 8.dp))

            // MENU 1: TEMA (DARK/LIGHT MODE)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onToggleTheme() },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = null,
                            tint = Blue600,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Text(
                            text = if (isDarkMode) "Ubah ke Light Mode" else "Ubah ke Dark Mode",
                            style = Typography.bodyLarge,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                    }
                    // Switch/Toggle UI
                    Switch(
                        checked = isDarkMode,
                        onCheckedChange = { onToggleTheme() },
                        colors = SwitchDefaults.colors(checkedThumbColor = Blue600, checkedTrackColor = Blue400.copy(alpha = 0.5f))
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // MENU 2: LOGOUT
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        coroutineScope.launch {
                            sessionManager.clearSession() // Hapus token
                            onLogout() // Lempar ke layar login
                        }
                    },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Red600.copy(alpha = 0.1f)) // Latar merah transparan
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.ExitToApp,
                        contentDescription = null,
                        tint = Red600,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = "Keluar dari Akun",
                        style = Typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = Red600
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f)) // Mendorong versi ke bawah

            // WATERMARK VERSI
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(
                    text = "MonVin Finance v1.0.0",
                    style = Typography.labelMedium,
                    color = Slate400,
                    modifier = Modifier.padding(bottom = 32.dp)
                )
            }
        }
    }
}
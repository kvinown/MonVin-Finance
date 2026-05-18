package com.kevin.monvin.finance

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.kevin.monvin.finance.data.SessionManager
import com.kevin.monvin.finance.ui.screens.DashboardScreen
import com.kevin.monvin.finance.ui.screens.LoginScreen
import com.kevin.monvin.finance.ui.screens.ProfileScreen
import com.kevin.monvin.finance.ui.screens.RegisterScreen
import com.kevin.monvin.finance.ui.screens.TransactionsScreen
import com.kevin.monvin.finance.ui.screens.WalletsScreen
import com.kevin.monvin.finance.ui.theme.MonVinFinanceTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. Inisialisasi Pengelola Sesi
        val sessionManager = SessionManager(applicationContext)

        setContent {
            val systemTheme = isSystemInDarkTheme()
            var isDarkMode by remember { mutableStateOf(systemTheme) }

            // 2. Inisialisasi Mesin Navigasi
            val navController = rememberNavController()

            MonVinFinanceTheme(darkTheme = isDarkMode) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // 3. Daftarkan Rute Layar
                    NavHost(navController = navController, startDestination = "login") {

                        // RUTE: LAYAR LOGIN
                        composable("login") {
                            LoginScreen(
                                isDarkMode = isDarkMode,
                                onToggleTheme = { isDarkMode = !isDarkMode },
                                navController = navController,
                                sessionManager = sessionManager
                            )
                        }

//                        RUTE: LAYAR REGISTER
                        composable("register") {
                            RegisterScreen(
                                isDarkMode = isDarkMode,
                                onToggleTheme = { isDarkMode = !isDarkMode },
                                navController = navController
                            )
                        }

                        // RUTE: LAYAR DASBOR
                        composable("dashboard") {
                            DashboardScreen(
                                sessionManager = sessionManager,
                                navController = navController,
                                isDarkMode = isDarkMode
                            )
                        }

                        // RUTE: LAYAR DOMPET
                        composable("wallets") {
                            WalletsScreen(
                                sessionManager = sessionManager,
                                navController = navController
                            )
                        }
                        // RUTE: LAYAR TRANSAKSI
                        composable("transactions") {
                            TransactionsScreen(
                                sessionManager = sessionManager,
                                navController = navController,
                                isDarkMode = isDarkMode
                            )
                        }
                        // RUTE: LAYAR PROFIL
                        composable("profile") {
                            ProfileScreen(
                                sessionManager = sessionManager,
                                navController = navController,
                                isDarkMode = isDarkMode,
                                onToggleTheme = { isDarkMode = !isDarkMode },
                                onLogout = {
                                    // Pindah ke halaman login dan hapus seluruh riwayat stack halaman
                                    navController.navigate("login") {
                                        popUpTo(0)
                                    }
                                }
                            )
                        }

                    }
                }
            }
        }
    }
}
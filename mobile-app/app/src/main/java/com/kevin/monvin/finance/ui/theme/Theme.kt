package com.kevin.monvin.finance.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

// 🔥 Gunakan palet Slate & Blue MonVin
private val DarkColorScheme = darkColorScheme(
    primary = Blue400,
    secondary = Slate400,
    tertiary = Blue600,
    background = Slate900,
    surface = Slate800,
    onPrimary = Slate50,
    onBackground = Slate50,
    onSurface = Slate50
)

private val LightColorScheme = lightColorScheme(
    primary = Blue600,
    secondary = Slate500,
    tertiary = Blue400,
    background = Slate50,
    surface = Slate50, // Menggunakan Slate50 atau White
    onPrimary = Slate50,
    onBackground = Slate900,
    onSurface = Slate900
)

@Composable
fun MonVinFinanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false, // 🔥 Matikan dynamic color agar tema MonVin tetap konsisten di HP apapun
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography, // Ini akan memanggil Typography dari Type.kt yang sudah diperbaiki
        content = content
    )
}
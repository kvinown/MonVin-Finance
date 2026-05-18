package com.kevin.monvin.finance.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

// Inisialisasi DataStore
private val Context.dataStore by preferencesDataStore(name = "user_session")

class SessionManager(private val context: Context) {

    companion object {
        private val TOKEN_KEY = stringPreferencesKey("jwt_token")
        private val USER_NAME_KEY = stringPreferencesKey("user_name")
    }

    // Membaca Token (Akan dipantau secara reaktif)
    val userToken: Flow<String?> = context.dataStore.data.map { it[TOKEN_KEY] }

    // Membaca Nama User
    val userName: Flow<String?> = context.dataStore.data.map { it[USER_NAME_KEY] }

    // Fungsi untuk menyimpan data saat Login Sukses
    suspend fun saveSession(token: String, name: String) {
        context.dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
            preferences[USER_NAME_KEY] = name
        }
    }

    // Fungsi untuk menghapus data saat Logout
    suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }
}
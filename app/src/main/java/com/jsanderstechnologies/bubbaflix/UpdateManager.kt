package com.jsanderstechnologies.bubbaflix

import android.content.Context
import android.util.Log
import okhttp3.*
import org.json.JSONObject
import java.io.IOException

object UpdateManager {
    fun checkForUpdates(context: Context) {
        val updateUrl = BuildConfig.UPDATE_JSON_URL
        val currentCode = BuildConfig.VERSION_CODE
        val channel = BuildConfig.BUILD_CHANNEL

        Log.d("UpdateManager", "Checking for updates channel=$channel url=$updateUrl currentCode=$currentCode")

        val client = OkHttpClient()
        val request = Request.Builder()
            .url("$updateUrl?t=${System.currentTimeMillis()}")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.w("UpdateManager", "Failed to check update JSON from $updateUrl: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use { resp ->
                    if (!resp.isSuccessful) return@use
                    val bodyString = resp.body?.string() ?: return@use
                    try {
                        val json = JSONObject(bodyString)
                        val remoteCode = json.optInt("versionCode", json.optInt("build", 0))
                        val remoteVersion = json.optString("versionName", json.optString("version", ""))
                        val apkUrl = json.optString("apkUrl", "")

                        Log.d("UpdateManager", "Remote version=$remoteVersion remoteCode=$remoteCode currentCode=$currentCode")
                        if (remoteCode > currentCode) {
                            Log.i("UpdateManager", "New update available ($remoteVersion) at $apkUrl")
                        }
                    } catch (e: Exception) {
                        Log.e("UpdateManager", "Error parsing update JSON", e)
                    }
                }
            }
        })
    }
}

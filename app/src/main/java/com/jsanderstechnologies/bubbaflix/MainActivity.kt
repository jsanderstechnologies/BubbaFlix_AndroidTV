package com.jsanderstechnologies.bubbaflix

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    private val speechLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val spokenText = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
            if (!spokenText.isNullOrEmpty()) {
                val cleanText = spokenText.replace("'", "\\'")
                runOnUiThread {
                    webView.evaluateJavascript(
                        "(function() {" +
                        "  if (typeof window.onVoiceSearchResult === 'function') {" +
                        "    window.onVoiceSearchResult('$cleanText');" +
                        "  } else {" +
                        "    window.location.hash = '#/search/' + encodeURIComponent('$cleanText');" +
                        "  }" +
                        "})();",
                        null
                    )
                }
            }
        }
    }

    fun triggerVoiceSearch() {
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to search BubbaFlix...")
            }
            speechLauncher.launch(intent)
        } catch (e: Exception) {
            runOnUiThread {
                Toast.makeText(this, "Voice search is not available on this device.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    class AndroidPlayerBridge(private val context: Context, private val activity: Activity) {
        @JavascriptInterface
        fun playStream(videoUrl: String, title: String?, logoUrl: String?, tmdbId: String?, mediaType: String?) {
            PlayerActivity.start(context, videoUrl, title, logoUrl, tmdbId, mediaType)
        }

        @JavascriptInterface
        fun showKeyboard() {
            activity.runOnUiThread {
                val imm = activity.getSystemService(Context.INPUT_METHOD_SERVICE) as? android.view.inputmethod.InputMethodManager
                val currentFocusView = activity.currentFocus
                if (currentFocusView != null) {
                    imm?.showSoftInput(currentFocusView, android.view.inputmethod.InputMethodManager.SHOW_FORCED)
                }
            }
        }

        @JavascriptInterface
        fun startVoiceSearch() {
            activity.runOnUiThread {
                (activity as? MainActivity)?.triggerVoiceSearch()
            }
        }

        @JavascriptInterface
        fun promptExitApp() {
            activity.runOnUiThread {
                (activity as? MainActivity)?.promptExitApp()
            }
        }

        @JavascriptInterface
        fun getUpdateUrl(): String {
            return BuildConfig.UPDATE_JSON_URL
        }

        @JavascriptInterface
        fun getBuildChannel(): String {
            return BuildConfig.BUILD_CHANNEL
        }

        @JavascriptInterface
        fun getVersionName(): String {
            return BuildConfig.VERSION_NAME
        }

        @JavascriptInterface
        fun getVersionCode(): Int {
            return BuildConfig.VERSION_CODE
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        hideSystemUI()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F1014"))
            isFocusable = true
            isFocusableInTouchMode = true
        }
        setContentView(webView)

        setupWebViewSettings()
        loadLocalBubbaFlix()

        UpdateManager.checkForUpdates(this)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebViewSettings() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent BubbaFlixTV/${BuildConfig.VERSION_NAME} AndroidTV Channel/${BuildConfig.BUILD_CHANNEL}"

        webView.addJavascriptInterface(AndroidPlayerBridge(this, this), "AndroidPlayer")

        webView.webChromeClient = object : WebChromeClient() {}

        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
            }
        }
    }

    private fun loadLocalBubbaFlix() {
        webView.loadUrl("file:///android_asset/dist/index.html")
    }

    fun promptExitApp() {
        AlertDialog.Builder(this)
            .setTitle("Exit BubbaFlix")
            .setMessage("Are you sure you want to exit?")
            .setPositiveButton("Exit") { _, _ -> finish() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            webView.evaluateJavascript(
                "(function() {" +
                "  if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {" +
                "    window.history.back();" +
                "    return true;" +
                "  }" +
                "  return false;" +
                "})();"
            ) { result ->
                if (result == "false") {
                    promptExitApp()
                }
            }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }
}

package com.prithvishield.citizen;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable edge-to-edge with dynamic WindowInsets measurement
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Set status bar & navigation bar theme colors
        getWindow().setStatusBarColor(Color.parseColor("#090d16"));
        getWindow().setNavigationBarColor(Color.parseColor("#090d16"));

        WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false); // Light icons/text on dark #090d16 background
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // Apply WindowInsets listener to measure status bars, display cutouts (notches/punch holes), and nav bars
        View decorView = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets statusInsets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets navInsets = windowInsets.getInsets(
                WindowInsetsCompat.Type.navigationBars()
            );

            float density = getResources().getDisplayMetrics().density;
            int statusBarDp = Math.round(statusInsets.top / density);
            int navBarDp = Math.round(navInsets.bottom / density);

            // Dynamically propagate exact pixel insets to the WebView CSS variables
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.post(() -> {
                    String script = String.format(
                        "document.documentElement.style.setProperty('--status-bar-height', '%dpx');" +
                        "document.documentElement.style.setProperty('--nav-bar-height', '%dpx');",
                        statusBarDp, navBarDp
                    );
                    webView.evaluateJavascript(script, null);
                });
            }

            return windowInsets;
        });
    }
}

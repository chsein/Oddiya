import "../../styles/global.css";
import type { AppProps } from "next/app";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import { AuthProvider } from "../contexts/AuthContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <PWAInstallPrompt />
    </AuthProvider>
  );
}

export default MyApp;

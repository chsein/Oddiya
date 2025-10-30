import "../../styles/global.css";
import type { AppProps } from "next/app";
import PWAInstallPrompt from "../components/PWAInstallPrompt";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <PWAInstallPrompt />
    </>
  );
}

export default MyApp;

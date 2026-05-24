import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css'; // Tailwind

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Új generációs RainbowKit + Wagmi konfiguráció (wagmi v2+ és RainbowKit v2+)
const config = getDefaultConfig({
  appName: 'SepoliaBet DApp',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'MISSING_PROJECT_ID',
  chains: [sepolia],
  ssr: false, // Vite nem SSR
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

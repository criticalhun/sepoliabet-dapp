import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';

export default function WalletConnect() {
  const { disconnect } = useDisconnect();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div {...(!ready && { 'aria-hidden': true })} className="flex items-center">
            {(() => {
              if (!connected) {
                return (
                  <button onClick={openConnectModal} type="button"
                    className="bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-semibold py-1.5 px-3 md:py-2 md:px-5 rounded-full transition-all duration-300 shadow-glow hover:shadow-glow-lg text-xs md:text-sm"
                  >
                    Csatlakozás
                  </button>
                );
              }
              return (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-surface-800/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]"></div>
                    <span className="text-sm text-gray-200 font-medium">
                      {account.displayName}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors duration-200"
                    title="Kijelentkezés"
                  >
                    Kilépés
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

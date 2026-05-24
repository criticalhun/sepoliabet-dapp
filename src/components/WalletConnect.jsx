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
          <div>
            {!connected ? (
              <button onClick={openConnectModal}
                className="text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200"
                style={{
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a5b4fc',
                }}
              >
                Csatlakozás
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="mono text-xs text-slate-300">{account.displayName}</span>
                </div>
                <button onClick={() => disconnect()}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-1">
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

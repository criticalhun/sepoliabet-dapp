import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect, useBalance } from 'wagmi';
import { useTranslation } from 'react-i18next';

export default function WalletConnect() {
  const { disconnect } = useDisconnect();
  const { t } = useTranslation();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div {...(!mounted && { 'aria-hidden': true })}>
            {!connected ? (
              <button onClick={openConnectModal} type="button"
                className="btn-primary py-1.5 px-4 text-xs font-semibold rounded-full">
                {t('wallet.connect')}
              </button>
            ) : (
              <ConnectedInfo
                address={account.address}
                displayName={account.displayName}
                onDisconnect={disconnect}
              />
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// Külön komponens hogy a useBalance hook legyen a connected ágban
function ConnectedInfo({ address, displayName, onDisconnect }) {
  const { t } = useTranslation();
  const { data: bal } = useBalance({ address, chainId: 11155111 }); // Sepolia

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end rounded-xl px-3 py-1.5 text-xs"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="font-medium" style={{ color: 'var(--text-1)' }}>
            {displayName}
          </span>
        </div>
        {bal && (
          <span className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
            {parseFloat(bal.formatted).toFixed(4)} ETH
          </span>
        )}
      </div>
      <button onClick={onDisconnect}
        className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium">
        {t('wallet.disconnect')}
      </button>
    </div>
  );
}

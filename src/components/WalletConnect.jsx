import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
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
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  {account.displayName}
                </div>
                <button onClick={() => disconnect()}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium">
                  {t('wallet.disconnect')}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

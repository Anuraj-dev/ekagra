import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ScreenHeader } from '../components/ScreenHeader';
import { type DeviceSummary, devicesApi } from '../lib/api';
import { useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';

/** Settings — behind the Today header icon (not a tab). Account + paired devices. */
export function Settings() {
  const { close } = useNav();
  const { session, signOut } = useAuth();
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [newToken, setNewToken] = useState<{ deviceId: string; deviceToken: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDevices(await devicesApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load devices.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function pairDevice() {
    setError(null);
    try {
      const res = await devicesApi.register('Desk companion');
      setNewToken(res);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register the device.');
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await devicesApi.revoke(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the device.');
    }
  }

  return (
    <div className="app-frame">
      <div className="scroll" style={{ paddingBottom: 32 }}>
        <ScreenHeader title="Settings" onBack={close} />

        <div className="enter-delay">
          <div style={{ padding: '24px 16px 0' }}>
            <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
              Account
            </div>
            <div
              style={{
                background: tokens.surface2,
                border: `1px solid ${tokens.lineSoft}`,
                borderRadius: 16,
                padding: '15px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: tokens.t2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {session?.user.email ?? 'Signed in'}
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: tokens.ember,
                  flex: 'none',
                  marginLeft: 12,
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          <div style={{ padding: '24px 16px 0' }}>
            <div className="overline" style={{ color: tokens.t3, marginBottom: 10 }}>
              Ekagra Desk
            </div>
            {devices
              .filter((d) => d.revoked_at === null)
              .map((device) => (
                <div
                  key={device.id}
                  style={{
                    background: tokens.surface2,
                    border: `1px solid ${tokens.lineSoft}`,
                    borderRadius: 16,
                    padding: '15px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tokens.t2 }}>
                      {device.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tokens.t4, marginTop: 2 }}>
                      {device.last_seen_at
                        ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}`
                        : 'Never connected'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revoke(device.id)}
                    style={{ fontSize: 13, fontWeight: 700, color: tokens.t4 }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            <button
              type="button"
              onClick={pairDevice}
              style={{ fontSize: 13, fontWeight: 700, color: tokens.ember, padding: '8px 4px' }}
            >
              + Pair a desk device
            </button>
            {newToken && (
              <div
                style={{
                  marginTop: 10,
                  background: 'rgba(91,191,138,.12)',
                  border: '1px solid rgba(91,191,138,.40)',
                  borderRadius: 12,
                  padding: '13px 16px',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: tokens.green }}>
                  Device token — shown once, copy it into the firmware:
                </div>
                <code
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: tokens.t2,
                    marginTop: 6,
                    wordBreak: 'break-all',
                  }}
                >
                  {newToken.deviceToken}
                </code>
              </div>
            )}
            {error && (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E4796B', marginTop: 10 }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

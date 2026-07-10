import { AuthProvider, useAuth } from './auth/AuthProvider';
import { TabBar } from './components/TabBar';
import { DataProvider, useData } from './data/DataProvider';
import { isSupabaseConfigured } from './lib/supabase';
import { NavProvider, useNav } from './nav/navigation';
import { Crew } from './screens/Crew';
import { EveningClose } from './screens/EveningClose';
import { Focus } from './screens/Focus';
import { Goals } from './screens/Goals';
import { Insights } from './screens/Insights';
import { MorningCommit } from './screens/MorningCommit';
import { Settings } from './screens/Settings';
import { SignIn } from './screens/SignIn';
import { Tasks } from './screens/Tasks';
import { Today } from './screens/Today';
import { color as tokens } from './theme/tokens';

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <div
        className="app-frame"
        style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <div className="overline" style={{ color: tokens.ember }}>
          Ekagra
        </div>
        <p
          style={{
            marginTop: 12,
            fontSize: 14,
            fontWeight: 600,
            color: tokens.t3,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          Supabase is not configured. Copy <code>apps/web/.env.example</code> to{' '}
          <code>.env.local</code> and set <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-frame" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="overline" style={{ color: tokens.t4 }}>
          Ekagra
        </span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-frame">
        <SignIn />
      </div>
    );
  }

  return (
    <DataProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </DataProvider>
  );
}

function Shell() {
  const { tab, overlay } = useNav();
  const { loading, error, reloadAll } = useData();

  // Overlays own the whole frame.
  if (overlay === 'focus') {
    return (
      <div className="app-frame focus">
        <Focus />
      </div>
    );
  }
  if (overlay === 'morning-commit') return <MorningCommit />;
  if (overlay === 'evening-close') return <EveningClose />;
  if (overlay === 'settings') return <Settings />;

  return (
    <div className="app-frame">
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="overline" style={{ color: tokens.t4 }}>
            Loading
          </span>
        </div>
      ) : error ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: tokens.t3,
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
          <button
            type="button"
            onClick={() => void reloadAll()}
            style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: tokens.ember }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {tab === 'today' && <Today />}
          {tab === 'goals' && <Goals />}
          {tab === 'insights' && <Insights />}
          {tab === 'crew' && <Crew />}
          {tab === 'tasks' && <Tasks />}
        </>
      )}
      <TabBar />
    </div>
  );
}

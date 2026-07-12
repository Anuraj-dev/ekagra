import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/ui';
import { color, space } from '../theme/tokens';
import { overline, text } from '../theme/typography';

/** Map raw Supabase error messages to plain, sanitized copy. */
function sanitizeAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message.toLowerCase() : '';
  if (raw.includes('invalid login') || raw.includes('invalid credentials')) {
    return 'Wrong email or password.';
  }
  if (raw.includes('already registered') || raw.includes('already exists')) {
    return 'That email is already registered.';
  }
  if (raw.includes('network') || raw.includes('fetch') || raw.includes('timeout')) {
    return 'Network error — try again.';
  }
  return 'Something went wrong — try again.';
}

/** Minimal email/password gate. Supabase manages the session and JWT. */
export function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  async function submit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setNotice(null);
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'in') {
        await signIn(trimmedEmail, password);
      } else {
        await signUp(trimmedEmail, password);
        setNotice('Account created — sign in.');
        setMode('in');
      }
    } catch (err) {
      setError(sanitizeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ paddingHorizontal: 24 }}>
      <View style={{ paddingTop: insets.top + space[10] }}>
        <Text style={[overline, { color: color.ember }]}>Ekagra</Text>
        <Text
          style={text(800, { fontSize: 26, letterSpacing: -0.4, color: color.t1, marginTop: 10 })}
        >
          {mode === 'in' ? 'Sign in' : 'Create your account'}
        </Text>
      </View>

      <View style={{ marginTop: 32, gap: 12 }}>
        <Field label="Email">
          <TextInput
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            placeholderTextColor={color.t4}
            style={inputStyle(focused === 'email')}
          />
        </Field>
        <Field label="Password">
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'in' ? 'password' : 'password-new'}
            textContentType={mode === 'in' ? 'password' : 'newPassword'}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            placeholderTextColor={color.t4}
            style={inputStyle(focused === 'password')}
          />
        </Field>

        {error && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor: color.dangerDim,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <Text style={text(600, { fontSize: 13, color: color.danger })}>{error}</Text>
          </View>
        )}
        {notice && <Text style={text(600, { fontSize: 13, color: color.green })}>{notice}</Text>}

        <View style={{ marginTop: 8 }}>
          <PrimaryButton disabled={busy} onPress={submit}>
            {busy
              ? mode === 'in'
                ? 'Signing in…'
                : 'Creating…'
              : mode === 'in'
                ? 'Sign in'
                : 'Create account'}
          </PrimaryButton>
        </View>
      </View>

      <Pressable
        onPress={() => setMode(mode === 'in' ? 'up' : 'in')}
        style={({ pressed }) => ({ marginTop: 20, opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={text(700, { fontSize: 13, color: color.t3 })}>
          {mode === 'in' ? 'Need an account? Create one' : 'Have an account? Sign in'}
        </Text>
      </Pressable>
    </Screen>
  );
}

function inputStyle(active: boolean) {
  return text(500, {
    backgroundColor: color.surface,
    borderWidth: 1.5,
    borderColor: active ? color.ember : color.line,
    borderRadius: 12,
    padding: 16,
    color: color.t1,
    fontSize: 15,
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text style={[overline, { color: color.t3, marginBottom: 8 }]}>{label}</Text>
      {children}
    </View>
  );
}

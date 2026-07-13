import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useCreateTask } from '../data/hooks';
import type { RootNav } from '../nav/types';
import { useTheme } from '../theme/ThemeProvider';
import { display, ui } from '../theme/typography';

export function Capture() {
  const t = useTheme();
  const nav = useNavigation<RootNav>();
  const [title, setTitle] = useState('');
  const create = useCreateTask();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !create.isPending && !create.isError) {
      nav.goBack();
    }
    wasPending.current = create.isPending;
  }, [create.isError, create.isPending, nav]);

  const save = () => {
    if (!title.trim() || create.isPending) return;
    if (create.isError) create.reset();
    create.mutate({ title: title.trim(), goalId: null });
  };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: t.canvasDeep }}>
      <View
        style={{
          backgroundColor: t.canvas,
          borderTopLeftRadius: t.radii.sheet,
          borderTopRightRadius: t.radii.sheet,
          padding: 24,
          paddingBottom: 38,
          ...t.elevationNative.sheet,
        }}
      >
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: t.lineStrong,
            alignSelf: 'center',
            marginBottom: 22,
          }}
        />
        <Text style={ui(600, { color: t.textSecondary, fontSize: 11, letterSpacing: 1.5 })}>
          CAPTURE
        </Text>
        <Text style={display(600, { color: t.ink, fontSize: 24, marginTop: 8 })}>New task</Text>
        <Text style={ui(600, { color: t.textSecondary, fontSize: 13, marginTop: 20 })}>
          Task title
        </Text>
        <TextInput
          accessibilityLabel="Task title"
          value={title}
          onChangeText={setTitle}
          autoFocus
          placeholder="What needs your attention?"
          placeholderTextColor={t.textPlaceholder}
          style={ui(400, {
            color: t.ink,
            fontSize: 18,
            borderBottomWidth: 2,
            borderBottomColor: t.ink,
            paddingVertical: 10,
          })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: create.isPending }}
          disabled={create.isPending}
          onPress={save}
          style={({ pressed }) => ({
            minHeight: 52,
            marginTop: 24,
            borderRadius: t.radii.pill,
            backgroundColor: pressed ? t.accentPressed : t.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: create.isPending ? 0.75 : 1,
          })}
        >
          <Text style={ui(600, { color: t.inkOnDark, fontSize: 15 })}>
            {create.isPending ? '● Saving…' : 'Add to Inbox'}
          </Text>
        </Pressable>
        {create.isError && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={ui(500, { color: t.dangerText, fontSize: 13 })}>Couldn’t save task.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={create.retry}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <Text style={ui(700, { color: t.dangerText, fontSize: 12 })}>RETRY</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityState={{ disabled: create.isPending }}
          disabled={create.isPending}
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={ui(500, { color: t.textSecondary, fontSize: 13 })}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

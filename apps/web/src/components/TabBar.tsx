import type { ComponentType } from 'react';
import { TABS, type TabRoute, useNav } from '../nav/navigation';
import { color as tokens } from '../theme/tokens';
import { CrewIcon, GoalsIcon, InsightsIcon, TasksIcon, TodayIcon } from './icons';

const ICONS: Record<TabRoute, ComponentType> = {
  today: TodayIcon,
  goals: GoalsIcon,
  insights: InsightsIcon,
  crew: CrewIcon,
  tasks: TasksIcon,
};

/** Solid flat tab bar, hairline top, active-tab tick indicator (DESIGN-SPEC §6). */
export function TabBar() {
  const { tab, setTab } = useNav();
  return (
    <nav
      style={{
        height: 78,
        background: tokens.bg,
        borderTop: `1px solid ${tokens.line}`,
        display: 'flex',
        paddingBottom: 12,
        flex: 'none',
      }}
    >
      {TABS.map(({ route, label }) => {
        const active = tab === route;
        const Icon = ICONS[route];
        return (
          <button
            key={route}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => setTab(route)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              position: 'relative',
              color: active ? tokens.ember : tokens.t4,
              transition: 'color .2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 10,
                width: 16,
                height: 3,
                borderRadius: 2,
                background: active ? tokens.ember : 'transparent',
              }}
            />
            <Icon />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

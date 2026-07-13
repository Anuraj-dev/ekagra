import { useMemo, useState } from 'react';
import {
  light,
  motion,
  radii,
  type ThemeColors,
  type ThemeName,
  themes,
  withAlpha,
} from '../theme/tokens';

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

const APP_NAME = 'ekagra';

function vars(theme: ThemeColors): CSSVars {
  return {
    '--canvas': theme.canvas,
    '--canvas-deep': theme.canvasDeep,
    '--surface': theme.surface,
    '--surface-sunk': theme.surfaceSunk,
    '--nav': theme.navBar,
    '--ink': theme.ink,
    '--ink-on-dark': theme.inkOnDark,
    '--secondary': theme.textSecondary,
    '--meta': theme.textMetaDecorative,
    '--placeholder': theme.textPlaceholder,
    '--line': theme.line,
    '--line-soft': theme.lineSoft,
    '--line-input': theme.lineInput,
    '--line-strong': theme.lineStrong,
    '--accent': theme.accent,
    '--accent-pressed': theme.accentPressed,
    '--accent-on-dark': theme.accentOnDark,
    '--danger-bg': theme.dangerBg,
    '--danger-line': theme.dangerLine,
    '--danger-text': theme.dangerText,
    '--snackbar': theme.snackbarBg,
    '--pri-mid': theme.priMid,
    '--focus-ring': withAlpha(theme.accent, 0.42),
  };
}

function Label({ children }: { children: string }) {
  return <p className="gallery-label">{children}</p>;
}

function PlayButton({ state = 'default' }: { state?: 'default' | 'pressed' }) {
  return (
    <button className={`play-button ${state}`} type="button" aria-label="Start focus">
      <span aria-hidden="true">▶</span>
    </button>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} type="button" aria-label={on ? 'On' : 'Off'}>
      <span />
    </button>
  );
}

function GoalChip({ children = 'Thesis' }: { children?: string }) {
  return <span className="goal-chip">{children}</span>;
}

function PriorityDots() {
  return (
    <div className="priority-set" role="img" aria-label="Priority dots">
      <span className="priority-dot high" title="High priority" />
      <span className="priority-dot mid" title="Medium priority" />
      <span className="priority-dot low" title="Low priority" />
    </div>
  );
}

function PrimaryStates() {
  return (
    <div className="state-stack">
      <div className="state-row">
        <button className="primary-button" type="button">
          Save &amp; close
        </button>
        <button className="primary-button pressed" type="button">
          Pressed
        </button>
        <button className="primary-button pending" type="button">
          ● Saving…
        </button>
      </div>
      <div className="error-banner" role="alert">
        <span>Couldn’t save task. It’s kept locally.</span>
        <button type="button">RETRY</button>
      </div>
    </div>
  );
}

function StartStates() {
  return (
    <div className="state-row start-states">
      <PlayButton />
      <PlayButton state="pressed" />
      <span className="pending-chip">
        <i />
        Starting…
      </span>
      <span className="failure-chip">
        Couldn’t start · <b>RETRY</b>
      </span>
    </div>
  );
}

function Snackbars() {
  return (
    <div className="snackbar-stack">
      <div className="snackbar">
        <span>Completed “Book dentist appointment”</span>
        <button type="button">UNDO</button>
      </div>
      <div className="snackbar">
        <span>Sync failed · last synced 09:12</span>
        <button type="button">RETRY</button>
      </div>
    </div>
  );
}

function BottomNav({
  active = 'Tasks',
  miniTimer = false,
}: {
  active?: string;
  miniTimer?: boolean;
}) {
  return (
    <div className="nav-wrap">
      {miniTimer && <MiniTimer />}
      <nav className="bottom-nav" aria-label="Primary">
        {['Tasks', 'Goals'].map((item) => (
          <button
            className={`nav-item ${active === item ? 'active' : ''}`}
            type="button"
            key={item}
          >
            <span className="nav-icon">{item === 'Tasks' ? '▤' : '◎'}</span>
            {item}
          </button>
        ))}
        <button className="capture-fab" type="button" aria-label="Capture a task">
          +
        </button>
        {['Insights', 'Settings'].map((item) => (
          <button
            className={`nav-item ${active === item ? 'active' : ''}`}
            type="button"
            key={item}
          >
            <span className="nav-icon">{item === 'Insights' ? '◔' : '⚙'}</span>
            {item}
          </button>
        ))}
      </nav>
      <div className="gesture-bar" />
    </div>
  );
}

function MiniTimer() {
  return (
    <button className="mini-timer" type="button">
      <i /> <span>Write proposal</span> <strong>18:42</strong>
    </button>
  );
}

function TaskRow({
  running = false,
  completed = false,
  title,
  goal = true,
}: {
  running?: boolean;
  completed?: boolean;
  title: string;
  goal?: boolean;
}) {
  return (
    <div className={`task-row ${running ? 'running' : ''} ${completed ? 'completed' : ''}`}>
      <span className={`priority-dot ${completed ? 'check' : 'high'}`}>{completed ? '✓' : ''}</span>
      <div className="task-copy">
        <div>{title}</div>
        <small>
          {goal && <GoalChip />}{' '}
          <span>
            {running ? 'Session 1 of 2' : completed ? 'completed Sat' : '09:00 · 2 × 25 min'}
          </span>
        </small>
      </div>
      {running ? <strong className="row-time">18:42</strong> : !completed && <PlayButton />}
    </div>
  );
}

function DayStrip() {
  return (
    <div className="day-strip">
      {[
        ['MON', '13', '4'],
        ['TUE', '14', '2'],
        ['WED', '15', '1'],
        ['THU', '16', '—'],
        ['FRI', '17', '2'],
        ['SAT', '18', '—'],
        ['SUN', '19', '1'],
      ].map(([day, date, count], i) => (
        <button className={`day ${i === 0 ? 'selected' : ''}`} type="button" key={day}>
          <b>{day}</b>
          <strong>{date}</strong>
          <small>{count}</small>
        </button>
      ))}
    </div>
  );
}

function TasksFrame({ running = false }: { running?: boolean }) {
  return (
    <div className="phone-frame tasks-frame">
      <div className="statusbar">
        <span>9:30</span>
        <span>5G · ▮ 87%</span>
      </div>
      <header className="screen-header">
        <h2>Tasks</h2>
        <p>
          {running
            ? 'Mon Jul 13 · Session 1 of 2 running'
            : 'Mon Jul 13 · 3 in inbox · 4 scheduled'}
        </p>
      </header>
      <div className="phone-scroll">
        <div className="section-heading">
          <span>Inbox · {running ? 2 : 3}</span>
          <small>Oldest 2 d</small>
        </div>
        <TaskRow title="Email advisor re: draft" />
        <TaskRow title="Book dentist appointment" goal={false} />
        {!running && <TaskRow title="Compare standing desks" />}
        <div className="section-heading timeline-heading">
          <span>Timeline</span>
        </div>
        <DayStrip />
        <TaskRow title="Write proposal" running={running} />
        <TaskRow title="Revise chapter 2 notes" />
        <TaskRow title="Run 5k" goal={false} />
        <TaskRow title="Collect citation list" completed />
      </div>
      <BottomNav active="Tasks" miniTimer={running} />
    </div>
  );
}

function FocusFrame({ themeName }: { themeName: ThemeName }) {
  const isDark = themeName === 'dark';
  return (
    <div className="phone-frame focus-frame">
      <div className="statusbar">
        <span>9:30</span>
        <span>5G · ▮ 87%</span>
      </div>
      <main className="focus-content">
        <div className="wordmark">{APP_NAME}</div>
        <div className="focus-meta">FOCUS</div>
        <div className="timer" role="timer" aria-label="18 minutes 42 seconds remaining">
          18:42
        </div>
        <div className="live">
          <i />
          {isDark ? '[ Paused ]' : 'Live'}
        </div>
        <div className="focus-task">Write proposal</div>
        <div className="focus-sub">Thesis · session 4 of 8 today</div>
        <div className="progress">
          <span />
        </div>
        <div className="launch-pips">
          {Array.from({ length: 8 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length static decorative pips, never reordered
            <i className={i < 3 ? 'done' : i === 3 ? 'current' : ''} key={i} />
          ))}
        </div>
        <div className="stats-strip">
          <div>
            <small>Today</small>
            <strong>1 h 35 m</strong>
          </div>
          <div>
            <small>Sessions</small>
            <strong>3 of 8</strong>
          </div>
          <div>
            <small>Streak</small>
            <strong>4 days</strong>
          </div>
        </div>
        {isDark && <p className="holds">Timer holds until you resume.</p>}
        <div className="extend">
          <small>EXTEND</small>
          <button type="button">+1 min</button>
          <button type="button">+5 min</button>
        </div>
        <div className="transport">
          <button type="button" aria-label="Reset">
            ↺
          </button>
          <button
            className="transport-fab"
            type="button"
            aria-label={isDark ? 'Resume focus' : 'Pause focus'}
          >
            {isDark ? '▶' : '❚❚'}
          </button>
          <button type="button" aria-label="Skip">
            ≫
          </button>
        </div>
      </main>
      <div className="gesture-bar" />
    </div>
  );
}

function Gallery() {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const theme = themes[themeName];
  const css = useMemo(() => vars(theme), [theme]);
  return (
    <div className="gallery" style={css}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
        .gallery{min-height:100vh;background:var(--canvas);color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif;padding:40px 44px 72px;-webkit-font-smoothing:antialiased}
        .gallery *{box-sizing:border-box}
        .gallery h1,.gallery h2{font-family:'Source Serif 4',Georgia,serif}
        .gallery-top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:36px}
        .gallery-top h1{font-size:44px;font-weight:600;letter-spacing:-.01em;margin:2px 0 4px}
        .gallery-top p{margin:0;color:var(--secondary);font-size:14px}
        .gallery-kicker{margin:0;font:500 11px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .theme-toggle{display:flex;border:1px solid var(--line-strong);border-radius:999px;overflow:hidden;flex:none}
        .theme-toggle button{border:none;background:transparent;color:var(--secondary);font:500 13px 'Instrument Sans';padding:8px 18px;cursor:pointer}
        .theme-toggle button.selected{background:var(--ink);color:var(--ink-on-dark)}
        .gallery-section{margin-bottom:44px}
        .gallery-section>h2{font-size:24px;font-weight:600;margin:0 0 18px;letter-spacing:-.01em}
        .gallery-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .spec-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 2px 8px rgba(32,25,20,.08)}
        .spec-card.wide{grid-column:1 / -1}
        .gallery-label{margin:0 0 14px;font:500 11px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .state-stack{display:flex;flex-direction:column;gap:12px}
        .state-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        .chip-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .primary-button{border:none;border-radius:999px;background:var(--accent);color:#fff;font:600 14px 'Instrument Sans';padding:13px 22px;cursor:pointer;transition:filter .2s,transform .2s}
        .primary-button.pressed{background:var(--accent-pressed);transform:scale(.98)}
        .primary-button.pending{opacity:.75}
        .error-banner{display:flex;align-items:center;gap:12px;background:var(--danger-bg);border:1px solid var(--danger-line);border-radius:12px;padding:11px 14px;color:var(--danger-text);font-size:13px}
        .error-banner button{margin-left:auto;background:none;border:none;color:var(--danger-text);font:600 12px 'Instrument Sans';letter-spacing:.06em;cursor:pointer}
        .demo-chip{border:1px solid var(--line-strong);background:transparent;color:var(--ink);border-radius:999px;font:500 12.5px 'Instrument Sans';padding:7px 14px;cursor:pointer}
        .demo-chip.pressed{background:var(--surface-sunk);transform:scale(.97)}
        .demo-chip.selected{background:var(--ink);color:var(--ink-on-dark);border-color:var(--ink)}
        .goal-chip{border:1px solid var(--line-input);background:var(--surface-sunk);color:var(--secondary);border-radius:999px;font:500 11px 'Instrument Sans';padding:2px 8px}
        .toggle{width:48px;height:28px;border-radius:999px;border:none;background:var(--line-strong);position:relative;cursor:pointer;flex:none;padding:0}
        .toggle span{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:999px;background:#fdfaf4;border:1px solid var(--line-strong);transition:left .2s}
        .toggle.on{background:var(--accent)}
        .toggle.on span{left:23px;border:none;background:#fff}
        .priority-set{display:flex;gap:14px;align-items:center}
        .priority-dot{width:8px;height:8px;border-radius:999px;flex:none;display:inline-flex;align-items:center;justify-content:center}
        .priority-dot.high{background:var(--ink)}
        .priority-dot.mid{background:var(--pri-mid)}
        .priority-dot.low{background:transparent;border:1.5px solid var(--pri-mid)}
        .priority-dot.check{background:transparent;color:var(--secondary);font-size:12px;width:auto}
        .segmented{display:flex;gap:22px;border-bottom:1px solid var(--line)}
        .segmented button{border:none;background:none;color:var(--meta);font:500 14px 'Instrument Sans';padding:8px 2px;border-bottom:2.5px solid transparent;cursor:pointer;margin-bottom:-1px}
        .segmented button.active{color:var(--ink);font-weight:600;border-bottom-color:var(--ink)}
        .play-button{width:34px;height:34px;border-radius:999px;border:1.5px solid var(--line-strong);background:transparent;color:var(--ink);display:inline-flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;flex:none}
        .play-button.pressed{background:var(--surface-sunk);transform:scale(.94)}
        .start-states{align-items:center}
        .pending-chip{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line-strong);border-radius:999px;padding:8px 14px;font:500 12.5px 'Instrument Sans';color:var(--secondary)}
        .pending-chip i{width:7px;height:7px;border-radius:999px;background:var(--secondary);animation:pulse 1s infinite}
        .failure-chip{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--danger-line);border-radius:999px;padding:8px 14px;font:500 12.5px 'Instrument Sans';color:var(--danger-text)}
        .snackbar-stack{display:flex;flex-direction:column;gap:8px}
        .snackbar{display:flex;align-items:center;gap:12px;background:var(--snackbar);color:var(--ink-on-dark);border-radius:12px;padding:12px 16px;font-size:13px}
        .snackbar span{flex:1}
        .snackbar button{background:none;border:none;color:var(--accent-on-dark);font:600 12px 'Instrument Sans';letter-spacing:.08em;cursor:pointer}
        .task-row{display:flex;align-items:center;gap:12px;padding:13px 20px;border-bottom:1px solid var(--line)}
        .task-row.running{background:var(--surface-sunk);border-left:3px solid var(--ink);padding-left:17px}
        .task-row.completed{opacity:.55}
        .task-row.completed .task-copy>div{text-decoration:line-through;color:var(--secondary)}
        .task-copy{flex:1;min-width:0}
        .task-copy>div{font-size:15px}
        .task-copy small{display:flex;gap:8px;align-items:center;margin-top:4px;color:var(--secondary);font-size:11px}
        .row-time{font:600 13px 'JetBrains Mono',monospace}
        .nav-wrap{position:relative}
        .bottom-nav{height:84px;background:var(--nav);border-top:1px solid var(--line-soft);display:flex;align-items:center;justify-content:space-around;padding:0 8px}
        .nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;font:500 11px 'Instrument Sans';color:var(--secondary);width:64px;cursor:pointer}
        .nav-item.active{color:var(--ink)}
        .nav-icon{width:56px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:15px}
        .nav-item.active .nav-icon{background:var(--line-soft)}
        .capture-fab{width:60px;height:60px;border-radius:20px;background:var(--accent);color:#fff;font-size:26px;border:none;box-shadow:0 3px 10px rgba(103,83,199,.35);cursor:pointer;margin-top:-26px}
        .gesture-bar{height:22px;display:flex;align-items:center;justify-content:center}
        .gesture-bar::after{content:'';width:120px;height:4px;border-radius:999px;background:var(--line-strong)}
        .mini-timer{position:absolute;left:50%;transform:translateX(-50%);bottom:92px;display:flex;align-items:center;gap:10px;background:var(--snackbar);color:var(--ink-on-dark);border:none;border-radius:999px;padding:9px 18px;box-shadow:0 3px 10px rgba(32,25,20,.25);cursor:pointer}
        .mini-timer i{width:7px;height:7px;border-radius:999px;background:var(--accent-on-dark);animation:pulse 1.6s infinite}
        .mini-timer strong{font:600 13px 'JetBrains Mono',monospace}
        .phone-pair{display:flex;gap:32px;align-items:flex-start}
        .phone-frame{width:412px;height:917px;background:var(--canvas);border-radius:28px;overflow:hidden;display:flex;flex-direction:column;position:relative;border:1px solid var(--line);box-shadow:0 8px 30px rgba(32,25,20,.14)}
        .statusbar{display:flex;justify-content:space-between;align-items:center;padding:16px 24px 6px;font:600 13px 'Instrument Sans';flex:none}
        .statusbar span:last-child{font-size:11px;letter-spacing:.05em}
        .screen-header{padding:18px 20px 8px}
        .screen-header h2{font-family:'Source Serif 4',serif;font-size:32px;font-weight:600;margin:0}
        .screen-header p{margin:5px 0 0;font:500 11px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .phone-scroll{flex:1;overflow:hidden;display:flex;flex-direction:column}
        .section-heading{display:flex;justify-content:space-between;align-items:baseline;padding:12px 20px 4px;font:500 11px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .section-heading small{color:var(--placeholder);text-transform:none;letter-spacing:normal}
        .day-strip{display:flex;gap:6px;padding:2px 20px 12px}
        .day{flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 0;border-radius:12px;border:1px solid var(--line-soft);background:none;cursor:pointer;color:var(--ink)}
        .day b{font:500 10px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .day strong{font:600 15px 'Instrument Sans'}
        .day small{font-size:9px;color:var(--placeholder)}
        .day.selected{background:var(--ink);border-color:var(--ink)}
        .day.selected b,.day.selected strong,.day.selected small{color:var(--ink-on-dark)}
        .focus-content{flex:1;display:flex;flex-direction:column;align-items:center;padding:10px 24px 0;text-align:center}
        .wordmark{font-family:'Source Serif 4',serif;font-size:16px;color:var(--secondary)}
        .focus-meta{margin-top:34px;font:500 12px 'Instrument Sans';letter-spacing:.22em;text-transform:uppercase;color:var(--secondary)}
        .timer{font:500 92px/1 'JetBrains Mono',monospace;letter-spacing:-.02em;margin-top:14px}
        .live{display:flex;align-items:center;gap:7px;margin-top:14px;font:500 11px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--ink)}
        .live i{width:8px;height:8px;border-radius:999px;background:var(--ink);animation:pulse 1.6s infinite}
        .focus-task{margin-top:22px;font-size:15px}
        .focus-sub{margin-top:4px;font-size:11px;color:var(--secondary)}
        .progress{width:280px;height:3px;border-radius:999px;background:var(--line-soft);margin-top:24px;overflow:hidden}
        .progress span{display:block;width:26%;height:100%;background:var(--ink);border-radius:999px}
        .launch-pips{display:flex;gap:9px;margin-top:26px}
        .launch-pips i{width:11px;height:11px;border-radius:3px;border:1.5px solid var(--line-strong)}
        .launch-pips i.done{background:var(--ink);border-color:var(--ink)}
        .launch-pips i.current{background:var(--accent);border-color:var(--accent)}
        .stats-strip{display:flex;gap:34px;margin-top:30px}
        .stats-strip div{display:flex;flex-direction:column;gap:3px}
        .stats-strip small{font:500 10px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .stats-strip strong{font:600 15px 'Instrument Sans'}
        .holds{margin-top:22px;font-size:11px;color:var(--secondary)}
        .extend{display:flex;gap:10px;align-items:center;margin-top:26px}
        .extend small{font:500 10px 'Instrument Sans';letter-spacing:.08em;text-transform:uppercase;color:var(--secondary)}
        .extend button{border:1.5px solid var(--line-strong);background:none;border-radius:999px;font:600 12.5px 'Instrument Sans';padding:8px 16px;cursor:pointer;color:var(--ink)}
        .transport{display:flex;align-items:center;gap:36px;margin:auto 0 44px}
        .transport>button{width:52px;height:52px;border-radius:999px;border:1.5px solid var(--line-strong);background:none;color:var(--ink);font-size:18px;cursor:pointer}
        .transport .transport-fab{width:72px;height:72px;border-radius:26px;background:var(--accent);color:#fff;border:none;font-size:20px;box-shadow:0 5px 16px rgba(103,83,199,.4)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
        @media (max-width:760px){.gallery{padding:24px 14px 56px}.gallery-top{align-items:flex-start;flex-direction:column}.gallery-top h1{font-size:38px}.gallery-grid{grid-template-columns:1fr}.spec-card.wide{grid-column:auto}.phone-pair{flex-direction:column;overflow:auto;margin-right:-14px;padding-right:14px}.phone-frame{max-width:100%;height:min(917px,calc(100dvh - 150px));border-radius:${radii.lg}px}.timer{font-size:clamp(60px,22vw,92px)}.gallery-section{margin-bottom:28px}}
        @media (prefers-reduced-motion:reduce){.gallery *{transition:none!important;animation:none!important}}
      `}</style>
      <header className="gallery-top">
        <div>
          <p className="gallery-kicker">Design-system validation gallery</p>
          <h1>Warm Planning Desk</h1>
          <p>v2 primitives and key frames for screenshot critique before the native rebuild.</p>
        </div>
        <div className="theme-toggle">
          <button
            className={themeName === 'light' ? 'selected' : ''}
            type="button"
            onClick={() => setThemeName('light')}
          >
            Light
          </button>
          <button
            className={themeName === 'dark' ? 'selected' : ''}
            type="button"
            onClick={() => setThemeName('dark')}
          >
            Dark
          </button>
        </div>
      </header>

      <section className="gallery-section">
        <h2>Primitives</h2>
        <div className="gallery-grid">
          <article className="spec-card wide">
            <Label>Primary action · feedback states</Label>
            <PrimaryStates />
          </article>
          <article className="spec-card">
            <Label>Chips · outline / pressed / selected</Label>
            <div className="chip-row">
              <button className="demo-chip" type="button">
                Today
              </button>
              <button className="demo-chip pressed" type="button">
                Pressed
              </button>
              <button className="demo-chip selected" type="button">
                Selected
              </button>
              <GoalChip />
            </div>
          </article>
          <article className="spec-card">
            <Label>Toggle · priority</Label>
            <div className="state-row">
              <Toggle on={false} />
              <Toggle on />
              <PriorityDots />
            </div>
          </article>
          <article className="spec-card wide">
            <Label>Segmented underline tabs</Label>
            <div className="segmented">
              <button className="active" type="button">
                New task
              </button>
              <button type="button">New goal</button>
              <button type="button">Timeline</button>
            </div>
          </article>
          <article className="spec-card wide">
            <Label>Start focus · default / pressed / pending / failure</Label>
            <StartStates />
          </article>
          <article className="spec-card wide">
            <Label>Persistent failure + dark snackbars</Label>
            <Snackbars />
          </article>
        </div>
      </section>

      <section className="gallery-section">
        <h2>Composed</h2>
        <div className="gallery-grid">
          <article className="spec-card">
            <Label>Task rows · idle + running</Label>
            <TaskRow title="Write proposal" />
            <TaskRow title="Write proposal" running />
          </article>
          <article className="spec-card">
            <Label>Bottom nav · active pill + center FAB</Label>
            <div className="nav-demo">
              <BottomNav active="Tasks" />
            </div>
          </article>
          <article className="spec-card wide">
            <Label>Mini-timer chip</Label>
            <MiniTimer />
          </article>
        </div>
      </section>

      <section className="gallery-section">
        <h2>Key frames · 412px reference</h2>
        <div className="phone-pair">
          <div>
            <Label>1a · Tasks idle</Label>
            <TasksFrame />
          </div>
          <div>
            <Label>1e / 1f · Focus running (toggle theme for dark)</Label>
            <FocusFrame themeName={themeName} />
          </div>
        </div>
      </section>
    </div>
  );
}

export { Gallery };

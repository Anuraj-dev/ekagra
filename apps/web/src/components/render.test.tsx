import '../test/setup-dom';
import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import { color } from '../theme/tokens';
import { BlockMeter } from './BlockMeter';
import { GoalMark } from './GoalMark';
import { TimerRing } from './TimerRing';

afterEach(cleanup);

describe('GoalMark', () => {
  it('renders the goal name in its color', () => {
    render(<GoalMark color={color.goalMauve} name="Robotics Mission" />);
    const name = screen.getByText('Robotics Mission');
    expect(name).toBeTruthy();
    expect(name.style.color.toUpperCase()).toBe(color.goalMauve);
  });
});

describe('BlockMeter', () => {
  it('renders one segment per estimated block, earned first', () => {
    const { container } = render(<BlockMeter total={3} earned={2} color={color.goalBlue} />);
    const segments = container.querySelectorAll('span');
    expect(segments.length).toBe(3);
  });
});

describe('TimerRing', () => {
  it('shows tabular time and the running sub-label', () => {
    render(
      <TimerRing
        progress={0.46}
        status="running"
        phase="work"
        timeLabel="13:24"
        subLabel="Remaining"
      />,
    );
    expect(screen.getByText('13:24')).toBeTruthy();
    expect(screen.getByText('Remaining')).toBeTruthy();
  });

  it('dims the numerals when paused', () => {
    render(
      <TimerRing
        progress={0.46}
        status="paused"
        phase="work"
        timeLabel="13:24"
        subLabel="Paused"
      />,
    );
    const time = screen.getByText('13:24');
    // Paused numerals drop to --t3.
    expect(time.style.color.toUpperCase()).toBe(color.t3);
  });
});

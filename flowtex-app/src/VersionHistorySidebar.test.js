import { groupByDay } from './VersionHistorySidebar';

test('buckets versions by day, newest day first, labeling Today/Yesterday', () => {
  const now = new Date();
  const today9am = new Date(now); today9am.setHours(9, 0, 0, 0);
  const todayNoon = new Date(now); todayNoon.setHours(12, 0, 0, 0);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(10, 0, 0, 0);

  const versions = [
    { id: 1, created_at: yesterday.toISOString() },
    { id: 2, created_at: today9am.toISOString() },
    { id: 3, created_at: todayNoon.toISOString() },
  ];

  const groups = groupByDay(versions);

  expect(groups.map(g => g.label)).toEqual(['Today', 'Yesterday']);
  expect(groups[0].items.map(v => v.id)).toEqual([2, 3]);
  expect(groups[1].items.map(v => v.id)).toEqual([1]);
});

test('a day more than a day old gets a weekday/date label, not a raw diff count', () => {
  const old = new Date();
  old.setDate(old.getDate() - 5);
  const groups = groupByDay([{ id: 1, created_at: old.toISOString() }]);
  expect(groups[0].label).not.toBe('Today');
  expect(groups[0].label).not.toBe('Yesterday');
});

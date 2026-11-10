import { act, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() } },
}));
jest.mock('./Editor', () => () => <div>Document editor</div>);
jest.mock('./LandingPage', () => () => <div>Landing page</div>);
jest.mock('./Dashboard', () => () => <div>Signed in dashboard</div>);

let authChanged;
let unsubscribe;

beforeEach(() => {
  jest.useFakeTimers();
  unsubscribe = jest.fn();
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  supabase.auth.onAuthStateChange.mockImplementation(callback => {
    authChanged = callback;
    return { data: { subscription: { unsubscribe } } };
  });
});

afterEach(() => jest.useRealTimers());

test('shows progress while restoring the session instead of returning a blank page', () => {
  supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
  render(<App />);
  expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
});

test('shows an authentication error and retries without clearing the stored session', async () => {
  supabase.auth.getSession.mockRejectedValueOnce(new Error('Session refresh failed'));
  render(<App />);
  await act(async () => {});
  expect(screen.getByRole('alert')).toHaveTextContent('Session refresh failed');
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  expect(screen.getByText('Signed in dashboard')).toBeInTheDocument();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test('times out a hung session restore and ignores its stale result after retry', async () => {
  let finishOldRequest;
  supabase.auth.getSession.mockReturnValueOnce(new Promise(resolve => { finishOldRequest = resolve; }));
  render(<App />);
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent('took too long');
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  await act(async () => { finishOldRequest({ data: { session: null }, error: null }); });
  expect(screen.getByText('Signed in dashboard')).toBeInTheDocument();
});

test('an auth event recovers a stalled restore and takes precedence over its older result', async () => {
  let finishOldRequest;
  supabase.auth.getSession.mockReturnValue(new Promise(resolve => { finishOldRequest = resolve; }));
  render(<App />);
  await act(async () => { authChanged('SIGNED_IN', { user: { id: 'user' } }); });
  await act(async () => { finishOldRequest({ data: { session: null }, error: null }); });
  expect(screen.getByText('Signed in dashboard')).toBeInTheDocument();
});

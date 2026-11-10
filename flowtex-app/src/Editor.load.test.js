import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Editor from './Editor';
import EditorErrorBoundary from './EditorErrorBoundary';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select() { return this; },
      eq() { return this; },
      single: async () => ({ data: null, error: null }),
    }),
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
      send() {},
    }),
    removeChannel() {},
  },
}));

const content = {
  type: 'doc',
  content: [{ type: 'page', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Saved document content' }] }] }],
};

beforeEach(() => {
  jest.useFakeTimers();
  document.documentElement.dataset.theme = 'light';
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('opens a saved document in the actual editor', async () => {
  render(<Editor document={{ id: 'test-doc', title: 'Saved document', content }} />);
  await waitFor(() => expect(screen.getByDisplayValue('Saved document')).toBeInTheDocument());
  expect(screen.getByText('Saved document content')).toBeInTheDocument();
});

test('opens under StrictMode and removes the loading overlay', async () => {
  render(<React.StrictMode><Editor document={{ id: 'test-doc', title: 'Saved document', content }} /></React.StrictMode>);
  await act(async () => {});
  await act(async () => { jest.advanceTimersByTime(2000); });
  await act(async () => { jest.advanceTimersByTime(350); });
  expect(screen.queryByText('Preparing your editor…')).not.toBeInTheDocument();
  expect(screen.getByText('Saved document content')).toBeInTheDocument();
});

test.each(['getItem', 'setItem'])('opens when browser storage %s throws', async (method) => {
  jest.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException('Storage unavailable', method === 'getItem' ? 'SecurityError' : 'QuotaExceededError');
  });
  render(<Editor document={{ id: 'test-doc', title: 'Saved document', content }} />);
  await waitFor(() => expect(screen.getByDisplayValue('Saved document')).toBeInTheDocument());
  expect(screen.getByText('Saved document content')).toBeInTheDocument();
});

test('shows initialization errors and can retry opening the document', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(supabase, 'channel').mockImplementationOnce(() => { throw new Error('Connection failed'); });
  render(
    <EditorErrorBoundary onBack={() => {}}>
      <Editor document={{ id: 'test-doc', title: 'Saved document', content }} />
    </EditorErrorBoundary>
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection failed');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Saved document content')).toBeInTheDocument();
});

test('a stalled load times out and its late completion cannot reconnect after retry', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  let finishLoad;
  jest.spyOn(supabase, 'from').mockImplementationOnce(() => ({
    select() { return this; },
    eq() { return this; },
    single: () => new Promise(resolve => { finishLoad = resolve; }),
  }));
  const connect = jest.spyOn(supabase, 'channel');
  const onBack = jest.fn();
  render(
    <EditorErrorBoundary onBack={onBack}>
      <Editor document={{ id: 'test-doc', title: 'Saved document', content }} />
    </EditorErrorBoundary>
  );
  await act(async () => { jest.advanceTimersByTime(15000); });
  expect(screen.getByRole('alert')).toHaveTextContent('took too long to load');
  expect(connect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Back to documents' }));
  expect(onBack).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await act(async () => {});
  expect(screen.getByText('Saved document content')).toBeInTheDocument();
  await act(async () => { finishLoad({ data: null, error: null }); });
  expect(connect).toHaveBeenCalledTimes(1);
});

test('a render failure shows recovery controls instead of a blank page', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const BrokenEditor = () => { throw new Error('Unexpected editor error'); };
  render(<EditorErrorBoundary onBack={() => {}}><BrokenEditor /></EditorErrorBoundary>);
  expect(screen.getByRole('alert')).toHaveTextContent('Unexpected editor error');
  expect(screen.getByRole('button', { name: 'Back to documents' })).toBeInTheDocument();
});

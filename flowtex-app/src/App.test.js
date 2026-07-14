import { render, screen } from '@testing-library/react';
import App from './App';

// This was still the un-edited create-react-app boilerplate test (asserting
// on a "learn react" link that hasn't existed since the CRA placeholder was
// replaced with the real FlumenWrite landing page) — it never actually ran
// because the test environment couldn't even load the app until the jest
// config fixes above (module resolution, crypto/IntersectionObserver
// polyfills), so this never caught it landing at 0% coverage of the app.
test('renders the landing page', () => {
  render(<App />);
  expect(screen.getAllByText(/FlumenWorks/i).length).toBeGreaterThan(0);
});

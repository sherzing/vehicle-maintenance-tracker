# Testing Guide

This project uses **Vitest** and **React Testing Library** for testing.

## Running Tests

### Watch Mode (Default)
Tests run automatically when files change:
```bash
npm test
```

### Run Once
Run all tests once and exit:
```bash
npm test -- --run
```

### UI Mode
Interactive UI for exploring and debugging tests:
```bash
npm run test:ui
```

### Coverage Report
Generate test coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## Writing Tests

### Test File Naming
- Unit tests: `*.test.js` or `*.test.jsx`
- Place tests next to the files they test
- Example: `calculations.js` → `calculations.test.js`

### Utility Functions

Import testing utilities from `src/test/utils.jsx`:

```javascript
import { render, screen, userEvent } from './test/utils';
```

Available utilities:
- `render` - Render React components
- `renderWithRouter` - Render with React Router
- `screen` - Query rendered components
- `userEvent` - Simulate user interactions
- `mockUser`, `mockTeam`, `mockVehicle`, `mockMaintenanceItem` - Mock data

### Example: Testing a Component

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from './test/utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle clicks', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Example: Testing Utility Functions

```javascript
import { describe, it, expect } from 'vitest';
import { calculateRemainingUsage } from './calculations';

describe('calculateRemainingUsage', () => {
  it('should calculate correctly', () => {
    const result = calculateRemainingUsage(45000, 10000, 50000);
    expect(result).toBe(5000);
  });
});
```

## Current Test Coverage

### Unit Tests
- ✅ `utils/calculations.js` - Status calculation logic (17 tests)
  - Remaining usage calculation
  - Remaining time calculation
  - Status determination
  - 10% warning threshold
  - Never-serviced item handling

### Component Tests
- ✅ `App.jsx` - Main app component (4 tests)
  - Rendering
  - Navbar display
  - Welcome message

## Testing Strategy

### What to Test

**Always Test:**
- Business logic (calculations, validations)
- User interactions (clicks, form submissions)
- Conditional rendering
- Error states

**Don't Test:**
- Implementation details
- Third-party libraries (Firebase, Bootstrap)
- CSS styling (unless critical to functionality)

### Test Organization

```
src/
├── components/
│   └── vehicles/
│       ├── VehicleList.jsx
│       └── VehicleList.test.jsx      # Component tests
├── utils/
│   ├── calculations.js
│   └── calculations.test.js          # Unit tests
└── test/
    ├── setup.js                       # Test configuration
    └── utils.jsx                      # Test utilities & mocks
```

## Mocking Firebase

For components using Firebase, mock the Firebase modules:

```javascript
import { vi } from 'vitest';

vi.mock('../services/firebase/config', () => ({
  auth: {
    currentUser: { uid: 'test-user', email: 'test@example.com' }
  },
  db: {}
}));
```

## Debugging Tests

### Console Output
Tests run with full console output. Use `console.log()` to debug.

### UI Mode
Best for visual debugging:
```bash
npm run test:ui
```

### Focused Tests
Run specific tests:
```javascript
it.only('should test this specific case', () => {
  // Only this test will run
});
```

Skip tests:
```javascript
it.skip('should skip this test', () => {
  // This test will be skipped
});
```

## Continuous Integration

Tests should pass before:
- Committing code
- Creating pull requests
- Deploying to production

Add to your git pre-commit hook:
```bash
npm test -- --run
```

## Best Practices

1. **Test behavior, not implementation**
   - ✅ User sees error message
   - ❌ State variable is set to 'error'

2. **Use accessible queries**
   - Prefer `getByRole`, `getByLabelText`
   - Avoid `getByTestId` unless necessary

3. **Keep tests simple**
   - One assertion per test when possible
   - Descriptive test names

4. **Use async/await for user events**
   ```javascript
   const user = userEvent.setup();
   await user.click(button);
   ```

5. **Clean up after tests**
   - Automatic with React Testing Library
   - Manual cleanup in `afterEach` if needed

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Common Testing Patterns](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

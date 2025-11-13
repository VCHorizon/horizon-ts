import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import WelcomePage from '../app/welcome/page';
import { UsernameProvider, useUsername } from '../app/context/UsernameContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Welcome Room Page', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<UsernameProvider>{component}</UsernameProvider>);
  };

  test('renders the welcome page with username input field', () => {
    renderWithProvider(<WelcomePage />);
    
    expect(screen.getByText('Welcome to Horizon Chat')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter chat/i })).toBeInTheDocument();
  });

  test('renders continue button and guest button', () => {
    renderWithProvider(<WelcomePage />);
    
    expect(screen.getByRole('button', { name: /enter chat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue as guest/i })).toBeInTheDocument();
  });

  test('updates username input field when user types', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username') as HTMLInputElement;
    
    await user.type(input, 'TestUser');
    
    expect(input.value).toBe('TestUser');
  });

  test('validates username length - shows error for too short username', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username');
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    await user.type(input, 'a');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username must be at least 2 characters long')).toBeInTheDocument();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('allows valid username to proceed to chat', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username');
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    await user.type(input, 'ValidUser');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat');
    });
    
    expect(localStorageMock.getItem('chatUsername')).toBe('ValidUser');
  });

  test('generates default guest name when no username is provided', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat');
    });
    
    const storedUsername = localStorageMock.getItem('chatUsername');
    expect(storedUsername).toMatch(/^Guest\d{4}$/);
  });

  test('generates guest name when clicking "Continue as Guest" button', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const guestButton = screen.getByRole('button', { name: /continue as guest/i });
    
    await user.click(guestButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat');
    });
    
    const storedUsername = localStorageMock.getItem('chatUsername');
    expect(storedUsername).toMatch(/^Guest\d{4}$/);
  });

  test('clears error message when user starts typing', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username');
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    // First, trigger an error
    await user.type(input, 'a');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username must be at least 2 characters long')).toBeInTheDocument();
    });
    
    // Clear input and type again
    await user.clear(input);
    await user.type(input, 'b');
    
    // Error should be cleared
    expect(screen.queryByText('Username must be at least 2 characters long')).not.toBeInTheDocument();
  });

  test('trims whitespace from username', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username');
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    await user.type(input, '  TestUser  ');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat');
    });
    
    expect(localStorageMock.getItem('chatUsername')).toBe('TestUser');
  });

  test('validates maximum username length', async () => {
    const user = userEvent.setup();
    renderWithProvider(<WelcomePage />);
    
    const input = screen.getByPlaceholderText('Enter your username');
    const submitButton = screen.getByRole('button', { name: /enter chat/i });
    
    const longUsername = 'a'.repeat(21);
    await user.type(input, longUsername);
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Username must be less than 20 characters')).toBeInTheDocument();
    });
    
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('redirects to chat if username already exists in localStorage', async () => {
    localStorageMock.setItem('chatUsername', 'ExistingUser');
    
    renderWithProvider(<WelcomePage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/chat');
    });
  });
});

describe('Username Context', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('stores username in context and localStorage', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useUsername();
      return null;
    };
    
    render(
      <UsernameProvider>
        <TestComponent />
      </UsernameProvider>
    );
    
    contextValue.setUsername('TestUser');
    
    expect(contextValue.username).toBe('TestUser');
    expect(localStorageMock.getItem('chatUsername')).toBe('TestUser');
  });

  test('clears username from context and localStorage', () => {
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useUsername();
      return null;
    };
    
    render(
      <UsernameProvider>
        <TestComponent />
      </UsernameProvider>
    );
    
    contextValue.setUsername('TestUser');
    expect(contextValue.username).toBe('TestUser');
    
    contextValue.clearUsername();
    expect(contextValue.username).toBe(null);
    expect(localStorageMock.getItem('chatUsername')).toBe(null);
  });

  test('loads username from localStorage on mount', () => {
    localStorageMock.setItem('chatUsername', 'StoredUser');
    
    let contextValue: any;
    
    const TestComponent = () => {
      contextValue = useUsername();
      return <div>{contextValue.username}</div>;
    };
    
    render(
      <UsernameProvider>
        <TestComponent />
      </UsernameProvider>
    );
    
    expect(screen.getByText('StoredUser')).toBeInTheDocument();
  });
});

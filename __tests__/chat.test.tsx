import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ChatPage from '../app/chat/page';
import { UsernameProvider } from '../app/context/UsernameContext';
import { io } from 'socket.io-client';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock socket.io-client
jest.mock('socket.io-client');

const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

describe('Real-Time Chat Functionality', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (io as jest.Mock).mockReturnValue(mockSocket);
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'chatUsername') return 'TestUser';
      return null;
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<UsernameProvider>{component}</UsernameProvider>);
  };

  test('connects to WebSocket server on mount', async () => {
    renderWithProvider(<ChatPage />);
    
    await waitFor(() => {
      expect(io).toHaveBeenCalledWith(expect.stringContaining('localhost:3001'));
    });
  });

  test('sends user:joined event when connected', async () => {
    renderWithProvider(<ChatPage />);
    
    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('user:joined', { username: 'TestUser' });
    });
  });

  test('displays connection status indicator', async () => {
    renderWithProvider(<ChatPage />);
    
    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  test('sends chat message via WebSocket when form is submitted', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);
    
    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    await user.type(input, 'Hello World!');
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', 
        expect.objectContaining({
          username: 'TestUser',
          text: 'Hello World!',
          timestamp: expect.any(String)
        })
      );
    });
  });

  test('receives and displays chat messages from WebSocket', async () => {
    renderWithProvider(<ChatPage />);
    
    // Get the message handler
    const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:message')?.[1];
    
    // Simulate receiving a message
    if (messageHandler) {
      messageHandler({
        username: 'OtherUser',
        text: 'Hello from other user!',
        timestamp: new Date().toISOString()
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('Hello from other user!')).toBeInTheDocument();
      expect(screen.getByText('OtherUser')).toBeInTheDocument();
    });
  });

  test('displays message with timestamp', async () => {
    renderWithProvider(<ChatPage />);
    
    const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:message')?.[1];
    
    const testTime = new Date('2025-11-13T10:30:00');
    if (messageHandler) {
      messageHandler({
        username: 'TestUser',
        text: 'Test message',
        timestamp: testTime.toISOString()
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
      // Timestamp should be formatted as HH:MM
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });
  });

  test('shows system message when user joins', async () => {
    renderWithProvider(<ChatPage />);
    
    const userJoinedHandler = mockSocket.on.mock.calls.find(call => call[0] === 'user:joined')?.[1];
    
    if (userJoinedHandler) {
      userJoinedHandler({
        username: 'NewUser',
        timestamp: new Date().toISOString()
      });
    }
    
    await waitFor(() => {
      expect(screen.getByText('NewUser joined the chat')).toBeInTheDocument();
    });
  });

  test('clears input field after sending message', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);
    
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    
    const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement;
    
    await user.type(input, 'Test message');
    expect(input.value).toBe('Test message');
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  test('disables send button when not connected', async () => {
    mockSocket.connected = false;
    renderWithProvider(<ChatPage />);
    
    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  test('disables input when not connected', async () => {
    mockSocket.connected = false;
    renderWithProvider(<ChatPage />);
    
    // Simulate disconnection
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
    if (disconnectHandler) {
      disconnectHandler();
    }
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/connecting/i);
      expect(input).toBeDisabled();
    });
  });

  test('disconnects from WebSocket when component unmounts', () => {
    const { unmount } = renderWithProvider(<ChatPage />);
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  test('disconnects from WebSocket when logging out', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);
    
    const logoutButton = screen.getByRole('button', { name: /change username/i });
    await user.click(logoutButton);
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/welcome');
  });

  test('handles Enter key to send message', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);
    
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    
    const input = screen.getByPlaceholderText(/type your message/i);
    
    await user.type(input, 'Test message{Enter}');
    
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', 
        expect.objectContaining({
          text: 'Test message'
        })
      );
    });
  });

  test('displays multiple messages in correct order', async () => {
    renderWithProvider(<ChatPage />);
    
    const messageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat:message')?.[1];
    
    if (messageHandler) {
      messageHandler({
        username: 'User1',
        text: 'First message',
        timestamp: new Date('2025-11-13T10:00:00').toISOString()
      });
      
      messageHandler({
        username: 'User2',
        text: 'Second message',
        timestamp: new Date('2025-11-13T10:01:00').toISOString()
      });
      
      messageHandler({
        username: 'User1',
        text: 'Third message',
        timestamp: new Date('2025-11-13T10:02:00').toISOString()
      });
    }
    
    await waitFor(() => {
      const messages = screen.getAllByText(/message/i);
      expect(messages).toHaveLength(3);
    });
  });

  test('redirects to welcome page if no username', () => {
    Storage.prototype.getItem = jest.fn(() => null);
    
    renderWithProvider(<ChatPage />);
    
    expect(mockPush).toHaveBeenCalledWith('/welcome');
  });
});

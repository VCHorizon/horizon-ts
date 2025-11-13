import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPage from '../app/chat/page';
import { UsernameProvider } from '../app/context/UsernameContext';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Socket.IO client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return {
    io: jest.fn(() => mockSocket),
  };
});

const mockRouter = {
  push: jest.fn(),
};

const renderWithProvider = (component: React.ReactElement, initialUsername = 'TestUser') => {
  // Set username in localStorage
  localStorage.setItem('chatUsername', initialUsername);

  (useRouter as jest.Mock).mockReturnValue(mockRouter);

  return render(
    <UsernameProvider>
      {component}
    </UsernameProvider>
  );
};

describe('Message Reactions Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('reaction buttons are displayed for each message', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    // Get socket mock
    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Check that reaction buttons are present
    const reactionButtons = screen.getAllByRole('button');
    const emojiButtons = reactionButtons.filter(btn => 
      ['👍', '❤️', '😂', '🎉'].includes(btn.textContent || '')
    );
    expect(emojiButtons.length).toBeGreaterThan(0);
  });

  test('clicking a reaction emoji sends reaction event', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Click thumbs up reaction
    const thumbsUpButton = screen.getAllByRole('button').find(
      btn => btn.textContent === '👍'
    );
    expect(thumbsUpButton).toBeDefined();
    if (thumbsUpButton) {
      await user.click(thumbsUpButton);
    }

    // Verify reaction event was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:reaction', {
      messageId: 'msg-1',
      emoji: '👍',
      username: 'TestUser',
    });
  });

  test('reaction counts update correctly', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Simulate reaction update from server
    const onReactionUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:reaction:update'
    )?.[1];

    if (onReactionUpdate) {
      onReactionUpdate({
        messageId: 'msg-1',
        reactions: [
          { emoji: '👍', users: ['User1', 'User2', 'User3'] },
        ],
      });
    }

    await waitFor(() => {
      const reactionButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('👍') && btn.textContent?.includes('3')
      );
      expect(reactionButton).toBeInTheDocument();
    });
  });

  test('user can toggle their reaction on and off', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Add reaction
    const thumbsUpButton = screen.getAllByRole('button').find(
      btn => btn.textContent === '👍'
    );
    if (thumbsUpButton) {
      await user.click(thumbsUpButton);
    }

    // Simulate server adding reaction
    const onReactionUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:reaction:update'
    )?.[1];

    if (onReactionUpdate) {
      onReactionUpdate({
        messageId: 'msg-1',
        reactions: [{ emoji: '👍', users: ['TestUser'] }],
      });
    }

    await waitFor(() => {
      const reactionWithCount = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('👍') && btn.textContent?.includes('1')
      );
      expect(reactionWithCount).toBeInTheDocument();
    });

    // Click again to remove
    const reactionButton = screen.getAllByRole('button').find(
      btn => btn.textContent?.includes('👍') && btn.textContent?.includes('1')
    );
    if (reactionButton) {
      await user.click(reactionButton);
    }

    // Verify remove event was sent
    expect(mockSocket.emit).toHaveBeenCalledWith('message:reaction', {
      messageId: 'msg-1',
      emoji: '👍',
      username: 'TestUser',
    });
  });

  test('multiple different emojis can be reacted to on the same message', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Simulate multiple reactions
    const onReactionUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:reaction:update'
    )?.[1];

    if (onReactionUpdate) {
      onReactionUpdate({
        messageId: 'msg-1',
        reactions: [
          { emoji: '👍', users: ['User1', 'User2'] },
          { emoji: '❤️', users: ['User3'] },
          { emoji: '😂', users: ['User4', 'User5'] },
        ],
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/👍.*2/)).toBeInTheDocument();
      expect(screen.getByText(/❤️.*1/)).toBeInTheDocument();
      expect(screen.getByText(/😂.*2/)).toBeInTheDocument();
    });
  });

  test('user reactions are highlighted differently', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving a message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Test message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    // Simulate reaction with current user
    const onReactionUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:reaction:update'
    )?.[1];

    if (onReactionUpdate) {
      onReactionUpdate({
        messageId: 'msg-1',
        reactions: [
          { emoji: '👍', users: ['TestUser', 'OtherUser'] },
          { emoji: '❤️', users: ['OtherUser'] },
        ],
      });
    }

    await waitFor(() => {
      const thumbsButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('👍') && btn.textContent?.includes('2')
      );
      const heartButton = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('❤️') && btn.textContent?.includes('1')
      );

      expect(thumbsButton).toBeInTheDocument();
      expect(heartButton).toBeInTheDocument();

      // User's reaction should have different styling (indigo background)
      if (thumbsButton) {
        expect(thumbsButton.className).toContain('indigo');
      }
      if (heartButton) {
        expect(heartButton.className).not.toContain('indigo');
      }
    });
  });

  test('system messages do not show reaction buttons', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate system message
    const onUserJoined = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'user:joined'
    )?.[1];

    if (onUserJoined) {
      onUserJoined({
        username: 'NewUser',
        timestamp: new Date().toISOString(),
      });
    }

    await waitFor(() => {
      expect(screen.getByText(/NewUser joined the chat/)).toBeInTheDocument();
    });

    // System messages should not have reaction emojis visible near them
    const systemMessage = screen.getByText(/NewUser joined the chat/);
    const parentDiv = systemMessage.closest('.flex');
    
    // Check that there are no emoji reaction buttons in the system message area
    if (parentDiv) {
      const buttons = parentDiv.querySelectorAll('button');
      const emojiButtons = Array.from(buttons).filter(btn => 
        ['👍', '❤️', '😂', '🎉'].includes(btn.textContent || '')
      );
      expect(emojiButtons.length).toBe(0);
    }
  });
});

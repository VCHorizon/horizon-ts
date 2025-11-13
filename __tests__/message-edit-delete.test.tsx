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
  localStorage.setItem('chatUsername', initialUsername);
  (useRouter as jest.Mock).mockReturnValue(mockRouter);

  return render(
    <UsernameProvider>
      {component}
    </UsernameProvider>
  );
};

describe('Message Edit and Delete Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
  });

  test('edit button appears for user own messages', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving own message
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'My message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('My message')).toBeInTheDocument();
    });

    // Edit button should be present (look for the emoji)
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    expect(editButton).toBeDefined();
  });

  test('edit button does not appear for other users messages', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    // Simulate receiving message from another user
    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'OtherUser',
        text: 'Other user message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Other user message')).toBeInTheDocument();
    });

    // Edit button should not be present for other users
    const buttons = screen.getAllByRole('button');
    const editButtons = buttons.filter(btn => btn.textContent === '✏️');
    expect(editButtons.length).toBe(0);
  });

  test('clicking edit button shows inline edit input', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Click edit button
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    if (editButton) {
      await user.click(editButton);
    }

    // Input field should appear with the original message
    await waitFor(() => {
      const input = screen.getByDisplayValue('Original message');
      expect(input).toBeInTheDocument();
    });
  });

  test('saving edited message sends edit event', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Click edit
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    if (editButton) {
      await user.click(editButton);
    }

    // Change text
    const input = await screen.findByDisplayValue('Original message');
    await user.clear(input);
    await user.type(input, 'Updated message');

    // Click save
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Verify edit event was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:edit', {
      messageId: 'msg-1',
      newText: 'Updated message',
      username: 'TestUser',
    });
  });

  test('edited messages display edited indicator', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Simulate edit update from server
    const onEditUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:edit:update'
    )?.[1];

    if (onEditUpdate) {
      onEditUpdate({
        messageId: 'msg-1',
        newText: 'Updated message',
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Updated message')).toBeInTheDocument();
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });
  });

  test('delete button shows confirmation and sends delete event', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Message to delete',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Message to delete')).toBeInTheDocument();
    });

    // Click delete button
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(btn => btn.textContent === '🗑️');
    if (deleteButton) {
      await user.click(deleteButton);
    }

    // Verify confirmation was called
    expect(global.confirm).toHaveBeenCalled();

    // Verify delete event was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:delete', {
      messageId: 'msg-1',
      username: 'TestUser',
    });
  });

  test('deleted messages are removed from UI', async () => {
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Message to delete',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Message to delete')).toBeInTheDocument();
    });

    // Simulate delete update from server
    const onDeleteUpdate = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'message:delete:update'
    )?.[1];

    if (onDeleteUpdate) {
      onDeleteUpdate({
        messageId: 'msg-1',
      });
    }

    await waitFor(() => {
      expect(screen.queryByText('Message to delete')).not.toBeInTheDocument();
    });
  });

  test('cancel button closes edit mode without saving', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Click edit
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    if (editButton) {
      await user.click(editButton);
    }

    // Change text
    const input = await screen.findByDisplayValue('Original message');
    await user.clear(input);
    await user.type(input, 'Changed text');

    // Click cancel
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Original message should still be there
    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Changed text')).not.toBeInTheDocument();
    });

    // No edit event should have been emitted
    expect(mockSocket.emit).not.toHaveBeenCalledWith('message:edit', expect.anything());
  });

  test('pressing Enter in edit input saves the edit', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Click edit
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    if (editButton) {
      await user.click(editButton);
    }

    // Change text and press Enter
    const input = await screen.findByDisplayValue('Original message');
    await user.clear(input);
    await user.type(input, 'Updated via Enter{Enter}');

    // Verify edit event was emitted
    expect(mockSocket.emit).toHaveBeenCalledWith('message:edit', {
      messageId: 'msg-1',
      newText: 'Updated via Enter',
      username: 'TestUser',
    });
  });

  test('pressing Escape in edit input cancels the edit', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const { io } = require('socket.io-client');
    const mockSocket = io();

    const onChatMessage = mockSocket.on.mock.calls.find(
      (call: string[]) => call[0] === 'chat:message'
    )?.[1];

    if (onChatMessage) {
      onChatMessage({
        id: 'msg-1',
        username: 'TestUser',
        text: 'Original message',
        timestamp: new Date().toISOString(),
        reactions: [],
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // Click edit
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(btn => btn.textContent === '✏️');
    if (editButton) {
      await user.click(editButton);
    }

    // Change text and press Escape
    const input = await screen.findByDisplayValue('Original message');
    await user.clear(input);
    await user.type(input, 'Changed{Escape}');

    // Original message should still be there
    await waitFor(() => {
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    // No edit event should have been emitted
    expect(mockSocket.emit).not.toHaveBeenCalledWith('message:edit', expect.anything());
  });
});

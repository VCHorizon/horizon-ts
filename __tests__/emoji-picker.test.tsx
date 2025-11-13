import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import ChatPage from '../app/chat/page';
import { UsernameProvider } from '../app/context/UsernameContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('Emoji Picker Feature', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'chatUsername') return 'TestUser';
      return null;
    });
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(<UsernameProvider>{component}</UsernameProvider>);
  };

  test('emoji picker icon is visible next to message input', () => {
    renderWithProvider(<ChatPage />);

    const emojiButton = screen.getByLabelText(/add emoji/i);
    expect(emojiButton).toBeInTheDocument();
  });

  test('clicking emoji icon opens emoji picker', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const emojiButton = screen.getByLabelText(/add emoji/i);
    await user.click(emojiButton);

    await waitFor(() => {
      expect(screen.getByText('Smileys')).toBeInTheDocument();
    });
  });

  test('clicking emoji icon again closes emoji picker', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const emojiButton = screen.getByLabelText(/add emoji/i);
    
    // Open picker
    await user.click(emojiButton);
    await waitFor(() => {
      expect(screen.getByText('Smileys')).toBeInTheDocument();
    });

    // Close picker
    await user.click(emojiButton);
    await waitFor(() => {
      expect(screen.queryByText('Smileys')).not.toBeInTheDocument();
    });
  });

  test('selecting an emoji inserts it into the message input', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement;
    const emojiButton = screen.getByLabelText(/add emoji/i);

    // Open picker
    await user.click(emojiButton);
    expect(screen.getByText('Smileys')).toBeInTheDocument();

    // Select emoji - find button containing emoji
    const emojiButtons = screen.getAllByRole('button');
    const smileButton = emojiButtons.find(btn => btn.textContent === '😀');
    expect(smileButton).toBeDefined();
    if (smileButton) await user.click(smileButton);

    expect(input.value).toBe('😀');
  });

  test('multiple emojis can be added without overwriting text', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement;
    const emojiButton = screen.getByLabelText(/add emoji/i);

    // Type some text
    await user.type(input, 'Hello ');

    // Add first emoji
    await user.click(emojiButton);
    const emojiButtons1 = screen.getAllByRole('button');
    const smileButton = emojiButtons1.find(btn => btn.textContent === '😀');
    if (smileButton) await user.click(smileButton);

    // Type more text
    await user.type(input, ' World ');

    // Add second emoji
    await user.click(emojiButton);
    const emojiButtons2 = screen.getAllByRole('button');
    const heartButton = emojiButtons2.find(btn => btn.textContent === '❤️');
    if (heartButton) await user.click(heartButton);

    expect(input.value).toContain('Hello');
    expect(input.value).toContain('😀');
    expect(input.value).toContain('World');
    expect(input.value).toContain('❤️');
  });

  test('emoji picker closes after selecting an emoji', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const emojiButton = screen.getByLabelText(/add emoji/i);

    // Open picker
    await user.click(emojiButton);
    expect(screen.getByText('Smileys')).toBeInTheDocument();

    // Select emoji
    const emojiButtons = screen.getAllByRole('button');
    const smileButton = emojiButtons.find(btn => btn.textContent === '😀');
    if (smileButton) await user.click(smileButton);

    // Picker should close
    await waitFor(() => {
      expect(screen.queryByText('Smileys')).not.toBeInTheDocument();
    });
  });

  test('emoji is inserted at cursor position', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const input = screen.getByPlaceholderText(/type your message/i) as HTMLInputElement;
    const emojiButton = screen.getByLabelText(/add emoji/i);

    // Type text
    await user.type(input, 'Hello World');

    // Move cursor to middle (after "Hello ")
    input.setSelectionRange(6, 6);

    // Add emoji
    await user.click(emojiButton);
    await user.click(screen.getByText('👍'));

    expect(input.value).toBe('Hello 👍World');
  });

  test('messages containing emojis are displayed correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const emojiButton = screen.getByLabelText(/add emoji/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    // Type and add emoji
    await user.type(input, 'Great job ');
    await user.click(emojiButton);
    await user.click(screen.getByText('👍'));

    // Send message
    await user.click(sendButton);

    // Check message appears with emoji
    await waitFor(() => {
      expect(screen.getByText(/Great job 👍/)).toBeInTheDocument();
    });
  });

  test('emoji button remains accessible while typing', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatPage />);

    const input = screen.getByPlaceholderText(/type your message/i);
    const emojiButton = screen.getByLabelText(/add emoji/i);

    // Type some text
    await user.type(input, 'Test message');

    // Emoji button should still be clickable
    expect(emojiButton).toBeInTheDocument();
    expect(emojiButton).not.toBeDisabled();
  });
});

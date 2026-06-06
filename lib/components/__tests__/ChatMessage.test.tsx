import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';

const mockMessage = {
  role: 'user' as const,
  content: 'Hello, how are you?',
};

const mockAssistantMessage = {
  role: 'assistant' as const,
  content: 'I am doing well, thank you for asking!',
};

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const { container } = render(<ChatMessage message={mockMessage} />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();

    const messageBubble = container.querySelector('.bg-\\[\\#3B82F6\\]');
    expect(messageBubble).toBeInTheDocument();
    expect(messageBubble).toHaveClass('text-white');
  });

  it('renders assistant message correctly', () => {
    const { container } = render(<ChatMessage message={mockAssistantMessage} />);

    expect(screen.getByText('I am doing well, thank you for asking!')).toBeInTheDocument();

    const messageBubble = container.querySelector('.bg-\\[\\#F1F5F9\\]');
    expect(messageBubble).toBeInTheDocument();
    expect(messageBubble).toHaveClass('border');
  });

  it('applies correct alignment for user messages', () => {
    const { container } = render(<ChatMessage message={mockMessage} />);

    const messageContainer = container.firstChild;
    expect(messageContainer).toHaveClass('justify-end');
  });

  it('applies correct alignment for assistant messages', () => {
    const { container } = render(<ChatMessage message={mockAssistantMessage} />);

    const messageContainer = container.firstChild;
    expect(messageContainer).toHaveClass('justify-start');
  });

  it('shows loading indicator for last assistant message when isLast is true', () => {
    const { container } = render(<ChatMessage message={mockAssistantMessage} isLast={true} />);

    expect(screen.getByText('I am doing well, thank you for asking!')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    const emptyMessage = { role: 'user' as const, content: '' };
    const { container } = render(<ChatMessage message={emptyMessage} />);

    // Should render the component structure even with empty content
    const messageContainer = container.firstChild;
    expect(messageContainer).toBeInTheDocument();
    expect(messageContainer).toHaveClass('justify-end');
  });

  it('handles long messages with proper text wrapping', () => {
    const longMessage = {
      role: 'assistant' as const,
      content: 'This is a very long message that should wrap properly and not overflow the container with lots of text content.',
    };

    const { container } = render(<ChatMessage message={longMessage} />);

    // Find the text content div
    const textContent = container.querySelector('.whitespace-pre-wrap');
    expect(textContent).toBeInTheDocument();
    expect(textContent).toHaveClass('break-words');
  });
});

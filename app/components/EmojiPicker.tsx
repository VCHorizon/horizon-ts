"use client";

import { useEffect, useRef } from 'react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'Objects': ['💬', '💭', '🗨️', '💡', '⭐', '🌟', '✨', '⚡', '🔥', '💯', '✅', '❌', '⚠️', '🎉', '🎊', '🎈', '🎁', '🏆'],
};

export default function EmojiPicker({ onEmojiSelect, isOpen, onClose, buttonRef }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePicker = pickerRef.current?.contains(target);
      const clickedButton = buttonRef?.current?.contains(target);
      
      if (!clickedInsidePicker && !clickedButton) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-full mb-2 right-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80"
    >
      <div className="p-2 max-h-96 overflow-y-auto">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category} className="mb-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">
              {category}
            </h3>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onEmojiSelect(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

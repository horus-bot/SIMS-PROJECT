import React from 'react';

interface AvatarProps {
  size?: number;
  alt?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  alt = 'User Avatar',
  className = ''
}) => {
  return (
    <div
      className={`avatar-container ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid #e1e5e9',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        display: 'inline-block',
        flexShrink: 0
      }}
    >
      <img
        src="/avatar.png"
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        onError={(e) => {
          // Fallback to a default avatar or placeholder
          const target = e.target as HTMLImageElement;
          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcuNzYxNCAyMCAyMCAyMFoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTMwIDI4QzMwIDI0LjY4NjMgMjYuNDI3MSAyMiAyMiAyMkgxOEMxMy41NzI5IDIyIDEwIDI0LjY4NjMgMTAgMjhWMzBIMzBWMjhaIiBmaWxsPSIjOUNBNEFGIi8+Cjwvc3ZnPgo=';
        }}
      />
    </div>
  );
};

export default Avatar;
import React from 'react';

// Props 타입을 명확히 정의
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SearchModal({ isOpen, onClose, children }: SearchModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-gray-200 rounded-lg shadow-lg w-11/12 max-w-7xl h-full p-6 relative"> 
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          X
        </button>
        <div className="h-full overflow-y-auto"> {/* 스크롤 가능한 영역 */}
          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function SearchPanel({ isOpen, onClose, children }) {
  return (
    <div className={`fixed right-0 top-0 h-full bg-gray-200 shadow-lg transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 w-1/3`}>
      <button onClick={onClose} className="text-black p-4">Close</button>
      <div className="p-6">{children}</div>
    </div>
  );
}

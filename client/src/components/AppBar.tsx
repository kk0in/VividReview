'use client'

import React, { useState } from 'react'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline' // 여전히 Mobile 메뉴용으로 사용
import { FaPencilAlt, FaEraser, FaThLarge, FaSpinner, FaHighlighter, FaUndo, FaRedo, FaSearch, FaMicrophone } from 'react-icons/fa'; // react-icons에서 FontAwesome 아이콘들을 가져옵니다.
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Projects', href: '/projects' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function AppBar() {
  const pathname = usePathname()
  const isViewerPage = pathname.startsWith('/viewer/');

  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [temporaryActiveIcons, setTemporaryActiveIcons] = useState<Set<string>>(new Set());
  const [microphoneActive, setMicrophoneActive] = useState<boolean>(false);

  const handleIconClick = (iconName: string) => {
    if (activeIcon === iconName) {
      setActiveIcon(null);
    } else {
      setActiveIcon(iconName);
    }
  };

  const handleTemporaryActivation = (iconName: string) => {
    setTemporaryActiveIcons(prevActiveIcons => {
      const newActiveIcons = new Set(prevActiveIcons);
      newActiveIcons.add(iconName);
      return newActiveIcons;
    });
    setTimeout(() => {
      setTemporaryActiveIcons(prevActiveIcons => {
        const newActiveIcons = new Set(prevActiveIcons);
        newActiveIcons.delete(iconName);
        return newActiveIcons;
      });
    }, 500); // 원하는 시간 (밀리초) 동안 아이콘이 활성화된 상태 유지
  };

  const handleMicrophoneClick = () => {
    setMicrophoneActive(!microphoneActive);
  };

  const icons = [
    { name: 'pencil', icon: FaPencilAlt },
    { name: 'highlighter', icon: FaHighlighter },
    { name: 'eraser', icon: FaEraser },
    { name: 'spinner', icon: FaSpinner },
  ];

  const temporaryIcons = [
    { name: 'undo', icon: FaUndo },
    { name: 'redo', icon: FaRedo },
    { name: 'search', icon: FaSearch },
  ];

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            {/* Mobile menu button here */}
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center text-white font-bold">
              VividReview
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={classNames(
                      pathname === item.href ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium'
                    )}
                    aria-current={pathname === item.href ? 'page' : undefined}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          {isViewerPage && (
            <div className="flex space-x-4">
              {icons.map(({ name, icon: Icon }) => (
                <Icon
                  key={name}
                  className={classNames(
                    'h-6 w-6 cursor-pointer transition-colors duration-300',
                    activeIcon === name ? 'text-yellow-500' : 'text-white'
                  )}
                  onClick={() => handleIconClick(name)}
                />
              ))}
              {temporaryIcons.map(({ name, icon: Icon }) => (
                <Icon
                  key={name}
                  className={classNames(
                    'h-6 w-6 cursor-pointer transition-colors duration-300',
                    temporaryActiveIcons.has(name) ? 'text-yellow-500' : 'text-white'
                  )}
                  onClick={() => handleTemporaryActivation(name)}
                />
              ))}
              <FaMicrophone
                className={classNames(
                  'h-6 w-6 cursor-pointer transition-colors duration-300',
                  microphoneActive ? 'text-yellow-500' : 'text-white'
                )}
                onClick={handleMicrophoneClick}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
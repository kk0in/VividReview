'use client'

import React, { useState } from 'react';
import { useRecoilState, useSetRecoilState, useRecoilValue } from 'recoil';
import {
  FaPencilAlt,
  FaEraser,
  FaThLarge,
  FaSpinner,
  FaHighlighter,
  FaUndo,
  FaRedo,
  FaSearch,
  FaMicrophone,
  FaPlay,
  FaStepForward,
  FaStepBackward,
  FaPause
} from 'react-icons/fa';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { toolState, recordingState, gridModeState } from '@/app/recoil/ToolState';
import { historyState, redoStackState } from '@/app/recoil/HistoryState';
import { Player, playerState, audioTimeState, audioDurationState } from '@/app/recoil/LectureAudioState';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Projects', href: '/projects' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function ReviewAppBar() {
  const [ lecturePlayerState, setLecturePlayer ] = useRecoilState(playerState);
  const setAudioTime = useSetRecoilState(audioTimeState);
  const audioDuration = useRecoilValue(audioDurationState);

  const handleBackward = () => {
    setAudioTime((prev) => prev >= 5 ? prev - 5 : 0);
  };

  const handlePlay = () => {
    setLecturePlayer(Player.PLAY);
  };

  const handlePause = () => {
    setLecturePlayer(Player.PAUSE);
  };

  const handleForward = () => {
    setAudioTime((prev) => prev + 5 <= audioDuration ? prev + 5 : audioDuration);
  };

  const icons = [
    { name: 'backward', icon: FaStepBackward, action: handleBackward },
    (lecturePlayerState === Player.PAUSE ?
      { name: 'play', icon: FaPlay, action: handlePlay } :
      { name: 'pause', icon: FaPause, action: handlePause }
    ),
    { name: 'forward', icon: FaStepForward, action: handleForward },
  ];

  return (
    <div className="flex justify-end space-x-4 w-1/5 border-l-4 ml-4 border-dotted border-white-100">
      {icons.map(({ name, icon: Icon, action }) => {
        return (
          <Icon
            key={name}
            className={'h-6 w-6 cursor-pointer transition-colors duration-300 text-white'}
            onClick={action}
          />
        );
      })}
    </div>
  );
}

export default function AppBar() {
  const pathname = usePathname();
  const isViewerPage = pathname.startsWith('/viewer/');
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [temporaryActiveIcons, setTemporaryActiveIcons] = useState<Set<string>>(new Set());
  const [selectedTool, setSelectedTool] = useRecoilState(toolState);
  const [isRecording, setIsRecording] = useRecoilState(recordingState);
  const [history, setHistory] = useRecoilState(historyState);
  const [redoStack, setRedoStack] = useRecoilState(redoStackState);
  const [gridMode, setGridMode] = useRecoilState(gridModeState);
  const isReviewMode = useSearchParams().get('mode') === 'review';

  const handleGridIconClick = (tool: string) => {
    switch (gridMode) {
      case 0:
        setActiveIcon('grid');
        setSelectedTool(tool);
        setGridMode(1);
        break;
      case 1:
        setGridMode(2);
        break;
      case 2:
        setSelectedTool(null);
        setActiveIcon(null);
        setGridMode(0);
        break;
    }
  }

  const handleIconClick = (iconName: string, tool: string) => {
    if (activeIcon === iconName) {
      // console.log('selectedTool', selectedTool);
      setActiveIcon(null);
      setSelectedTool(null);
    } else {
      setActiveIcon(iconName);
      setSelectedTool(tool);
      setGridMode(0);
    }
  };

  const handleTemporaryActivation = (iconName: string, action?: () => void) => {
    setTemporaryActiveIcons(prevActiveIcons => {
      const newActiveIcons = new Set(prevActiveIcons);
      newActiveIcons.add(iconName);
      return newActiveIcons;
    });
    if (action) {
      // console.log('action', action);
      action();
    }
    setTimeout(() => {
      setTemporaryActiveIcons(prevActiveIcons => {
        const newActiveIcons = new Set(prevActiveIcons);
        newActiveIcons.delete(iconName);
        return newActiveIcons;
      });
    }, 500);
  };

  const handleMicToggle = () => {
    // console.log('isRecording', isRecording);
    setIsRecording(!isRecording);
  };

  const handleUndo = () => {
    console.log('history', history);
    if (history.length === 0) return;
    const previous = history[history.length - 2];
    console.log(previous);
    setRedoStack((prev) => [...prev, history[history.length-1]]);
    setHistory((prev) => prev.slice(0, -1));
    const event = new CustomEvent('undoCanvas', { detail: previous });
    window.dispatchEvent(event);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));
    const event = new CustomEvent('redoCanvas', { detail: next });
    window.dispatchEvent(event);
  };

  const icons = [
    { name: 'pencil', icon: FaPencilAlt, tool: 'pencil' },
    { name: 'highlighter', icon: FaHighlighter, tool: 'highlighter' },
    { name: 'eraser', icon: FaEraser, tool: 'eraser' },
    { name: 'spinner', icon: FaSpinner, tool: 'spinner' },
    { name: 'grid', icon: FaThLarge, tool: 'grid' },
  ];

  const temporaryIcons = [
    { name: 'undo', icon: FaUndo, action: handleUndo },
    { name: 'redo', icon: FaRedo, action: handleRedo },
    { name: 'search', icon: FaSearch },
  ];

  return (
    <nav className="bg-gray-800">
      <div className="mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
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
              {icons.map(({ name, icon: Icon, tool }) => {
                if (name === 'grid') {
                  return (
                    <Icon
                      key={name}
                      className={classNames(
                        'h-6 w-6 cursor-pointer transition-colors duration-300',
                        gridMode === 2 ? 'text-red-500' : gridMode === 1 ? 'text-yellow-500' : 'text-white'
                      )}
                      onClick={() => handleGridIconClick(tool)}
                    />
                  );
                }

                return (
                  <Icon
                    key={name}
                    className={classNames(
                      'h-6 w-6 cursor-pointer transition-colors duration-300',
                      activeIcon === name ? 'text-yellow-500' : 'text-white'
                    )}
                    onClick={() => handleIconClick(name, tool)}
                  />
                );
              })}
              {temporaryIcons.map(({ name, icon: Icon, action }) => (
                <Icon
                  key={name}
                  className={classNames(
                    'h-6 w-6 cursor-pointer transition-colors duration-300',
                    temporaryActiveIcons.has(name) ? 'text-yellow-500' : 'text-white'
                  )}
                  onClick={() => handleTemporaryActivation(name, action)}
                />
              ))}
              <FaMicrophone
                className={classNames(
                  'h-6 w-6 cursor-pointer transition-colors duration-300',
                  isRecording ? 'text-yellow-500' : 'text-white'
                )}
                onClick={handleMicToggle}
              />
            </div>
          )}
          {
            (isViewerPage && isReviewMode && <ReviewAppBar />)
          }
        </div>
      </div>
    </nav>
  );
}

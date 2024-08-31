'use client'

import React, { useEffect, useState } from 'react';
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
import { toolState, recordingState, gridModeState, searchQueryState, inputTextState, searchTypeState } from '@/app/recoil/ToolState';
import { historyState, redoStackState } from '@/app/recoil/HistoryState';
import { PlayerStateType, playerState, playerRequestState, PlayerRequestType } from '@/app/recoil/LectureAudioState';
import { pdfPageState } from '@/app/recoil/ViewerState';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Projects', href: '/projects' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function ReviewAppBar() {
  const [ lecturePlayerState, setLecturePlayer ] = useRecoilState(playerState);
  const setPlayerRequest = useSetRecoilState(playerRequestState);
  const [ activeIndex, setActiveIndex ] = useState<number>(-2);

  const activeIcon = (index: number) => {
    setActiveIndex(index);
    setTimeout(() => {
      setActiveIndex(-2);
    }, 500);
  }

  const handleBackward = () => {
    setPlayerRequest(PlayerRequestType.BACKWARD);
    activeIcon(0);
  };

  const handlePlay = () => {
    setLecturePlayer(PlayerStateType.PLAYING);
    activeIcon(1);
  };

  const handlePause = () => {
    setLecturePlayer(PlayerStateType.PAUSED);
    activeIcon(1);
  };

  const handleForward = () => {
    setPlayerRequest(PlayerRequestType.FORWARD);
    activeIcon(2);
  };

  const icons = [
    { name: 'backward', icon: FaStepBackward, action: handleBackward },
    (lecturePlayerState === PlayerStateType.PLAYING ?
      { name: 'pause', icon: FaPause, action: handlePause } :
      { name: 'play', icon: FaPlay, action: handlePlay }
    ),
    { name: 'forward', icon: FaStepForward, action: handleForward },
  ];

  let i = 0;
  return (
    <div className="flex justify-end items-center space-x-4 w-[calc(20%-1rem)] h-full border-l-4 ml-4 border-double border-white-100">
      {icons.map(({ name, icon: Icon, action }) => {
        return (
          <Icon
            key={name}
            className={classNames('h-5 w-5 cursor-pointer transition-colors duration-300',
              activeIndex === i++ ? 'text-yellow-500' : 'text-white'
            )}
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
  const [pageNumber, setPageNumber] = useRecoilState(pdfPageState);
  const isReviewMode = useSearchParams().get('mode') === 'review';
  const [inputText, setInputText] = useRecoilState(inputTextState); // 입력된 텍스트 상태
  const [searchType, setSearchType] = useRecoilState(searchTypeState); // 검색 타입 상태
  const setSearchQuery = useSetRecoilState(searchQueryState); // Recoil 상태 업데이트 함수

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
    setIsRecording(!isRecording);
  };

  const handleUndo = () => {
    const thisPageHistory = history.filter((item) => item.pageNumber === pageNumber);
    console.log("history", history);
    console.log("thispagehistory", thisPageHistory);
    if (thisPageHistory.length === 0) return;
    const previous = thisPageHistory[thisPageHistory.length - 2];
    const current = thisPageHistory[thisPageHistory.length - 1];
    setRedoStack((prev) => [...prev, current]);
    setHistory((prev) => prev.filter((item) => item.id !== current.id));
    const event = new CustomEvent('undoCanvas', { detail: previous });
    window.dispatchEvent(event);
  };

  const handleRedo = () => {
    const thisPageRedoStack = redoStack.filter((item) => item.pageNumber === pageNumber);
    if (thisPageRedoStack.length === 0) return;
    const next = thisPageRedoStack[thisPageRedoStack.length - 1];
    setHistory((prev) => [...prev, next]);
    setRedoStack((prev) => prev.filter((item) => item.id !== next.id));
    const event = new CustomEvent('redoCanvas', { detail: next });
    window.dispatchEvent(event);
  };

  const handleSearch = () => {
    setSearchQuery({ query: inputText, type: searchType }); // 검색어와 타입을 Recoil 상태로 설정
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(); // Enter 키를 눌렀을 때 검색 실행
    }
  };
  
  const toggleSearchType = () => {
    if (isReviewMode) {
      setSearchType((prevType) => (prevType === 'semantic' ? 'keyword' : 'semantic')); // 타입을 토글
    }
  };

  useEffect(() => {
    setSearchType(isReviewMode ? 'semantic' : 'keyword');
  }, [isReviewMode]);
  
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
  ];

  return (
    <nav className="bg-gray-600">
      <div className="mx-auto px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-12 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
          </div>
          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <div className="flex flex-shrink-0 items-center text-white font-bold">
              VividReview
            </div>
            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-1">
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
            <div className="flex space-x-4 items-center">
              {icons.map(({ name, icon: Icon, tool }) => {
                if (name === 'grid') {
                  return (
                    <Icon
                      key={name}
                      className={classNames(
                        'h-5 w-5 cursor-pointer transition-colors duration-300',
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
                      'h-5 w-5 cursor-pointer transition-colors duration-300',
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
                    'h-5 w-5 cursor-pointer transition-colors duration-300',
                    temporaryActiveIcons.has(name) ? 'text-yellow-500' : 'text-white'
                  )}
                  onClick={() => handleTemporaryActivation(name, action)}
                />
              ))}
              {!isReviewMode && <FaMicrophone
                className={classNames(
                  'h-5 w-5 cursor-pointer transition-colors duration-300',
                  isRecording ? 'text-yellow-500' : 'text-white'
                )}
                onClick={handleMicToggle}
              />}
              <div className="relative flex items-center">
                <FaSearch className="absolute h-4 w-4 cursor-pointer right-2 text-white" onClick={handleSearch} />
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)} // 입력된 텍스트 상태 업데이트
                  onKeyDown={handleKeyDown} // Enter 키 감지
                  className="bg-gray-700 text-white w-80 pr-8 py-1 pl-24 rounded"
                  placeholder="Search..."
                />
                <button
                  onClick={toggleSearchType}
                  className="absolute bg-slate-300 w-20 left-1 text-black px-2 py-1 rounded cursor-pointer outline-none"
                >
                  {searchType === 'semantic' ? 'Semantic' : 'Keyword'}
                </button>
              </div>
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

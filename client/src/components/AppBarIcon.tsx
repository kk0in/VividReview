import { useState } from "react";

export enum TriggerModeType {
  ACTION,
  TOGGLE,
}

export default function AppBarIcon({
  children,
  onClick,
  triggerMode,
  modeCount = 2,
}: {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, triggerIndex: number) => void;
  triggerMode: TriggerModeType;
  modeCount?: number;
}) {
  const colors = [
    "text-white",
    "text-yellow-500",
    "text-red-500",
    "text-green-500",
  ];
  const [triggerIndex, setTriggerIndex] = useState(0);

  const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (triggerMode === TriggerModeType.ACTION) {
      triggerIndex === 0 ? setTriggerIndex(1) : setTriggerIndex(0);
      if (onClick) {
        onClick(event, triggerIndex);
      }
      setTimeout(() => {
        setTriggerIndex(0);
      }, 300);
    } else if (triggerMode === TriggerModeType.TOGGLE) {
      setTriggerIndex((triggerIndex + 1) % (modeCount ? modeCount : 2));
      if (onClick) {
        onClick(event, triggerIndex);
      }
    }
  };

  return (
    <div
      className={
        "flex h-6 w-6 cursor-pointer transition-colors duration-300 " +
        colors[triggerIndex]
      }
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

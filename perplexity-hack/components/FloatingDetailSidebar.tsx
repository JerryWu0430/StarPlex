"use client";

import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

interface FloatingDetailSidebarProps {
  /** Content to display in the sidebar */
  children?: React.ReactNode;
  /** Position of the sidebar */
  position?: "left" | "right";
  /** Width of the sidebar when expanded */
  width?: string;
  /** Whether the sidebar is initially visible */
  defaultVisible?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Whether the sidebar should be visible based on external trigger */
  isVisible?: boolean;
  /** Callback when sidebar should be closed */
  onClose?: () => void;
}

export default function FloatingDetailSidebar({
  children,
  position = "right",
  width = "320px",
  defaultVisible = false,
  className = "",
  isVisible: externalIsVisible,
  onClose,
}: FloatingDetailSidebarProps) {
  const [internalIsVisible, setInternalIsVisible] = useState(defaultVisible);
  const [isPinned, setIsPinned] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use external visibility if provided, otherwise use internal state
  const isVisible = externalIsVisible !== undefined ? externalIsVisible : internalIsVisible;

  // Handle click to pin/unpin
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
  };

  // Handle close button
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClose) {
      onClose();
    } else {
      setInternalIsVisible(false);
    }
    setIsPinned(false);
  };

  const positionClasses = position === "left" ? "left-4" : "right-4";
  const transformClasses = position === "left"
    ? (isVisible ? "translate-x-0" : "-translate-x-full")
    : (isVisible ? "translate-x-0" : "translate-x-full");

  return (
    <div
      ref={sidebarRef}
      className={`
        fixed top-4 ${positionClasses} z-20
        transition-all duration-300 ease-in-out
        ${transformClasses}
        ${className}
      `}
      style={{ width: isVisible ? width : "0px" }}
      onClick={handleClick}
    >
      <div
        className={`
          bg-white/95 backdrop-blur-sm
          border border-gray-200/50
          rounded-xl shadow-lg
          overflow-hidden
          h-[calc(100vh-2rem)]
          flex flex-col
          ${isPinned ? "ring-2 ring-blue-500/20" : ""}
        `}
        style={{
          minWidth: isVisible ? width : "0px",
          maxWidth: isVisible ? width : "0px"
        }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-700">Details</h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-200/50 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {children || (
            <div className="text-gray-500 text-sm">
              <p>No content available</p>
              <p className="text-xs mt-2 text-gray-400">
                Hover to expand • Click to pin
              </p>
            </div>
          )}
        </div>

        {/* Footer indicator */}
        <div className="p-2 border-t border-gray-200/50 bg-gray-50/30">
          <div className="flex items-center justify-center">
            <div className={`
              w-2 h-2 rounded-full
              ${isPinned ? "bg-blue-500" : "bg-gray-300"}
              transition-colors duration-200
            `} />
            <span className="ml-2 text-xs text-gray-500">
              {isPinned ? "Pinned" : "Hover to expand"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

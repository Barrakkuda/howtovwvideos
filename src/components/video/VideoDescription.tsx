"use client";

import { useState } from "react";

interface VideoDescriptionProps {
  description: string | null;
}

export function VideoDescription({ description }: VideoDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLines = 14;

  if (!description) {
    return <p className="text-gray-400">No description available.</p>;
  }

  const lines = description.split("\n");
  const shouldTruncate = lines.length > maxLines;
  const displayLines = isExpanded ? lines : lines.slice(0, maxLines);
  const displayText = displayLines.join("\n");

  return (
    <div className="space-y-2">
      <p className="text-gray-400 whitespace-pre-line">
        {displayText}
        {shouldTruncate && !isExpanded && "..."}
      </p>
      {shouldTruncate && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}

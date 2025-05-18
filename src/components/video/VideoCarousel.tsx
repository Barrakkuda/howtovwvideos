"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import VideoCard, { type VideoCardProps } from "@/components/video/VideoCard";

export type VideoCarouselItemData = VideoCardProps["video"];

interface VideoCarouselProps {
  videos: VideoCarouselItemData[];
  title?: string;
  itemsPerPageMap?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    base?: number; // Default for smallest screens
  };
}

export function VideoCarousel({
  videos,
  title,
  itemsPerPageMap = { base: 1, sm: 2, md: 3, lg: 4, xl: 5 },
}: VideoCarouselProps) {
  if (!videos || videos.length === 0) {
    return null; // Or a message indicating no videos
  }

  const getBasisClass = (count: number | undefined) => {
    if (!count || count <= 0) return "basis-full";
    if (count === 1) return "basis-full";
    if (count === 2) return "basis-1/2";
    if (count === 3) return "basis-1/3";
    if (count === 4) return "basis-1/4";
    if (count === 5) return "basis-1/5";
    if (count === 6) return "basis-1/6";
    return `basis-1/${count}`;
  };

  const itemClasses = [
    itemsPerPageMap.base ? getBasisClass(itemsPerPageMap.base) : "",
    itemsPerPageMap.sm ? `sm:${getBasisClass(itemsPerPageMap.sm)}` : "",
    itemsPerPageMap.md ? `md:${getBasisClass(itemsPerPageMap.md)}` : "",
    itemsPerPageMap.lg ? `lg:${getBasisClass(itemsPerPageMap.lg)}` : "",
    itemsPerPageMap.xl ? `xl:${getBasisClass(itemsPerPageMap.xl)}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full pb-6">
      {title && (
        <h2 className="text-2xl font-semibold mb-4 md:px-2 sm:px-0">{title}</h2>
      )}
      <Carousel
        opts={{
          align: "start",
          loop: videos.length > (itemsPerPageMap.lg || 4),
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {videos.map((video, index) => (
            <CarouselItem
              key={video.id || index}
              className={`pl-4 flex-shrink-0 ${itemClasses}`}
            >
              <div className="p-1 h-full">
                <VideoCard video={video} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute top-1/3 -translate-y-1/3 left-[-2rem] md:left-[-2.5rem] z-10 hidden sm:flex" />
        <CarouselNext className="absolute top-1/3 -translate-y-1/3 right-[-2rem] md:right-[-2.5rem] z-10 hidden sm:flex" />
      </Carousel>
    </div>
  );
}

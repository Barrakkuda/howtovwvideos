"use client";

import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import Image from "next/image";
import HomePageSearch from "@/components/search/HomePageSearch";

// Placeholder images - replace with your actual images
const carouselImages = [
  {
    src: "https://images.unsplash.com/photo-1610336102810-6a06af8532d6",
    alt: "Classic VW Beetle",
  },
  {
    src: "https://images.unsplash.com/photo-1711386689622-1cda23e10217", // This was the first one we fixed
    alt: "VW Bus Side View",
  },
  {
    src: "https://images.unsplash.com/photo-1703875497348-bdf7aaf7c35a",
    alt: "Classic VW Beetle",
  },
];

export default function HeroCarousel() {
  return (
    <div className="relative w-full h-[40vh] md:h-[75vh] overflow-hidden hero-carousel-container">
      {" "}
      {/* Adjusted height slightly */}
      <Carousel
        opts={{
          loop: true,
          duration: 500,
        }}
        plugins={[
          Autoplay({
            delay: 10000, // Autoplay delay in ms
            stopOnInteraction: false, // Continue autoplay after interaction
            stopOnMouseEnter: false, // Pause autoplay on mouse enter
          }),
          Fade(),
        ]}
        className="w-full h-full relative"
      >
        <CarouselContent className="w-full h-full min-h-full relative">
          {carouselImages.map((image, index) => (
            <CarouselItem
              key={index}
              className="absolute inset-0 w-full h-full"
              style={{ opacity: index === 0 ? 1 : 0 }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  style={{ objectFit: "cover" }}
                  className="brightness-75"
                  priority={index === 0}
                  sizes="100vw"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* No CarouselPrevious or CarouselNext for controls */}
      </Carousel>
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-15 w-full h-full bg-gradient-to-t from-black/100 to-transparent"
        aria-hidden="true" // For accessibility, as it's decorative
      />
      {/* Overlay Content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl text-white mb-6">
            Your Air-Cooled VW Video Hub
          </h1>
          <div className="w-full">
            <HomePageSearch />
          </div>
        </div>
      </div>
    </div>
  );
}

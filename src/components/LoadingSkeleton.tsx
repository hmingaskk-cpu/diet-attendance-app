"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}

const LoadingSkeleton = ({ count = 1, height = "h-8", width = "w-full", className = "" }: LoadingSkeletonProps) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={`${height} ${width} ${className}`} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
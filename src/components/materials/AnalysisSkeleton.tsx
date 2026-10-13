import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const AnalysisSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-[1400px] mx-auto">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
    <div className="grid gap-6 md:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </div>
    <Skeleton className="h-[400px] w-full rounded-xl" />
    <div className="grid gap-6 md:grid-cols-3">
      <Skeleton className="h-[300px] md:col-span-2 rounded-xl" />
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  </div>
);

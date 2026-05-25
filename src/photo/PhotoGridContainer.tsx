'use client';

import AppGrid from '@/components/AppGrid';
import PhotoGrid from './PhotoGrid';
import PhotoGridInfinite from './PhotoGridInfinite';
import { clsx } from 'clsx/lite';
import AnimateItems from '@/components/AnimateItems';
import { ComponentProps, useCallback, useState, ReactNode } from 'react';
import { GRID_SPACE_CLASSNAME } from '@/components';
import { SortBy } from './sort';
import { MASONRY_GRID_ENABLED } from '@/app/config';

export default function PhotoGridContainer({
  cacheKey,
  photos,
  count,
  sortBy,
  sortWithPriority,
  excludeFromFeeds,
  animateOnFirstLoadOnly,
  header,
  sidebar,
  className,
  ...categories
}: {
  cacheKey: string
  count: number
  sortBy?: SortBy
  sortWithPriority?: boolean
  excludeFromFeeds?: boolean
  header?: ReactNode
  sidebar?: ReactNode
  className?: string
} & ComponentProps<typeof PhotoGrid>) {
  const shouldRenderInitialGrid =
    !MASONRY_GRID_ENABLED || count <= photos.length;

  const [
    shouldAnimateDynamicItems,
    setShouldAnimateDynamicItems,
  ] = useState(false);
  const onAnimationComplete = useCallback(() =>
    setShouldAnimateDynamicItems(true), []);

  return (
    <AppGrid
      contentMain={<div className={clsx(
        header && 'space-y-8 mt-1.5',
        className,
      )}>
        {header &&
          <AnimateItems
            type="bottom"
            items={[header]}
            animateOnFirstLoadOnly
          />}
        <div className={GRID_SPACE_CLASSNAME}>
          {shouldRenderInitialGrid && (
            <PhotoGrid {...{
              photos,
              ...categories,
              animateOnFirstLoadOnly,
              onAnimationComplete,
            }} />
          )}
          {count > photos.length &&
            <PhotoGridInfinite {...{
              cacheKey,
              initialPhotos: MASONRY_GRID_ENABLED ? photos : undefined,
              initialOffset: photos.length,
              sortBy,
              sortWithPriority,
              excludeFromFeeds,
              ...categories,
              canStart: shouldAnimateDynamicItems,
              animateOnFirstLoadOnly,
            }} />}
        </div>
      </div>}
      contentSide={sidebar}
    />
  );
}

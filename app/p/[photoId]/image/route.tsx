import { getPhotoCached } from '@/photo/cache';
import { IMAGE_OG_DIMENSION } from '@/image-response';
import PhotoImageResponse from '@/photo/PhotoImageResponse';
import { getIBMPlexMono } from '@/app/font';
import { getImageResponseCacheControlHeaders } from '@/image-response/cache';
import { staticallyGeneratePhotosIfConfigured } from '@/app/static';
import { safeImageResponse } from '@/image-response/safe';

export const generateStaticParams = staticallyGeneratePhotosIfConfigured(
  'image',
);

export async function GET(
  _: Request,
  context: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await context.params;

  const [
    photo,
    { fontFamily, fonts },
    headers,
  ] = await Promise.all([
    getPhotoCached(photoId),
    getIBMPlexMono(),
    getImageResponseCacheControlHeaders(),
  ]);
  
  if (!photo) { return new Response('Photo not found', { status: 404 }); }

  const { width, height } = IMAGE_OG_DIMENSION;
  
  return safeImageResponse(
    <PhotoImageResponse {...{
      photo,
      width,
      height,
      fontFamily,
    }} />,
    { width, height, fonts, headers },
    `photo: ${photoId}`,
  );
}

import { getPhotosCached } from '@/photo/cache';
import {
  IMAGE_OG_DIMENSION_SMALL,
  MAX_PHOTOS_TO_SHOW_PER_CATEGORY,
} from '@/image-response';
import { getIBMPlexMono } from '@/app/font';
import { safeImageResponse } from '@/image-response/safe';
import { getImageResponseCacheControlHeaders } from '@/image-response/cache';
import { getUniqueRecipes } from '@/photo/query';
import RecipeImageResponse from '@/recipe/RecipeImageResponse';
import { staticallyGenerateCategoryIfConfigured } from '@/app/static';

export const generateStaticParams = staticallyGenerateCategoryIfConfigured(
  'recipes',
  'image',
  getUniqueRecipes,
  recipes => recipes.map(({ recipe }) => ({ recipe })),
);

export async function GET(
  _: Request,
  context: { params: Promise<{ recipe: string }> },
) {
  const { recipe } = await context.params;

  const [
    photos,
    { fontFamily, fonts },
    headers,
  ] = await Promise.all([
    getPhotosCached({ recipe, limit: MAX_PHOTOS_TO_SHOW_PER_CATEGORY }),
    getIBMPlexMono(),
    getImageResponseCacheControlHeaders(),
  ]);

  const { width, height } = IMAGE_OG_DIMENSION_SMALL;

  return safeImageResponse(
    <RecipeImageResponse {...{
      recipe,
      photos,
      width,
      height,
      fontFamily,
    }}/>,
    { width, height, fonts, headers },
  );
}

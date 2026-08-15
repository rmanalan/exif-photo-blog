import { getFileNamePartsFromStorageUrl } from '@/platforms/storage';

export const removeBase64Prefix = (base64: string) => {
  return base64.match(/^data:image\/[a-z]{3,4};base64,(.+)$/)?.[1] ?? base64;
};

// Formats `next/og` (satori) can decode. WebP and AVIF throw when rendered,
// so they're rejected here and callers degrade rather than fail.
const RENDERABLE_IMAGE_TYPES = ['image/jpeg', 'image/png'];

// `next/image` negotiates output format from this header, so ask it for
// something renderable instead of accepting whatever it defaults to
const RENDERABLE_IMAGE_ACCEPT = 'image/jpeg,image/png';

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const getContentTypeFromMagicBytes = (buffer: Buffer) => {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= PNG_MAGIC_BYTES.length &&
    PNG_MAGIC_BYTES.every((byte, index) => buffer[index] === byte)
  ) {
    return 'image/png';
  }
  return undefined;
};

export const fetchBase64ImageFromUrl = async (
  url: string,
  fetchOptions?: RequestInit,
) => {
  const { fileExtension } = getFileNamePartsFromStorageUrl(url);
  return fetch(url, {
    ...fetchOptions,
    headers: {
      'accept': RENDERABLE_IMAGE_ACCEPT,
      ...fetchOptions?.headers,
    },
  })
    .then(async response => {
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        // Trust the bytes over the file name: `next/image` urls carry no
        // extension, and storage can serve a format the name doesn't imply
        const contentType =
          getContentTypeFromMagicBytes(buffer) ??
          response.headers.get('content-type')?.split(';')[0].trim() ??
          (fileExtension === 'png' ? 'image/png' : 'image/jpeg');
        if (!RENDERABLE_IMAGE_TYPES.includes(contentType)) { return undefined; }
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } else {
        return undefined;
      }
    })
    .catch(() => undefined);
};

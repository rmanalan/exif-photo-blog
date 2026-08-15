import { getFileNamePartsFromStorageUrl } from '@/platforms/storage';

export const removeBase64Prefix = (base64: string) => {
  return base64.match(/^data:image\/[a-z]{3,4};base64,(.+)$/)?.[1] ?? base64;
};

// The only raster formats `next/og` (satori) can decode. webp and avif
// both throw when rendered, so anything not recognized from its bytes as
// jpeg or png is dropped rather than handed over to fail mid-render.
// Matched on sniffed bytes, not the declared type—headers lie, and
// rejecting on a header mismatch previously discarded working images.
const RENDERABLE_IMAGE_TYPES = ['image/jpeg', 'image/png'];

// `next/image` negotiates output format from this header, so ask it for
// something renderable instead of accepting whatever it defaults to
const RENDERABLE_IMAGE_ACCEPT = 'image/jpeg,image/png';

const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Sniff the bytes rather than trusting headers: `next/image` urls carry no
// file extension, and a proxied response can arrive without a usable
// content-type, which previously let webp reach satori mislabelled as jpeg
const getContentTypeFromMagicBytes = (buffer: Buffer) => {
  const hasAsciiAt = (offset: number, ascii: string) =>
    buffer.length >= offset + ascii.length &&
    buffer.subarray(offset, offset + ascii.length).toString('latin1') === ascii;
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
  if (hasAsciiAt(0, 'RIFF') && hasAsciiAt(8, 'WEBP')) {
    return 'image/webp';
  }
  if (
    hasAsciiAt(4, 'ftyp') &&
    (hasAsciiAt(8, 'avif') || hasAsciiAt(8, 'avis'))
  ) {
    return 'image/avif';
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
        const contentType = getContentTypeFromMagicBytes(buffer);
        if (!contentType || !RENDERABLE_IMAGE_TYPES.includes(contentType)) {
          // Reached when a photo's optimized variant is missing and
          // `next/image` serves something else in its place—regenerating
          // the variant is the real fix; dropping it here keeps satori
          // from throwing mid-render and blanking the whole image
          console.error(
            'Cannot render image in image response ' +
            `(sniffed ${contentType ?? 'unknown'}, ` +
            `declared ${response.headers.get('content-type') ?? 'none'}, ` +
            `magic ${buffer.subarray(0, 12).toString('hex')}, ` +
            `extension ${fileExtension ?? 'none'}): ${url}`,
          );
          return undefined;
        }
        return `data:${contentType};base64,${buffer.toString('base64')}`;
      } else {
        console.error(
          `Error fetching image (${response.status}): ${url}`,
        );
        return undefined;
      }
    })
    .catch(() => undefined);
};

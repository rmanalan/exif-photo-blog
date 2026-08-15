import { ImageResponse } from 'next/og';
import { ReactElement } from 'react';

type ImageResponseOptions = ConstructorParameters<typeof ImageResponse>[1];

// Render eagerly rather than letting the response stream. Decode and layout
// errors inside satori surface when the body is consumed, which during static
// export happens outside any handler and fails the entire build—a single
// unreadable photo shouldn't take down every other page.
export const safeImageResponse = async (
  element: ReactElement,
  options: ImageResponseOptions,
  label?: string,
): Promise<Response> => {
  try {
    const response = new ImageResponse(element, options);
    const body = await response.arrayBuffer();
    return new Response(body, { headers: response.headers });
  } catch (e) {
    console.error(
      `Error rendering image response${label ? ` (${label})` : ''}, ` +
      'falling back to empty image:',
      e,
    );
    return new ImageResponse(
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
      }} />,
      options,
    );
  }
};

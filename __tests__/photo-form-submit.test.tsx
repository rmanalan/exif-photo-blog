import { render, screen, act } from '@testing-library/react';
import PhotoForm from '@/photo/form/PhotoForm';
import { createPhotoAction, updatePhotoAction } from '@/photo/actions';
import { OmRecipe } from '@/platforms/om-system/recipe';
import { createOmRecipeData } from '@/recipe/serialization';

let submitAction: (data: FormData) => Promise<void>;
jest.mock('next/form', () => ({
  __esModule: true,
  default: ({ action, children }: {
    action: typeof submitAction, children: React.ReactNode,
  }) => {
    submitAction = action;
    return <form>{children}</form>;
  },
}));
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  useRouter: () => ({ prefetch: jest.fn() }),
  usePathname: () => '/admin/uploads/fixture',
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('../src/photo/actions', () => ({
  createPhotoAction: jest.fn(), updatePhotoAction: jest.fn(),
}));
jest.mock('../src/platforms/storage', () => ({
  getFileNamePartsFromStorageUrl: () => ({
    fileNameBase: 'upload-original', fileExtension: 'jpeg',
  }),
}));
jest.mock('../src/components/image/ImageWithFallback', () => () => null);
jest.mock('../src/place/PlaceMap', () => () => null);
jest.mock('../src/components/AnchorSections', () => ({
  __esModule: true,
  default: ({ sections }: {
    sections: { id: string, content: React.ReactNode }[],
  }) => <>{sections.map(s => <div key={s.id}>{s.content}</div>)}</>,
}));
jest.mock('../src/utility/useIsVisible', () => ({
  __esModule: true, default: () => true,
}));
jest.mock('../src/utility/useMediaQuery', () => ({
  __esModule: true, default: () => false,
}));
jest.mock('../src/utility/useHash', () => ({
  __esModule: true, default: () => ({ hash: 'text' }),
}));

const recipe: OmRecipe = {
  version: 1, kind: 'color', colors: Array(12).fill(0),
  whiteBalance: { mode: 1, amber: 2, green: 1 },
  tone: { shadow: -3, mid: 0, highlight: 3 },
  shading: 0, sharpness: 0, contrast: 0,
};
const initialPhotoForm = {
  id: 'newphoto', title: 'Red Folding Chairs', tags: 'patio, bench',
  make: 'OM Digital Solutions', model: 'PEN',
  url: 'https://photos.example/upload-original.jpeg', extension: 'jpeg',
  takenAt: '2026-11-01T07:11:46Z', takenAtNaive: '2026-11-01 07:11:46',
  recipeData: JSON.stringify(createOmRecipeData(recipe)),
};

beforeEach(() => jest.clearAllMocks());

it.each(['create', 'edit'] as const)(
  'passes the %s success redirect back to Next.js', async type => {
    const redirect = Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;push;/admin/photos;303;',
    });
    jest.mocked(createPhotoAction).mockRejectedValue(redirect);
    jest.mocked(updatePhotoAction).mockRejectedValue(redirect);
    render(<PhotoForm type={type} initialPhotoForm={initialPhotoForm}
      albums={[]} uniqueTags={[]} uniqueRecipes={[]} uniqueFilms={[]} />);
    await expect(submitAction(new FormData())).rejects.toBe(redirect);
    expect(screen.queryByText('NEXT_REDIRECT')).toBeNull();
  },
);

it('still shows application errors beside the form', async () => {
  jest.mocked(createPhotoAction)
    .mockRejectedValue(new Error('Upload unavailable'));
  render(<PhotoForm initialPhotoForm={initialPhotoForm}
    albums={[]} uniqueTags={[]} uniqueRecipes={[]} uniqueFilms={[]} />);
  await act(async () => { await submitAction(new FormData()); });
  expect(screen.getByText('Upload unavailable')).toBeDefined();
});

it('submits the reserved photo ID and OM recipe in the actual form', () => {
  const { container } = render(<PhotoForm initialPhotoForm={initialPhotoForm}
    albums={[]} uniqueTags={[]} uniqueRecipes={[]} uniqueFilms={[]} />);
  const data = new FormData(container.querySelector('form')!);
  expect(data.get('id')).toBe('newphoto');
  expect(JSON.parse(String(data.get('recipeData'))))
    .toEqual(createOmRecipeData(recipe));
});

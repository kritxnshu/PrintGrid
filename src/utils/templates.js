/**
 * Pre-built layout templates that auto-configure paper, grid, gap, and orientation.
 */

export const TEMPLATES = [
  {
    key: 'passport',
    label: 'Passport Photos',
    icon: '\u{1F4F7}',
    description: '2\u00D72 grid, perfect for passport-sized prints',
    paperSize: 'A4',
    orientation: 'portrait',
    rows: 2,
    columns: 2,
    gap: 8,
    fitMode: 'cover',
  },
  {
    key: 'photobooth',
    label: 'Photo Booth Strip',
    icon: '\u{1F39E}\uFE0F',
    description: '1\u00D74 vertical strip layout',
    paperSize: '4x6',
    orientation: 'portrait',
    rows: 4,
    columns: 1,
    gap: 4,
    fitMode: 'cover',
  },
  {
    key: 'idcard',
    label: 'ID Card',
    icon: '\u{1FAAA}',
    description: 'Single photo, small format',
    paperSize: 'A6',
    orientation: 'landscape',
    rows: 1,
    columns: 1,
    gap: 0,
    fitMode: 'cover',
  },
  {
    key: 'collage',
    label: 'Collage 3\u00D73',
    icon: '\u{1F5BC}\uFE0F',
    description: '3\u00D73 grid for a balanced collage',
    paperSize: 'A4',
    orientation: 'portrait',
    rows: 3,
    columns: 3,
    gap: 6,
    fitMode: 'cover',
  },
  {
    key: 'contact',
    label: 'Contact Sheet',
    icon: '\u{1F4CB}',
    description: '4\u00D75 dense grid for overview prints',
    paperSize: 'A4',
    orientation: 'portrait',
    rows: 5,
    columns: 4,
    gap: 4,
    fitMode: 'cover',
  },
];

export const getTemplate = (key) =>
  TEMPLATES.find((t) => t.key === key) ?? null;

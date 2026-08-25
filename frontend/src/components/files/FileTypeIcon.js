import { FileImage, FileText, FileArchive, File as FileGeneric, FileType2 } from 'lucide-react';

const CONFIG = [
  { test: (m) => m?.startsWith('image/'), icon: FileImage, color: '#2E7DBF', label: 'Image' },
  { test: (m) => m === 'application/pdf', icon: FileType2, color: '#D64545', label: 'PDF' },
  {
    test: (m) => m?.includes('wordprocessingml') || m === 'application/msword',
    icon: FileText,
    color: '#2E5EA8',
    label: 'Document',
  },
  {
    test: (m) => m?.includes('presentationml') || m === 'application/vnd.ms-powerpoint',
    icon: FileText,
    color: '#B7791F',
    label: 'Presentation',
  },
  { test: (m) => m?.includes('zip'), icon: FileArchive, color: '#5B6B85', label: 'Archive' },
];

function resolve(mimeType) {
  return CONFIG.find((c) => c.test(mimeType)) || { icon: FileGeneric, color: '#5B6B85', label: 'File' };
}

export default function FileTypeIcon({ mimeType, className = 'h-5 w-5' }) {
  const { icon: Icon, color } = resolve(mimeType);
  return <Icon className={className} style={{ color }} />;
}

export function fileTypeLabel(mimeType) {
  return resolve(mimeType).label;
}

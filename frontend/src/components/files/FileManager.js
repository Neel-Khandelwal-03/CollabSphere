'use client';

import { useState } from 'react';
import { Search, LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FileCard from './FileCard';
import FileList from './FileList';
import FilePreview from './FilePreview';
import FileDropzone from './FileDropzone';
import { useWorkspaceFiles, useProjectFiles, useDeleteFile } from '@/hooks/useFiles';
import { useAuthStore } from '@/store/authStore';

const MANAGER_ROLES = ['owner', 'admin'];

/**
 * scope: { type: 'workspace', workspaceId } | { type: 'project', projectId, workspaceId }
 * workspaceId is always present regardless of type (a project-scoped
 * upload still needs its parent workspace for RBAC/Cloudinary folder
 * scoping) — Both Workspace Files and Project Files render through this
 * one component, matching the "one shared component, multiple entry
 * points" pattern already established by IssueTable/CreateIssueModal.
 */
export default function FileManager({ scope, myRole }) {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = MANAGER_ROLES.includes(myRole);
  const canUpload = myRole && myRole !== 'viewer';

  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [view, setView] = useState('grid');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filters = { search: searchInput, category, sort };
  const workspaceQuery = useWorkspaceFiles(scope.type === 'workspace' ? scope.workspaceId : undefined, filters);
  const projectQuery = useProjectFiles(scope.type === 'project' ? scope.projectId : undefined, filters);
  const { data, isLoading } = scope.type === 'workspace' ? workspaceQuery : projectQuery;

  const deleteFile = useDeleteFile({
    workspaceId: scope.workspaceId,
    projectId: scope.type === 'project' ? scope.projectId : undefined,
  });

  const files = data?.files || [];

  const canDeleteFile = (file) => file.uploaded_by === currentUser?.id || isManager;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search files..." className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          <option value="">All types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="largest">Largest</option>
          <option value="smallest">Smallest</option>
        </Select>
        <div className="flex rounded-lg border border-line p-0.5">
          <button
            onClick={() => setView('grid')}
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-brand-tint text-brand-strong' : 'text-muted hover:text-ink'}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-brand-tint text-brand-strong' : 'text-muted hover:text-ink'}`}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
        {canUpload && (
          <Button onClick={() => setUploadOpen((v) => !v)}>
            <Plus className="h-4 w-4" /> Upload
          </Button>
        )}
      </div>

      {uploadOpen && canUpload && (
        <div className="mt-4">
          <FileDropzone
            workspaceId={scope.workspaceId}
            projectId={scope.type === 'project' ? scope.projectId : undefined}
          />
        </div>
      )}

      <div className="mt-4">
        {isLoading && <p className="py-8 text-center text-sm text-muted">Loading files...</p>}

        {!isLoading && files.length === 0 && (
          <div className="rounded-xl border border-dashed border-line py-12 text-center">
            <p className="text-sm text-muted">No files here yet.</p>
            {canUpload && (
              <Button onClick={() => setUploadOpen(true)} className="mt-3">
                <Plus className="h-4 w-4" /> Upload a file
              </Button>
            )}
          </div>
        )}

        {!isLoading && files.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={setPreviewFile}
                onDelete={setDeleteTarget}
                canDelete={canDeleteFile(file)}
              />
            ))}
          </div>
        )}

        {!isLoading && files.length > 0 && view === 'list' && (
          <FileList files={files} onPreview={setPreviewFile} onDelete={setDeleteTarget} canDelete={canDeleteFile} />
        )}
      </div>

      <FilePreview open={!!previewFile} onClose={() => setPreviewFile(null)} file={previewFile} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this file?"
        description={`This permanently deletes "${deleteTarget?.original_name || deleteTarget?.file_name}". This can't be undone.`}
        confirmLabel="Delete file"
        loading={deleteFile.isPending}
        onConfirm={() => deleteFile.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  );
}

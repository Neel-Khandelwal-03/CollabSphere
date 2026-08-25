const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const fileService = require('../services/file.service');
const projectService = require('../services/project.service');
const { uploadBuffer, deleteResource } = require('../utils/cloudinary');
const fileEvents = require('../utils/fileEvents');

const MANAGER_ROLES = ['owner', 'admin'];
const isManager = (role) => MANAGER_ROLES.includes(role);

function pickListFilters(query) {
  return {
    search: query.search,
    mimeType: query.mimeType,
    category: query.category,
    uploadedBy: query.uploadedBy,
    createdAfter: query.createdAfter,
    createdBefore: query.createdBefore,
    sort: query.sort,
    page: query.page ? parseInt(query.page, 10) : undefined,
    pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
  };
}

// POST /api/files — multipart/form-data. Gated by resolveWorkspaceFromBody
// + requireWorkspaceRole('member') in the route.
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');
  const { workspaceId, projectId } = req.body;

  if (projectId) {
    const project = await projectService.findById(projectId);
    if (!project || project.workspace_id !== workspaceId) {
      throw ApiError.badRequest('projectId must belong to the given workspace');
    }
  }

  const folder = `collabsphere/workspaces/${workspaceId}`;
  const result = await uploadBuffer(req.file.buffer, { folder, filename: req.file.originalname });

  const file = await fileService.create({
    workspaceId,
    projectId: projectId || null,
    uploadedBy: req.user.id,
    originalName: req.file.originalname,
    publicId: result.public_id,
    fileUrl: result.url,
    secureUrl: result.secure_url,
    resourceType: result.resource_type,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    folder,
  });

  fileEvents.emit('uploaded', { file, actorId: req.user.id });
  res.status(201).json({ success: true, data: { file } });
});

// GET /api/workspaces/:workspaceId/files — requireWorkspaceRole('viewer')
const listWorkspaceFiles = asyncHandler(async (req, res) => {
  const result = await fileService.listForWorkspace(req.params.workspaceId, pickListFilters(req.query));
  res.json({ success: true, data: result });
});

// GET /api/projects/:projectId/files — requireWorkspaceRole('viewer') via loadProject
const listProjectFiles = asyncHandler(async (req, res) => {
  const result = await fileService.listForProject(req.params.projectId, req.params.workspaceId, pickListFilters(req.query));
  res.json({ success: true, data: result });
});

// GET /api/files/:fileId — gated by loadFile + requireWorkspaceRole('viewer')
const getFile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { file: req.fileRecord } });
});

// GET /api/files/:fileId/download — redirects to Cloudinary with a
// fl_attachment flag so the browser downloads with the *original*
// filename rather than the randomized public_id. Access is enforced the
// same way every other read here is (workspace membership, via
// requireWorkspaceRole), not by the URL being hard to guess.
const downloadFile = asyncHandler(async (req, res) => {
  const file = req.fileRecord;
  const downloadUrl = file.secure_url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(file.original_name)}/`);
  res.redirect(downloadUrl);
});

// DELETE /api/files/:fileId — gated by loadFile + requireWorkspaceRole('member');
// uploader-or-admin check happens here, same as task/issue attachment delete.
const deleteFile = asyncHandler(async (req, res) => {
  const file = req.fileRecord;
  const isUploader = file.uploaded_by === req.user.id;
  if (!isUploader && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('You can only delete files you uploaded');
  }

  // Cloudinary first, then Postgres — if Cloudinary fails, the metadata
  // row (and thus the user-visible file) stays intact rather than
  // silently pointing at nothing; if Postgres then fails after a
  // successful Cloudinary delete, that's logged rather than left silent,
  // since the alternative (an orphaned but now-broken-link DB row) is
  // worse than a log line to investigate.
  try {
    await deleteResource(file.public_id, file.resource_type);
  } catch (err) {
    console.error(`Cloudinary deletion failed for file ${file.id} (public_id ${file.public_id}):`, err.message);
    throw ApiError.internal('Failed to delete the stored file. Please try again.');
  }

  try {
    await fileService.remove(file.id);
  } catch (err) {
    console.error(
      `File ${file.id} was deleted from Cloudinary but its database record could not be removed — orphaned metadata row, needs manual cleanup:`,
      err.message
    );
    throw ApiError.internal('File storage was cleared but the record could not be fully removed. Contact support.');
  }

  fileEvents.emit('deleted', { fileId: file.id, workspaceId: file.workspace_id, projectId: file.project_id, actorId: req.user.id });
  res.json({ success: true, message: 'File deleted' });
});

module.exports = { uploadFile, listWorkspaceFiles, listProjectFiles, getFile, downloadFile, deleteFile };

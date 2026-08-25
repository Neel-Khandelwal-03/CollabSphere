const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const workspaceService = require('../services/workspace.service');
const memberService = require('../services/workspaceMember.service');
const invitationService = require('../services/workspaceInvitation.service');
const userService = require('../services/user.service');
const { sendWorkspaceInviteEmail } = require('../utils/email');

// POST /api/workspaces/:workspaceId/invite
// Gated by requireWorkspaceRole('admin').
const inviteMember = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role = 'member' } = req.body;

  const workspace = await workspaceService.findById(workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');

  const existingUser = await userService.findByEmail(email);
  if (existingUser) {
    const alreadyMember = await memberService.findMemberByUserId(workspaceId, existingUser.id);
    if (alreadyMember) {
      throw ApiError.conflict('This person is already a member of the workspace');
    }
  }

  const inviter = await userService.findById(req.user.id);
  const { invitation, rawToken } = await invitationService.createOrRefresh({
    workspaceId,
    email,
    role,
    invitedBy: req.user.id,
  });

  const inviteUrl = `${env.clientUrl}/invitations/${rawToken}`;
  await sendWorkspaceInviteEmail(email, {
    workspaceName: workspace.name,
    inviterName: inviter.name,
    role,
    inviteUrl,
  }).catch((err) => console.error('Failed to send invite email:', err.message));

  res.status(201).json({
    success: true,
    data: {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
      },
    },
  });
});

// POST /api/workspaces/invitations/:token/accept
// Requires authentication only — not workspace membership, since the
// point is to grant it. The invited email must match the logged-in user.
const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await invitationService.findPendingByToken(req.params.token);
  if (!invitation) throw ApiError.badRequest('This invitation is invalid or has expired');

  if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw ApiError.forbidden('This invitation was sent to a different email address');
  }

  await memberService.addMember(invitation.workspace_id, req.user.id, invitation.role);
  await invitationService.respond(invitation.id, true);

  const workspace = await workspaceService.findById(invitation.workspace_id);
  res.json({ success: true, data: { workspace } });
});

// POST /api/workspaces/invitations/:token/reject
const rejectInvitation = asyncHandler(async (req, res) => {
  const invitation = await invitationService.findPendingByToken(req.params.token);
  if (!invitation) throw ApiError.badRequest('This invitation is invalid or has expired');

  if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw ApiError.forbidden('This invitation was sent to a different email address');
  }

  await invitationService.respond(invitation.id, false);
  res.json({ success: true, message: 'Invitation declined' });
});

module.exports = { inviteMember, acceptInvitation, rejectInvitation };

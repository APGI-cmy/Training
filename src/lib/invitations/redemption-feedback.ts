export function invitationErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "email_mismatch":
      return "This invitation belongs to a different email address. Sign out and sign in, or create an account, using the email address that received this invitation.";
    case "expired":
      return "This invitation has expired. Ask your training administrator for a new invitation.";
    case "revoked":
      return "This invitation is no longer active. Ask your training administrator for a new invitation.";
    case "reused":
      return "This invitation has already been accepted. Open Enrolled courses to find your course.";
    case "invalid":
      return "This invitation could not be found. Open the latest invitation email or contact your training administrator.";
    default:
      return "We could not finish accepting your invitation. Please contact your training administrator before trying again.";
  }
}

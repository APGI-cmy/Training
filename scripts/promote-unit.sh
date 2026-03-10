#!/usr/bin/env bash
# promote-unit.sh — safely promote a staged iSpring unit to public/courses/
#
# Usage:
#   ./scripts/promote-unit.sh <course-id> <unit-dir>
#
# Examples:
#   ./scripts/promote-unit.sh vpshr-level-0 unit2
#   ./scripts/promote-unit.sh vpshr-level-0 unit3
#
# What it does:
#   1. Validates that both arguments are provided and non-empty.
#   2. Confirms that the staging source directory exists and contains index.html.
#   3. Confirms that the destination is strictly inside public/courses/ (prevents
#      path-traversal accidents such as ../../ in arguments).
#   4. Removes only the specific unit directory from the destination (never the
#      whole course directory or anything outside public/courses/).
#   5. Moves the staged unit into public/courses/ and removes the staging copy
#      from Git tracking.
#
# The script must be run from the repository root.

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "  $*"; }

# ---------------------------------------------------------------------------
# Argument validation
# ---------------------------------------------------------------------------
[[ $# -eq 2 ]] || die "Usage: $0 <course-id> <unit-dir>  (e.g. $0 vpshr-level-0 unit2)"

COURSE_ID="$1"
UNIT_DIR="$2"

# Reject any argument that contains a path separator — guards against
# accidental or malicious traversal (e.g. "../../etc").
[[ "$COURSE_ID" == */* ]] && die "course-id must not contain '/': $COURSE_ID"
[[ "$UNIT_DIR"  == */* ]] && die "unit-dir must not contain '/': $UNIT_DIR"

# ---------------------------------------------------------------------------
# Derived paths (all relative to repo root)
# ---------------------------------------------------------------------------
REPO_ROOT="$(git rev-parse --show-toplevel)"
STAGING_SRC="staging/ispring-imports/${COURSE_ID}/${UNIT_DIR}"
DEST_COURSE="public/courses/${COURSE_ID}"
DEST_UNIT="${DEST_COURSE}/${UNIT_DIR}"

cd "$REPO_ROOT"

# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------
echo "Promoting: ${STAGING_SRC} → ${DEST_UNIT}"
echo ""

# 1. Source must exist.
[[ -d "$STAGING_SRC" ]] \
  || die "Staging source not found: ${STAGING_SRC}"

# 2. Source must contain index.html and a data/ directory (iSpring export completeness check).
[[ -f "${STAGING_SRC}/index.html" ]] \
  || die "index.html not found in ${STAGING_SRC} — re-check the iSpring export."
[[ -d "${STAGING_SRC}/data" ]] \
  || die "data/ directory not found in ${STAGING_SRC} — re-check the iSpring export."

# 3. Destination course directory must already exist (prevents creating
#    arbitrary new directories inside public/).
[[ -d "$DEST_COURSE" ]] \
  || die "Course directory does not exist: ${DEST_COURSE} — check the course-id."

# 4. Destination path must start with public/courses/ (belt-and-suspenders
#    guard against any unexpected variable expansion).
case "$DEST_UNIT" in
  public/courses/*/*) ;;  # expected pattern
  *) die "Unexpected destination path: ${DEST_UNIT}" ;;
esac

# ---------------------------------------------------------------------------
# Promotion
# ---------------------------------------------------------------------------

# Remove only the specific unit directory if it exists (e.g. a placeholder).
if [[ -d "$DEST_UNIT" ]]; then
  info "Removing existing destination: ${DEST_UNIT}"
  rm -rf "$DEST_UNIT"
fi

# Move the staged export into place.
info "Moving ${STAGING_SRC} → ${DEST_UNIT}"
mv "$STAGING_SRC" "$DEST_UNIT"

# Stage the changes for Git.
info "Staging Git changes…"
git add "$DEST_UNIT"
git rm -r --cached --ignore-unmatch "$STAGING_SRC" > /dev/null

echo ""
echo "Done. Next steps:"
echo "  1. Update ${DEST_COURSE}/index.html — remove the 'upcoming' class and"
echo "     'Coming soon' badge from the unit link (see docs/ispring-intake-workflow.md Step 6)."
echo "  2. git add ${DEST_COURSE}/index.html"
echo "  3. git commit -m \"Promote ${UNIT_DIR} to production for ${COURSE_ID}\""

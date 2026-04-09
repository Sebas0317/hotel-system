/**
 * Fallback for unmatched routes (Route path="*" in App). Shown when user hits a URL that doesn't match / or /room/:id.
 */
export default function PageNotFound() {
  return <div>404 Page Not Found</div>;
}

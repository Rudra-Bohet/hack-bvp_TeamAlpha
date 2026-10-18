import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Page not found</h2>
      <p className="muted">The page you're looking for doesn't exist or has been moved.</p>
      <Link className="btn btn-primary" to="/">
        Go home
      </Link>
    </div>
  );
}

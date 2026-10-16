import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    // No token found? Redirect them to the login page immediately.
    return <Navigate to="/auth" replace />;
  }

  // Token exists! Allow them to see the protected content.
  return children;
}
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import UsersPage from '@/pages/UsersPage';
import NotFoundPage from '@/pages/NotFoundPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/users" replace /> },
          { path: '/users', element: <UsersPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
export default router;

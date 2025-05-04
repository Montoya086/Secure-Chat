// appNavigator.tsx

import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import UnprotectedRoute from './components/UnprotectedRoute';
const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Home />
            </ProtectedRoute>
        ),
    },
    {
        path: '/login',
        element: (
            <UnprotectedRoute>
                <Login />
            </UnprotectedRoute>
        ),
    },
    {
        path: '/signup',
        element: (
            <UnprotectedRoute>
                <Signup />
            </UnprotectedRoute>
        ),
    },
]);

export default router;
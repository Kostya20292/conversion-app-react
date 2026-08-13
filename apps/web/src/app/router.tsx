import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/app/AppLayout';
import { AccountPage } from '@/pages/Account/AccountPage';
import { ApiDocsPage } from '@/pages/ApiDocs/ApiDocsPage';
import { ForgotPasswordPage } from '@/pages/ForgotPassword/ForgotPasswordPage';
import { HomePage } from '@/pages/Home/HomePage';
import { LoginPage } from '@/pages/Login/LoginPage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';
import { RegisterPage } from '@/pages/Register/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPassword/ResetPasswordPage';
import { SharePage } from '@/pages/Share/SharePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 's/:token', element: <SharePage /> },
      { path: 'api-docs', element: <ApiDocsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

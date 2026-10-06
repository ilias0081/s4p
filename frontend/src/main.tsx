import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './App';
import api from './lib/api/api';
import './main.css';
import { Dashboard } from './pages/dashboard/Dashboard';
import { IntegrationsPage } from './pages/dashboard/sub_pages/IntegrationsPage';
import { SettingsPage } from './pages/dashboard/sub_pages/SettingsPage';
import { WorkflowList } from './pages/dashboard/sub_pages/WorkflowList';
import { AuthPage } from './pages/login/login';
import { WorkflowPage } from './pages/workflow/WorkflowPage';

const queryClient = new QueryClient();

// fetch the CSRF cookie before any mutating request is made
void api.get('csrf-token');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<WorkflowList />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/dashboard/workflows/:workflowId" element={<WorkflowPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
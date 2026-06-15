import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
        data: { screen: 'DASHBOARD' }
      },
      {
        path: 'alerts',
        loadComponent: () => import('./modules/alerts/alert-list/alert-list.component').then(m => m.AlertListComponent),
        data: { screen: 'ALERT_LIST' }
      },
      {
        path: 'alerts/:id',
        loadComponent: () => import('./modules/alerts/alert-detail/alert-detail.component').then(m => m.AlertDetailComponent),
        data: { screen: 'ALERT_DETAIL' }
      },
      {
        path: 'cases',
        loadComponent: () => import('./modules/cases/case-list/case-list.component').then(m => m.CaseListComponent),
        data: { screen: 'CASE_LIST' }
      },
      {
        path: 'cases/:id',
        loadComponent: () => import('./modules/cases/case-detail/case-detail.component').then(m => m.CaseDetailComponent),
        data: { screen: 'CASE_DETAIL' }
      },
      {
        path: 'rules',
        loadComponent: () => import('./modules/rules/rule-list/rule-list.component').then(m => m.RuleListComponent),
        data: { screen: 'RULE_LIST' }
      },
      {
        path: 'rules/editor',
        loadComponent: () => import('./modules/rules/rule-editor/rule-editor.component').then(m => m.RuleEditorComponent),
        data: { screen: 'RULE_EDITOR' }
      },
      {
        path: 'rules/editor/:id',
        loadComponent: () => import('./modules/rules/rule-editor/rule-editor.component').then(m => m.RuleEditorComponent),
        data: { screen: 'RULE_EDITOR' }
      },
      {
        path: 'approvals',
        loadComponent: () => import('./modules/approvals/approval-queue/approval-queue.component').then(m => m.ApprovalQueueComponent),
        data: { screen: 'APPROVAL_QUEUE' }
      },
      {
        path: 'approvals/:id',
        loadComponent: () => import('./modules/approvals/approval-detail/approval-detail.component').then(m => m.ApprovalDetailComponent),
        data: { screen: 'APPROVAL_QUEUE' }
      },
      {
        path: 'profiling/:customerId',
        loadComponent: () => import('./modules/profiling/customer-360/customer360.component').then(m => m.Customer360Component),
        data: { screen: 'CUSTOMER_PROFILE' }
      },
      {
        path: 'reports',
        loadComponent: () => import('./modules/reports/reports.component').then(m => m.ReportsComponent),
        data: { screen: 'REPORTS' }
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./modules/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
        data: { screen: 'ADMIN_USERS' }
      },
      {
        path: 'admin/access',
        loadComponent: () => import('./modules/admin/access-matrix/access-matrix.component').then(m => m.AccessMatrixComponent),
        data: { screen: 'ADMIN_ACCESS' }
      },
      {
        path: 'admin/approval-matrix',
        loadComponent: () => import('./modules/admin/approval-matrix/approval-matrix.component').then(m => m.ApprovalMatrixComponent),
        data: { screen: 'APPROVAL_MATRIX' }
      },
      { path: 'unauthorized', loadComponent: () => import('./shared/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];

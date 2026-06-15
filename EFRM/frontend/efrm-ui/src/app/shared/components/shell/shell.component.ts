import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  badge?: number;
}

@Component({
  selector: 'efrm-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatTooltipModule, MatBadgeModule,
    CommonModule
  ],
  template: `
<mat-sidenav-container class="shell-container" autosize>
  <!-- Sidebar -->
  <mat-sidenav #drawer mode="side" [opened]="!collapsed()"
    class="sidenav" fixedInViewport>
    <div class="sidenav-header">
      <img src="assets/upgb-logo.svg" alt="UPGB EFRM" class="logo" *ngIf="!collapsed()">
      <img src="assets/upgb-icon.svg" alt="UPGB" class="logo-icon" *ngIf="collapsed()">
      <button mat-icon-button (click)="collapsed.set(!collapsed())" class="collapse-btn">
        <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
      </button>
    </div>

    <mat-nav-list>
      @for (item of visibleNavItems; track item.screen) {
        <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link"
           [matTooltip]="collapsed() ? item.label : ''" matTooltipPosition="right">
          <mat-icon matListItemIcon
            [matBadge]="item.badge || null" matBadgeColor="warn" matBadgeSize="small">
            {{ item.icon }}
          </mat-icon>
          <span matListItemTitle *ngIf="!collapsed()">{{ item.label }}</span>
        </a>
      }
    </mat-nav-list>
  </mat-sidenav>

  <!-- Main content -->
  <mat-sidenav-content class="main-content">
    <mat-toolbar color="primary" class="top-bar">
      <span class="spacer"></span>

      <!-- Approvals badge -->
      <button mat-icon-button routerLink="/approvals" matTooltip="Pending Approvals">
        <mat-icon [matBadge]="pendingApprovals()" matBadgeColor="accent" matBadgeSize="small">
          approval
        </mat-icon>
      </button>

      <!-- User menu -->
      <button mat-button class="user-chip">
        <mat-icon>account_circle</mat-icon>
        <span>{{ auth.user()?.fullName }}</span>
        <small class="position-tag">{{ auth.user()?.primaryPosition }}</small>
      </button>
      <button mat-icon-button (click)="auth.logout()" matTooltip="Sign Out">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>

    <div class="content-area">
      <router-outlet />
    </div>
  </mat-sidenav-content>
</mat-sidenav-container>
  `,
  styles: [`
/* Shell container */
.shell-container { height: 100vh; }

/* ── Sidenav ────────────────────────────────────────────────────── */
.sidenav {
  width: 248px;
  background: linear-gradient(180deg, #1a237e 0%, #283593 100%);
  color: #fff;
  transition: width 220ms cubic-bezier(.4,0,.2,1);
  border-right: none !important;
  box-shadow: 2px 0 16px rgba(26,35,126,.2);
}

/* Header: logo + title */
.sidenav-header {
  display: flex; align-items: center; gap: 10px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,.1);
  margin-bottom: 8px;
}
.logo      { height: 34px; flex: 1; }
.logo-icon { height: 28px; width: 28px; margin: 0 auto; }
.collapse-btn { color: rgba(255,255,255,.6); flex-shrink: 0; }
.collapse-btn:hover { color: #fff; }

/* Nav links */
mat-nav-list {
  padding: 0 8px !important;
}
mat-nav-list a {
  color: rgba(255,255,255,.7) !important;
  border-radius: 10px !important;
  margin: 2px 0 !important;
  height: 44px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  transition: background .15s, color .15s !important;
}
mat-nav-list a:hover {
  background: rgba(255,255,255,.08) !important;
  color: #fff !important;
}
mat-nav-list a.active-link {
  background: rgba(255,255,255,.18) !important;
  color: #fff !important;
  font-weight: 700 !important;
  box-shadow: inset 3px 0 0 #f48fb1;
}

/* ── Top toolbar ────────────────────────────────────────────────── */
.top-bar {
  background: #fff !important;
  border-bottom: 1px solid #e8e8e8 !important;
  box-shadow: 0 1px 6px rgba(0,0,0,.06) !important;
  color: #212121 !important;
  height: 58px !important;
}
.spacer { flex: 1; }

.user-chip {
  display: flex; align-items: center; gap: 8px;
  color: #212121 !important;
  padding: 0 12px;
  border-radius: 8px;
  background: #f4f6f9;
  height: 38px;
  font-size: 13px;
  font-weight: 600;
}
.user-chip mat-icon { color: #3949ab; }
.position-tag {
  font-size: 11px; color: #757575; font-weight: 400;
  margin-left: 2px;
}

/* ── Content area ───────────────────────────────────────────────── */
.content-area {
  padding: 20px 24px;
  background: #eef0f5;
  min-height: calc(100vh - 58px);
  overflow-y: auto;
}
  `]
})
export class ShellComponent {
  collapsed = signal(false);
  pendingApprovals = signal(0);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',         route: '/dashboard',          screen: 'DASHBOARD' },
    { label: 'Alert Queue',     icon: 'notifications',     route: '/alerts',             screen: 'ALERT_LIST' },
    { label: 'Case Management', icon: 'folder_open',       route: '/cases',              screen: 'CASE_LIST' },
    { label: 'Rule Engine',     icon: 'rule',              route: '/rules',              screen: 'RULE_LIST' },
    { label: 'Approvals',       icon: 'approval',          route: '/approvals',          screen: 'APPROVAL_QUEUE' },
    { label: 'Customer 360°',   icon: 'person',            route: '/profiling',          screen: 'CUSTOMER_PROFILE' },
    { label: 'Reports & MIS',   icon: 'bar_chart',         route: '/reports',            screen: 'REPORTS' },
    { label: 'User Management', icon: 'manage_accounts',   route: '/admin/users',        screen: 'ADMIN_USERS' },
    { label: 'Access Matrix',   icon: 'security',          route: '/admin/access',       screen: 'ADMIN_ACCESS' },
    { label: 'Approval Matrix', icon: 'grid_on',           route: '/admin/approval-matrix', screen: 'APPROVAL_MATRIX' },
  ];

  get visibleNavItems() {
    return this.navItems.filter(n => this.auth.hasScreen(n.screen));
  }

  constructor(readonly auth: AuthService) {}
}

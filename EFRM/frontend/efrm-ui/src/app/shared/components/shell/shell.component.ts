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
      <img src="assets/upgb-logo.svg" alt="UPGB" class="logo" *ngIf="!collapsed()">
      <span class="app-title" *ngIf="!collapsed()">EFRM</span>
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
.shell-container { height: 100vh; }
.sidenav {
  width: 240px; background: #1a237e; color: #fff;
  transition: width 200ms ease;
}
.sidenav-header {
  display: flex; align-items: center; gap: 8px;
  padding: 16px; border-bottom: 1px solid rgba(255,255,255,.15);
}
.logo { height: 36px; }
.app-title { font-size: 18px; font-weight: 700; color: #fff; }
.collapse-btn { margin-left: auto; color: #fff; }
mat-nav-list a { color: rgba(255,255,255,.8); border-radius: 8px; margin: 2px 8px; }
mat-nav-list a.active-link { background: rgba(255,255,255,.15); color: #fff; }
.top-bar { background: #283593; box-shadow: 0 2px 4px rgba(0,0,0,.3); }
.spacer { flex: 1; }
.user-chip { display: flex; align-items: center; gap: 6px; color: #fff; }
.position-tag { opacity: .7; margin-left: 4px; font-size: 11px; }
.content-area { padding: 24px; background: #f5f5f5; min-height: calc(100vh - 64px); }
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

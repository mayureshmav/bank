import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  screen: string;
  section?: string;
  badge?: number;
}

@Component({
  selector: 'efrm-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatTooltipModule, MatBadgeModule,
    MatDividerModule, CommonModule
  ],
  template: `
<div class="shell-layout">

  <!-- ── Sidebar ─────────────────────────────────────────────────── -->
  <aside class="sidebar" [class.sidebar--collapsed]="collapsed()">

    <!-- Header -->
    <div class="sidebar__header">
      <div class="sidebar__brand" [class.sidebar__brand--collapsed]="collapsed()">
        <img src="assets/upgb-icon.svg" alt="UPGB" class="sidebar__icon">
        <span class="sidebar__wordmark">
          <span class="sidebar__wordmark-main">UPGB</span>
          <span class="sidebar__wordmark-sub">EFRM Platform</span>
        </span>
      </div>
      <button mat-icon-button class="sidebar__toggle"
              (click)="collapsed.set(!collapsed())"
              [matTooltip]="collapsed() ? 'Expand menu' : 'Collapse menu'"
              matTooltipPosition="right">
        <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar__nav">
      @for (item of visibleNavItems; track item.screen) {
        <!-- Section label -->
        @if (item.section && !collapsed() && isFirstInSection(item)) {
          <div class="sidebar__section-label">{{ item.section }}</div>
        }

        <a class="sidebar__link"
           [routerLink]="item.route"
           routerLinkActive="sidebar__link--active"
           [matTooltip]="collapsed() ? item.label : ''"
           matTooltipPosition="right">
          <mat-icon class="sidebar__link-icon"
                    [matBadge]="item.badge ?? null"
                    matBadgeColor="warn"
                    matBadgeSize="small">{{ item.icon }}</mat-icon>
          <span class="sidebar__link-label">{{ item.label }}</span>
        </a>
      }
    </nav>

    <!-- Footer: user info -->
    <div class="sidebar__footer" [class.sidebar__footer--collapsed]="collapsed()">
      <div class="sidebar__user">
        <mat-icon class="sidebar__user-avatar">account_circle</mat-icon>
        <div class="sidebar__user-info">
          <span class="sidebar__user-name">{{ auth.user()?.fullName }}</span>
          <span class="sidebar__user-role">{{ auth.user()?.primaryPosition }}</span>
        </div>
      </div>
      <button mat-icon-button class="sidebar__logout"
              (click)="auth.logout()" matTooltip="Sign Out" matTooltipPosition="right">
        <mat-icon>logout</mat-icon>
      </button>
    </div>
  </aside>

  <!-- ── Main area ───────────────────────────────────────────────── -->
  <div class="main">

    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar__left">
        <span class="topbar__page-title">{{ currentPageTitle }}</span>
      </div>
      <div class="topbar__right">
        <button mat-icon-button routerLink="/approvals"
                matTooltip="Pending Approvals" class="topbar__icon-btn">
          <mat-icon [matBadge]="pendingApprovals() || null"
                    matBadgeColor="warn" matBadgeSize="small">approval</mat-icon>
        </button>
        <button mat-icon-button class="topbar__icon-btn" matTooltip="Notifications">
          <mat-icon>notifications_none</mat-icon>
        </button>
        <div class="topbar__divider"></div>
        <div class="topbar__user">
          <div class="topbar__avatar">
            {{ auth.user()?.fullName?.[0] ?? 'U' }}
          </div>
          <div class="topbar__user-info">
            <span class="topbar__user-name">{{ auth.user()?.fullName }}</span>
            <span class="topbar__user-loc">{{ auth.user()?.primaryLocation }}</span>
          </div>
        </div>
        <button mat-icon-button class="topbar__icon-btn topbar__logout-btn"
                (click)="auth.logout()" matTooltip="Sign Out">
          <mat-icon>logout</mat-icon>
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="content">
      <router-outlet />
    </main>
  </div>
</div>
  `,
  styles: [`
/* ── Layout wrapper ────────────────────────────────────────────────── */
:host { display: block; height: 100vh; overflow: hidden; }

.shell-layout {
  display: flex;
  height: 100vh;
  background: #F1F5F9;
}

/* ── Sidebar ────────────────────────────────────────────────────────── */
.sidebar {
  width: 256px;
  min-width: 256px;
  background: #0D1B4B;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  transition: width 240ms cubic-bezier(.4,0,.2,1),
              min-width 240ms cubic-bezier(.4,0,.2,1);
  box-shadow: 4px 0 20px rgba(0,0,0,.25);
  position: relative;
  z-index: 100;
}
.sidebar--collapsed {
  width: 68px;
  min-width: 68px;
}

/* Header */
.sidebar__header {
  display: flex;
  align-items: center;
  padding: 0 12px 0 16px;
  height: 64px;
  border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  overflow: hidden;
}
.sidebar__brand--collapsed .sidebar__wordmark { opacity: 0; width: 0; }

.sidebar__icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
}
.sidebar__wordmark {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 180ms, width 240ms;
}
.sidebar__wordmark-main {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  letter-spacing: .5px;
}
.sidebar__wordmark-sub {
  font-size: 9.5px;
  font-weight: 500;
  color: rgba(255,255,255,.45);
  letter-spacing: 1.2px;
  text-transform: uppercase;
}
.sidebar__toggle {
  color: rgba(255,255,255,.4) !important;
  flex-shrink: 0;
}
.sidebar__toggle:hover { color: #fff !important; }

/* Nav */
.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 10px;
  scrollbar-width: none;
}
.sidebar__nav::-webkit-scrollbar { display: none; }

.sidebar__section-label {
  font-size: 9.5px;
  font-weight: 700;
  color: rgba(255,255,255,.3);
  letter-spacing: 1.4px;
  text-transform: uppercase;
  padding: 14px 8px 4px;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  height: 42px;
  border-radius: 10px;
  color: rgba(255,255,255,.6);
  text-decoration: none;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  transition: background 150ms, color 150ms;
  margin-bottom: 2px;
}
.sidebar__link:hover {
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.9);
}
.sidebar__link--active {
  background: rgba(59,130,246,.2);
  color: #93C5FD !important;
  font-weight: 600;
  border-left: 3px solid #3B82F6;
  padding-left: 7px;
}
.sidebar__link--active .sidebar__link-icon { color: #60A5FA; }

.sidebar__link-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: inherit;
}
.sidebar__link-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity 180ms;
}
.sidebar--collapsed .sidebar__link-label { opacity: 0; pointer-events: none; }
.sidebar--collapsed .sidebar__link { justify-content: center; padding: 0; gap: 0; border-left: none; padding-left: 0 !important; }
.sidebar--collapsed .sidebar__link--active { border-left: none; border-bottom: 2px solid #3B82F6; }

/* Footer */
.sidebar__footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
  overflow: hidden;
}
.sidebar__footer--collapsed { justify-content: center; padding: 12px 0; }
.sidebar__footer--collapsed .sidebar__user-info,
.sidebar__footer--collapsed .sidebar__logout { display: none; }
.sidebar__footer--collapsed .sidebar__user-avatar { font-size: 28px; width: 28px; height: 28px; }

.sidebar__user { display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; min-width: 0; }
.sidebar__user-avatar { color: rgba(255,255,255,.5); font-size: 28px; width: 28px; height: 28px; flex-shrink: 0; }
.sidebar__user-info { display: flex; flex-direction: column; overflow: hidden; }
.sidebar__user-name { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar__user-role { font-size: 10.5px; color: rgba(255,255,255,.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar__logout { color: rgba(255,255,255,.35) !important; flex-shrink: 0; }
.sidebar__logout:hover { color: #f87171 !important; }

/* ── Main area ──────────────────────────────────────────────────────── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  flex-shrink: 0;
  z-index: 10;
}
.topbar__left { display: flex; align-items: center; gap: 16px; }
.topbar__page-title {
  font-size: 17px; font-weight: 700; color: #0F172A;
  letter-spacing: -.2px;
}
.topbar__right { display: flex; align-items: center; gap: 4px; }
.topbar__icon-btn { color: #64748B !important; }
.topbar__icon-btn:hover { color: #0D1B4B !important; background: #F1F5F9 !important; }
.topbar__divider { width: 1px; height: 28px; background: #E2E8F0; margin: 0 8px; }
.topbar__user { display: flex; align-items: center; gap: 10px; margin: 0 4px; }
.topbar__avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #1E40AF, #3B82F6);
  color: #fff; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.topbar__user-info { display: flex; flex-direction: column; line-height: 1.3; }
.topbar__user-name { font-size: 13px; font-weight: 600; color: #0F172A; }
.topbar__user-loc { font-size: 11px; color: #94A3B8; }
.topbar__logout-btn { color: #94A3B8 !important; }
.topbar__logout-btn:hover { color: #EF4444 !important; }

/* Content */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  background: #F1F5F9;
}
  `]
})
export class ShellComponent {
  collapsed = signal(false);
  pendingApprovals = signal(0);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard',       icon: 'dashboard',         route: '/dashboard',             screen: 'DASHBOARD',       section: 'Overview' },
    { label: 'Alert Queue',     icon: 'notifications',     route: '/alerts',                screen: 'ALERT_LIST',      section: 'Operations' },
    { label: 'Case Management', icon: 'folder_open',       route: '/cases',                 screen: 'CASE_LIST' },
    { label: 'Approvals',       icon: 'approval',          route: '/approvals',             screen: 'APPROVAL_QUEUE' },
    { label: 'Rule Engine',     icon: 'rule',              route: '/rules',                 screen: 'RULE_LIST',       section: 'Intelligence' },
    { label: 'Customer 360°',   icon: 'person_search',     route: '/profiling',             screen: 'CUSTOMER_PROFILE' },
    { label: 'Reports & MIS',   icon: 'bar_chart',         route: '/reports',               screen: 'REPORTS' },
    { label: 'User Management', icon: 'manage_accounts',   route: '/admin/users',           screen: 'ADMIN_USERS',     section: 'Administration' },
    { label: 'Access Matrix',   icon: 'shield',            route: '/admin/access',          screen: 'ADMIN_ACCESS' },
    { label: 'Approval Matrix', icon: 'grid_on',           route: '/admin/approval-matrix', screen: 'APPROVAL_MATRIX' },
  ];

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(n => this.auth.hasScreen(n.screen));
  }

  get currentPageTitle(): string {
    const active = this.visibleNavItems.find(n => location.pathname.startsWith(n.route));
    return active?.label ?? 'EFRM Platform';
  }

  isFirstInSection(item: NavItem): boolean {
    if (!item.section) return false;
    const visible = this.visibleNavItems;
    const idx = visible.indexOf(item);
    return idx === 0 || visible[idx - 1].section !== item.section;
  }

  constructor(readonly auth: AuthService) {}
}

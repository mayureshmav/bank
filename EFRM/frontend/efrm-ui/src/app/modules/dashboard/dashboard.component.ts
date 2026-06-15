import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';

interface AlertStats {
  totalOpen: number;
  totalCritical: number;
  totalHighRisk: number;
  slaBreached: number;
  closedToday: number;
  assignedToMe: number;
  byChannel: { channel: string; count: number }[];
}

@Component({
  selector: 'efrm-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTableModule, MatChipsModule, MatBadgeModule
  ],
  template: `
<!-- ── Page header banner ─────────────────────────────────────────────── -->
<div class="dash-header">
  <div class="dash-header-left">
    <div class="dash-greeting">
      <span class="dash-greeting-icon">👋</span>
      <div>
        <h1 class="dash-title">Good {{ timeOfDay }}, {{ firstName }}</h1>
        <p class="dash-subtitle">
          <mat-icon class="loc-icon">location_on</mat-icon>
          {{ auth.user()?.primaryPosition }} &nbsp;·&nbsp; {{ auth.user()?.primaryLocation }}
          &nbsp;·&nbsp; {{ today | date:'EEEE, d MMMM yyyy' }}
        </p>
      </div>
    </div>
  </div>
  <div class="dash-header-right">
    <button mat-flat-button class="view-all-btn" routerLink="/alerts">
      <mat-icon>notifications_active</mat-icon> View Alert Queue
    </button>
  </div>
</div>

@if (loading()) {
  <div class="center-spinner"><mat-spinner diameter="48"></mat-spinner></div>
} @else {

<!-- ── KPI Cards ───────────────────────────────────────────────────────── -->
<div class="kpi-grid">

  <div class="kpi-card kpi-critical" routerLink="/alerts" [queryParams]="{riskLevel:'CRITICAL'}">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>emergency</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.totalCritical ?? 0 }}</div>
        <div class="kpi-lbl">Critical Alerts</div>
      </div>
    </div>
    <div class="kpi-trend">
      <mat-icon class="trend-icon">arrow_upward</mat-icon> Live
    </div>
  </div>

  <div class="kpi-card kpi-high" routerLink="/alerts" [queryParams]="{riskLevel:'HIGH'}">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>warning_amber</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.totalHighRisk ?? 0 }}</div>
        <div class="kpi-lbl">High Risk</div>
      </div>
    </div>
    <div class="kpi-trend">Needs attention</div>
  </div>

  <div class="kpi-card kpi-open" routerLink="/alerts">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>inbox</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.totalOpen ?? 0 }}</div>
        <div class="kpi-lbl">Total Open</div>
      </div>
    </div>
    <div class="kpi-trend">Active queue</div>
  </div>

  <div class="kpi-card kpi-breach" routerLink="/alerts" [queryParams]="{slaBreach:'true'}">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>timer_off</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.slaBreached ?? 0 }}</div>
        <div class="kpi-lbl">SLA Breached</div>
      </div>
    </div>
    <div class="kpi-trend kpi-trend-warn">Immediate action</div>
  </div>

  <div class="kpi-card kpi-mine" routerLink="/alerts" [queryParams]="{assignedToMe:'true'}">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>assignment_ind</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.assignedToMe ?? 0 }}</div>
        <div class="kpi-lbl">My Queue</div>
      </div>
    </div>
    <div class="kpi-trend">Assigned to me</div>
  </div>

  <div class="kpi-card kpi-closed">
    <div class="kpi-accent-bar"></div>
    <div class="kpi-body">
      <div class="kpi-icon-wrap"><mat-icon>check_circle</mat-icon></div>
      <div class="kpi-text">
        <div class="kpi-num">{{ stats()?.closedToday ?? 0 }}</div>
        <div class="kpi-lbl">Closed Today</div>
      </div>
    </div>
    <div class="kpi-trend kpi-trend-good">Good progress</div>
  </div>

</div>

<!-- ── Bottom row ─────────────────────────────────────────────────────── -->
<div class="bottom-row">

  <!-- Channel heatmap -->
  <div class="panel channel-panel">
    <div class="panel-header">
      <mat-icon class="panel-icon">cable</mat-icon>
      <span class="panel-title">Open Alerts by Channel</span>
    </div>
    <div class="channel-list">
      @for (ch of stats()?.byChannel; track ch.channel) {
      <div class="ch-row">
        <div class="ch-label" [style.color]="channelColor(ch.channel)">
          <span class="ch-dot" [style.background]="channelColor(ch.channel)"></span>
          {{ ch.channel }}
        </div>
        <div class="ch-bar-track">
          <div class="ch-bar-fill"
               [style.width.%]="barPct(ch.count)"
               [style.background]="channelColor(ch.channel)">
          </div>
        </div>
        <span class="ch-count">{{ ch.count }}</span>
      </div>
      }
      @if (!stats()?.byChannel?.length) {
        <div class="empty-channels">No open alerts</div>
      }
    </div>
  </div>

  <!-- Quick actions -->
  <div class="panel actions-panel">
    <div class="panel-header">
      <mat-icon class="panel-icon">bolt</mat-icon>
      <span class="panel-title">Quick Actions</span>
    </div>
    <div class="action-grid">
      <button class="action-btn action-primary"
              routerLink="/alerts" [queryParams]="{assignedToMe:'true'}">
        <mat-icon>assignment_ind</mat-icon>
        <span>My Queue</span>
      </button>
      <button class="action-btn action-approval" routerLink="/approvals">
        <mat-icon>approval</mat-icon>
        <span>Pending Approvals</span>
      </button>
      <button class="action-btn action-rule" routerLink="/rules/editor">
        <mat-icon>add_circle_outline</mat-icon>
        <span>New Rule</span>
      </button>
      <button class="action-btn action-report" routerLink="/reports">
        <mat-icon>summarize</mat-icon>
        <span>Run Report</span>
      </button>
      <button class="action-btn action-watchlist" routerLink="/watchlist">
        <mat-icon>block</mat-icon>
        <span>Watchlist</span>
      </button>
      <button class="action-btn action-case" routerLink="/cases">
        <mat-icon>folder_open</mat-icon>
        <span>Case Manager</span>
      </button>
    </div>
  </div>

  <!-- System health panel -->
  <div class="panel health-panel">
    <div class="panel-header">
      <mat-icon class="panel-icon">monitor_heart</mat-icon>
      <span class="panel-title">System Status</span>
    </div>
    <div class="health-list">
      @for (item of systemHealth; track item.name) {
      <div class="health-row">
        <span class="health-dot" [class]="'dot-' + item.status"></span>
        <span class="health-name">{{ item.name }}</span>
        <span class="health-badge" [class]="'badge-' + item.status">{{ item.label }}</span>
      </div>
      }
    </div>
  </div>

</div>

}
  `,
  styles: [`
/* ── Page header ─────────────────────────────────────────────────────── */
.dash-header {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%);
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 24px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(26,35,126,.35);
}
.dash-header-left { display: flex; align-items: center; }
.dash-greeting { display: flex; align-items: center; gap: 16px; }
.dash-greeting-icon { font-size: 36px; line-height: 1; }
.dash-title { margin: 0; font-size: 22px; font-weight: 700; color: #fff; }
.dash-subtitle {
  display: flex; align-items: center; gap: 4px;
  margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,.75);
}
.loc-icon { font-size: 14px; width: 14px; height: 14px; vertical-align: middle; }
.view-all-btn {
  background: rgba(255,255,255,.15) !important;
  color: #fff !important;
  border: 1px solid rgba(255,255,255,.3) !important;
  border-radius: 8px !important;
  font-weight: 600;
  backdrop-filter: blur(4px);
}
.view-all-btn:hover { background: rgba(255,255,255,.25) !important; }

/* ── KPI Cards ───────────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.kpi-card {
  background: #fff;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0,0,0,.07);
  transition: transform .18s ease, box-shadow .18s ease;
  display: flex; flex-direction: column;
  border: 1px solid #eeeeee;
}
.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
}
.kpi-accent-bar { height: 4px; width: 100%; border-radius: 2px 2px 0 0; }
.kpi-critical .kpi-accent-bar { background: linear-gradient(90deg, #c62828, #ef5350); }
.kpi-high     .kpi-accent-bar { background: linear-gradient(90deg, #e65100, #ff7043); }
.kpi-open     .kpi-accent-bar { background: linear-gradient(90deg, #1565c0, #42a5f5); }
.kpi-breach   .kpi-accent-bar { background: linear-gradient(90deg, #6a1b9a, #ab47bc); }
.kpi-mine     .kpi-accent-bar { background: linear-gradient(90deg, #00695c, #26a69a); }
.kpi-closed   .kpi-accent-bar { background: linear-gradient(90deg, #2e7d32, #66bb6a); }

.kpi-body { display: flex; align-items: center; gap: 14px; padding: 16px 16px 8px; flex: 1; }
.kpi-icon-wrap {
  display: flex; align-items: center; justify-content: center;
  width: 46px; height: 46px; border-radius: 10px; flex-shrink: 0;
}
.kpi-icon-wrap mat-icon { font-size: 24px; width: 24px; height: 24px; }
.kpi-critical .kpi-icon-wrap { background: #ffebee; color: #c62828; }
.kpi-high     .kpi-icon-wrap { background: #fff3e0; color: #e65100; }
.kpi-open     .kpi-icon-wrap { background: #e3f2fd; color: #1565c0; }
.kpi-breach   .kpi-icon-wrap { background: #f3e5f5; color: #6a1b9a; }
.kpi-mine     .kpi-icon-wrap { background: #e0f2f1; color: #00695c; }
.kpi-closed   .kpi-icon-wrap { background: #e8f5e9; color: #2e7d32; }

.kpi-num { font-size: 30px; font-weight: 800; line-height: 1; color: #1a1a2e; }
.kpi-lbl { font-size: 12px; color: #757575; font-weight: 500; margin-top: 3px; letter-spacing: .3px; }

.kpi-trend {
  font-size: 11px; color: #9e9e9e;
  padding: 4px 16px 10px;
  display: flex; align-items: center; gap: 4px;
}
.kpi-trend-warn { color: #c62828; font-weight: 600; }
.kpi-trend-good { color: #2e7d32; font-weight: 600; }
.trend-icon { font-size: 13px; width: 13px; height: 13px; color: #c62828; }

/* ── Bottom row ──────────────────────────────────────────────────────── */
.bottom-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; }
.panel {
  background: #fff;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 2px 10px rgba(0,0,0,.07);
  border: 1px solid #eeeeee;
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}
.panel-icon { color: #3949ab; font-size: 20px; width: 20px; height: 20px; }
.panel-title { font-size: 14px; font-weight: 700; color: #1a237e; letter-spacing: .2px; }

/* Channel list */
.channel-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.ch-row { display: flex; align-items: center; gap: 12px; }
.ch-label {
  display: flex; align-items: center; gap: 6px;
  min-width: 80px; font-size: 12px; font-weight: 600;
}
.ch-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.ch-bar-track {
  flex: 1; height: 10px; background: #f5f5f5;
  border-radius: 5px; overflow: hidden;
}
.ch-bar-fill { height: 100%; border-radius: 5px; transition: width .5s ease; min-width: 4px; }
.ch-count { font-size: 13px; font-weight: 700; color: #212121; min-width: 28px; text-align: right; }
.empty-channels { text-align: center; color: #9e9e9e; padding: 24px 0; font-size: 13px; }

/* Quick actions */
.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
.action-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 16px 10px; border-radius: 10px; border: none; cursor: pointer;
  font-size: 12px; font-weight: 600; transition: all .15s ease;
  line-height: 1.2; text-align: center;
}
.action-btn mat-icon { font-size: 22px; width: 22px; height: 22px; }
.action-btn:hover { transform: translateY(-2px); filter: brightness(.95); }
.action-primary  { background: #e8eaf6; color: #283593; }
.action-approval { background: #fff3e0; color: #e65100; }
.action-rule     { background: #f3e5f5; color: #6a1b9a; }
.action-report   { background: #e0f2f1; color: #00695c; }
.action-watchlist{ background: #ffebee; color: #c62828; }
.action-case     { background: #e3f2fd; color: #1565c0; }

/* System health */
.health-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.health-row { display: flex; align-items: center; gap: 10px; }
.health-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot-ok      { background: #43a047; box-shadow: 0 0 6px rgba(67,160,71,.5); }
.dot-warn    { background: #fb8c00; box-shadow: 0 0 6px rgba(251,140,0,.5); }
.dot-error   { background: #e53935; box-shadow: 0 0 6px rgba(229,57,53,.5); }
.health-name { flex: 1; font-size: 13px; color: #424242; font-weight: 500; }
.health-badge { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 10px; }
.badge-ok    { background: #e8f5e9; color: #2e7d32; }
.badge-warn  { background: #fff3e0; color: #e65100; }
.badge-error { background: #ffebee; color: #c62828; }

.center-spinner { display: flex; justify-content: center; padding: 80px; }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<AlertStats | null>(null);
  loading = signal(true);
  today = new Date();

  systemHealth = [
    { name: 'Scoring Engine',   status: 'ok',   label: 'Operational' },
    { name: 'Kafka Pipeline',   status: 'ok',   label: 'Operational' },
    { name: 'Redis Cache',      status: 'ok',   label: 'Operational' },
    { name: 'ML Models',        status: 'ok',   label: 'Live' },
    { name: 'CBS Integration',  status: 'warn', label: 'Degraded' },
    { name: 'Notification GW',  status: 'ok',   label: 'Operational' },
  ];

  get timeOfDay(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }

  get firstName(): string {
    return this.auth.user()?.fullName?.split(' ')[0] ?? 'User';
  }

  constructor(private http: HttpClient, readonly auth: AuthService) {}

  ngOnInit() {
    this.http.get<AlertStats>(`${environment.apiUrl}/alerts/stats`).subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.loadMockStats(); }
    });
  }

  /** Mock data so the dashboard looks good without a live backend */
  private loadMockStats() {
    this.stats.set({
      totalCritical: 12, totalHighRisk: 47, totalOpen: 183,
      slaBreached: 8, assignedToMe: 23, closedToday: 61,
      byChannel: [
        { channel: 'UPI', count: 74 }, { channel: 'MOBILE', count: 51 },
        { channel: 'CARD', count: 28 }, { channel: 'INTERNET', count: 19 },
        { channel: 'AEPS', count: 11 }, { channel: 'IMPS', count: 0 },
      ]
    });
  }

  channelColor(ch: string): string {
    const map: Record<string, string> = {
      UPI: '#7b1fa2', MOBILE: '#1565c0', INTERNET: '#0277bd',
      CARD: '#c62828', AEPS: '#2e7d32', IMPS: '#e65100',
      NEFT: '#00695c', RTGS: '#004d40', BBPS: '#827717'
    };
    return map[ch] ?? '#546e7a';
  }

  barPct(count: number): number {
    const max = Math.max(...(this.stats()?.byChannel.map(c => c.count) ?? [1]), 1);
    return Math.round((count / max) * 100);
  }
}

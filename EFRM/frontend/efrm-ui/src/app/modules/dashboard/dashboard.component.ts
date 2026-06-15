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
<div class="page-header">
  <div>
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">Welcome, {{ auth.user()?.fullName }} · {{ auth.user()?.primaryLocation }}</p>
  </div>
  <button mat-stroked-button color="primary" routerLink="/alerts">
    <mat-icon>open_in_new</mat-icon> View All Alerts
  </button>
</div>

@if (loading()) {
  <div class="center-spinner"><mat-spinner></mat-spinner></div>
} @else {

<!-- KPI Row -->
<div class="kpi-grid">
  <mat-card class="kpi-card critical" routerLink="/alerts" [queryParams]="{riskLevel:'CRITICAL'}">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>emergency</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.totalCritical }}</div>
        <div class="kpi-label">Critical Alerts</div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="kpi-card high" routerLink="/alerts" [queryParams]="{riskLevel:'HIGH'}">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>warning</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.totalHighRisk }}</div>
        <div class="kpi-label">High Risk</div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="kpi-card open" routerLink="/alerts">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>inbox</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.totalOpen }}</div>
        <div class="kpi-label">Total Open</div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="kpi-card breach" routerLink="/alerts" [queryParams]="{slaBreach:'true'}">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>timer_off</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.slaBreached }}</div>
        <div class="kpi-label">SLA Breached</div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="kpi-card mine" routerLink="/alerts" [queryParams]="{assignedToMe:'true'}">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>assignment_ind</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.assignedToMe }}</div>
        <div class="kpi-label">Assigned to Me</div>
      </div>
    </mat-card-content>
  </mat-card>

  <mat-card class="kpi-card closed">
    <mat-card-content>
      <div class="kpi-icon"><mat-icon>check_circle</mat-icon></div>
      <div class="kpi-data">
        <div class="kpi-value">{{ stats()?.closedToday }}</div>
        <div class="kpi-label">Closed Today</div>
      </div>
    </mat-card-content>
  </mat-card>
</div>

<!-- Channel breakdown -->
<div class="two-col">
  <mat-card class="channel-card">
    <mat-card-header>
      <mat-card-title>Open Alerts by Channel</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      @for (ch of stats()?.byChannel; track ch.channel) {
      <div class="channel-row">
        <mat-chip [style.background]="channelColor(ch.channel)" class="channel-chip">
          {{ ch.channel }}
        </mat-chip>
        <div class="channel-bar-wrap">
          <div class="channel-bar" [style.width.%]="barPct(ch.count)"></div>
        </div>
        <span class="channel-count">{{ ch.count }}</span>
      </div>
      }
    </mat-card-content>
  </mat-card>

  <mat-card class="quick-actions-card">
    <mat-card-header>
      <mat-card-title>Quick Actions</mat-card-title>
    </mat-card-header>
    <mat-card-content class="quick-actions">
      <button mat-stroked-button color="primary" routerLink="/alerts" [queryParams]="{assignedToMe:'true'}">
        <mat-icon>assignment_ind</mat-icon> My Queue
      </button>
      <button mat-stroked-button color="accent" routerLink="/approvals">
        <mat-icon>approval</mat-icon> Pending Approvals
      </button>
      <button mat-stroked-button routerLink="/rules/editor">
        <mat-icon>add_circle</mat-icon> New Rule
      </button>
      <button mat-stroked-button routerLink="/reports">
        <mat-icon>summarize</mat-icon> Run Report
      </button>
    </mat-card-content>
  </mat-card>
</div>

}
  `,
  styles: [`
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1a237e; }
.page-subtitle { margin: 4px 0 0; color: #666; font-size: 14px; }
.kpi-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 16px; margin-bottom: 24px; }
.kpi-card { cursor: pointer; border-radius: 10px !important; transition: transform .15s; }
.kpi-card:hover { transform: translateY(-2px); }
mat-card-content { display: flex; gap: 12px; align-items: center; padding: 16px !important; }
.kpi-icon mat-icon { font-size: 32px; width: 32px; height: 32px; }
.kpi-value { font-size: 28px; font-weight: 700; line-height: 1; }
.kpi-label { font-size: 12px; color: #666; margin-top: 2px; }
.kpi-card.critical .kpi-icon { color: #c62828; }
.kpi-card.high     .kpi-icon { color: #e65100; }
.kpi-card.open     .kpi-icon { color: #1565c0; }
.kpi-card.breach   .kpi-icon { color: #6a1b9a; }
.kpi-card.mine     .kpi-icon { color: #00695c; }
.kpi-card.closed   .kpi-icon { color: #388e3c; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.channel-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.channel-chip { font-size: 11px; min-height: 24px; color: #fff; }
.channel-bar-wrap { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
.channel-bar { height: 100%; background: #3949ab; border-radius: 4px; transition: width .4s; }
.channel-count { font-weight: 600; min-width: 30px; text-align: right; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.quick-actions button { justify-content: flex-start; gap: 8px; padding: 12px 16px; }
.center-spinner { display: flex; justify-content: center; padding: 64px; }
  `]
})
export class DashboardComponent implements OnInit {
  stats = signal<AlertStats | null>(null);
  loading = signal(true);

  constructor(private http: HttpClient, readonly auth: AuthService) {}

  ngOnInit() {
    this.http.get<AlertStats>(`${environment.apiUrl}/alerts/stats`).subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  channelColor(ch: string): string {
    const map: Record<string, string> = {
      UPI: '#7b1fa2', MOBILE: '#1565c0', INTERNET: '#0277bd',
      CARD: '#c62828', AEPS: '#2e7d32', IMPS: '#e65100', NEFT: '#00695c'
    };
    return map[ch] ?? '#546e7a';
  }

  barPct(count: number): number {
    const max = Math.max(...(this.stats()?.byChannel.map(c => c.count) ?? [1]));
    return max === 0 ? 0 : Math.round((count / max) * 100);
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'efrm-approval-queue',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatTabsModule, MatChipsModule, MatProgressBarModule
  ],
  template: `
<div class="page-header">
  <div>
    <h1 class="page-title">Approval Queue</h1>
    <p class="page-subtitle">Documents awaiting your decision</p>
  </div>
</div>

<mat-tab-group>
  <mat-tab label="Pending My Action ({{ pending().length }})">
    <mat-card>
      @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
      <table mat-table [dataSource]="pending()" class="approval-table">
        <ng-container matColumnDef="requestRef">
          <th mat-header-cell *matHeaderCellDef>Reference</th>
          <td mat-cell *matCellDef="let r">
            <a [routerLink]="['/approvals', r.requestId]" class="ref-link">{{ r.requestRef }}</a>
          </td>
        </ng-container>
        <ng-container matColumnDef="docTypeName">
          <th mat-header-cell *matHeaderCellDef>Document Type</th>
          <td mat-cell *matCellDef="let r">{{ r.docTypeName }}</td>
        </ng-container>
        <ng-container matColumnDef="entityType">
          <th mat-header-cell *matHeaderCellDef>Entity</th>
          <td mat-cell *matCellDef="let r">
            <mat-chip>{{ r.entityType }}</mat-chip>
          </td>
        </ng-container>
        <ng-container matColumnDef="amount">
          <th mat-header-cell *matHeaderCellDef>Amount (₹)</th>
          <td mat-cell *matCellDef="let r">{{ r.amount ? (r.amount | number:'1.2-2') : '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="requestedByName">
          <th mat-header-cell *matHeaderCellDef>Requested By</th>
          <td mat-cell *matCellDef="let r">{{ r.requestedByName }}</td>
        </ng-container>
        <ng-container matColumnDef="requestedAt">
          <th mat-header-cell *matHeaderCellDef>Submitted</th>
          <td mat-cell *matCellDef="let r">{{ r.requestedAt | date:'dd/MM/yy HH:mm' }}</td>
        </ng-container>
        <ng-container matColumnDef="currentStageName">
          <th mat-header-cell *matHeaderCellDef>Stage</th>
          <td mat-cell *matCellDef="let r">
            <span class="stage-badge">{{ r.stageNumber }}/{{ r.totalStages }} – {{ r.currentStageName }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let r">
            <button mat-raised-button color="primary" [routerLink]="['/approvals', r.requestId]">
              Review
            </button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="pendingCols"></tr>
        <tr mat-row *matRowDef="let row; columns: pendingCols"></tr>
      </table>
      @if (pending().length === 0 && !loading()) {
        <div class="empty-state">
          <mat-icon>check_circle_outline</mat-icon>
          <p>No pending approvals</p>
        </div>
      }
    </mat-card>
  </mat-tab>

  <mat-tab label="My Requests ({{ myRequests().length }})">
    <mat-card>
      <table mat-table [dataSource]="myRequests()" class="approval-table">
        <ng-container matColumnDef="requestRef">
          <th mat-header-cell *matHeaderCellDef>Reference</th>
          <td mat-cell *matCellDef="let r">
            <a [routerLink]="['/approvals', r.requestId]" class="ref-link">{{ r.requestRef }}</a>
          </td>
        </ng-container>
        <ng-container matColumnDef="docTypeName">
          <th mat-header-cell *matHeaderCellDef>Document Type</th>
          <td mat-cell *matCellDef="let r">{{ r.docTypeName }}</td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let r">
            <span class="status-chip" [class]="'status-' + r.status.toLowerCase()">{{ r.status }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="requestedAt">
          <th mat-header-cell *matHeaderCellDef>Submitted</th>
          <td mat-cell *matCellDef="let r">{{ r.requestedAt | date:'dd/MM/yy HH:mm' }}</td>
        </ng-container>
        <ng-container matColumnDef="currentStageName">
          <th mat-header-cell *matHeaderCellDef>Current Stage</th>
          <td mat-cell *matCellDef="let r">{{ r.currentStageName }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="myRequestCols"></tr>
        <tr mat-row *matRowDef="let row; columns: myRequestCols"></tr>
      </table>
    </mat-card>
  </mat-tab>
</mat-tab-group>
  `,
  styles: [`
.page-header { margin-bottom: 20px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1a237e; }
.page-subtitle { margin: 4px 0 0; color: #666; font-size: 13px; }
.approval-table { width: 100%; }
.ref-link { color: #1565c0; font-weight: 600; text-decoration: none; }
.ref-link:hover { text-decoration: underline; }
.stage-badge { background: #e3f2fd; color: #1565c0; padding: 3px 8px; border-radius: 10px; font-size: 12px; }
.status-chip { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
.status-pending   { background: #fff3e0; color: #e65100; }
.status-approved  { background: #e8f5e9; color: #1b5e20; }
.status-rejected  { background: #ffebee; color: #c62828; }
.status-in_review { background: #e3f2fd; color: #1565c0; }
.empty-state { text-align: center; padding: 48px; color: #9e9e9e; }
.empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; color: #43a047; }
  `]
})
export class ApprovalQueueComponent implements OnInit {
  pending = signal<any[]>([]);
  myRequests = signal<any[]>([]);
  loading = signal(false);

  pendingCols = ['requestRef','docTypeName','entityType','amount','requestedByName','requestedAt','currentStageName','actions'];
  myRequestCols = ['requestRef','docTypeName','status','requestedAt','currentStageName'];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loading.set(true);
    this.http.get<any[]>(`${environment.apiUrl}/approvals/pending`).subscribe(d => {
      this.pending.set(d); this.loading.set(false);
    });
    this.http.get<any[]>(`${environment.apiUrl}/approvals/my-requests`).subscribe(d => {
      this.myRequests.set(d);
    });
  }
}

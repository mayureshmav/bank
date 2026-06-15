import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SelectionModel } from '@angular/cdk/collections';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface AlertRow {
  alertId: number; alertRef: string; channel: string;
  customerId: string; transactionAmount: number; riskScore: number;
  riskLevel: string; status: string; fraudType: string;
  transactionTimestamp: string; assignedTo: string;
  isSlaBreach: boolean;
}

@Component({
  selector: 'efrm-alert-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatCheckboxModule,
    MatTooltipModule, MatProgressBarModule, MatSnackBarModule
  ],
  template: `
<div class="page-header">
  <div>
    <h1 class="page-title">Alert Queue</h1>
    <p class="page-subtitle">Real-time fraud alerts across all channels</p>
  </div>
  @if (auth.hasPermission('ALERT_LIST', 'BULK')) {
    <div class="bulk-actions" *ngIf="selection.selected.length > 0">
      <span class="sel-count">{{ selection.selected.length }} selected</span>
      <button mat-stroked-button (click)="bulkAssignToMe()">
        <mat-icon>assignment_ind</mat-icon> Assign to Me
      </button>
      <button mat-stroked-button color="warn" (click)="bulkClose()">
        <mat-icon>close</mat-icon> Close as FP
      </button>
    </div>
  }
</div>

<!-- Filters -->
<mat-card class="filter-card">
  <mat-card-content>
    <form [formGroup]="filters" class="filter-row">
      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Search</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput formControlName="search" placeholder="Alert ref, customer ID, txn ref">
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Channel</mat-label>
        <mat-select formControlName="channel">
          <mat-option value="">All</mat-option>
          @for (ch of channels; track ch) { <mat-option [value]="ch">{{ ch }}</mat-option> }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Risk Level</mat-label>
        <mat-select formControlName="riskLevel">
          <mat-option value="">All</mat-option>
          <mat-option value="CRITICAL">Critical</mat-option>
          <mat-option value="HIGH">High</mat-option>
          <mat-option value="MEDIUM">Medium</mat-option>
          <mat-option value="LOW">Low</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="filter-field">
        <mat-label>Status</mat-label>
        <mat-select formControlName="status">
          <mat-option value="">All</mat-option>
          <mat-option value="OPEN">Open</mat-option>
          <mat-option value="IN_INVESTIGATION">In Investigation</mat-option>
          <mat-option value="ESCALATED">Escalated</mat-option>
        </mat-select>
      </mat-form-field>

      <mat-checkbox formControlName="assignedToMe">My Queue</mat-checkbox>

      <button mat-icon-button (click)="load()" matTooltip="Refresh">
        <mat-icon>refresh</mat-icon>
      </button>
    </form>
  </mat-card-content>
</mat-card>

<!-- Table -->
<mat-card class="table-card">
  @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
  <table mat-table [dataSource]="dataSource" class="alert-table" matSort>

    <!-- Checkbox column -->
    <ng-container matColumnDef="select">
      <th mat-header-cell *matHeaderCellDef>
        <mat-checkbox (change)="$event.checked ? selectAll() : selection.clear()"
                      [checked]="selection.hasValue() && isAllSelected()"
                      [indeterminate]="selection.hasValue() && !isAllSelected()">
        </mat-checkbox>
      </th>
      <td mat-cell *matCellDef="let row">
        <mat-checkbox (click)="$event.stopPropagation()"
                      (change)="selection.toggle(row)"
                      [checked]="selection.isSelected(row)">
        </mat-checkbox>
      </td>
    </ng-container>

    <ng-container matColumnDef="riskScore">
      <th mat-header-cell *matHeaderCellDef mat-sort-header>Score</th>
      <td mat-cell *matCellDef="let row">
        <div class="risk-score-cell" [class]="'risk-' + row.riskLevel.toLowerCase()">
          {{ row.riskScore | number:'1.0-0' }}
        </div>
      </td>
    </ng-container>

    <ng-container matColumnDef="alertRef">
      <th mat-header-cell *matHeaderCellDef>Alert ID</th>
      <td mat-cell *matCellDef="let row">
        <a [routerLink]="['/alerts', row.alertId]" class="alert-link">{{ row.alertRef }}</a>
        @if (row.isSlaBreach) {
          <mat-icon class="sla-breach-icon" matTooltip="SLA Breached">timer_off</mat-icon>
        }
      </td>
    </ng-container>

    <ng-container matColumnDef="channel">
      <th mat-header-cell *matHeaderCellDef>Channel</th>
      <td mat-cell *matCellDef="let row">
        <mat-chip [style.background]="channelColor(row.channel)" class="channel-chip">
          {{ row.channel }}
        </mat-chip>
      </td>
    </ng-container>

    <ng-container matColumnDef="customerId">
      <th mat-header-cell *matHeaderCellDef>Customer</th>
      <td mat-cell *matCellDef="let row">
        <a [routerLink]="['/profiling', row.customerId]">{{ row.customerId }}</a>
      </td>
    </ng-container>

    <ng-container matColumnDef="transactionAmount">
      <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount (₹)</th>
      <td mat-cell *matCellDef="let row">{{ row.transactionAmount | number:'1.2-2' }}</td>
    </ng-container>

    <ng-container matColumnDef="status">
      <th mat-header-cell *matHeaderCellDef>Status</th>
      <td mat-cell *matCellDef="let row">
        <span class="status-badge" [class]="'status-' + row.status.toLowerCase().replace('_','-')">
          {{ row.status | titlecase }}
        </span>
      </td>
    </ng-container>

    <ng-container matColumnDef="assignedTo">
      <th mat-header-cell *matHeaderCellDef>Assigned To</th>
      <td mat-cell *matCellDef="let row">{{ row.assignedTo || '—' }}</td>
    </ng-container>

    <ng-container matColumnDef="transactionTimestamp">
      <th mat-header-cell *matHeaderCellDef mat-sort-header>Time</th>
      <td mat-cell *matCellDef="let row">{{ row.transactionTimestamp | date:'dd/MM/yy HH:mm' }}</td>
    </ng-container>

    <ng-container matColumnDef="actions">
      <th mat-header-cell *matHeaderCellDef>Actions</th>
      <td mat-cell *matCellDef="let row">
        <button mat-icon-button [routerLink]="['/alerts', row.alertId]" matTooltip="View">
          <mat-icon>open_in_new</mat-icon>
        </button>
        @if (auth.hasPermission('ALERT_LIST', 'ASSIGN')) {
        <button mat-icon-button (click)="assignToMe(row)" matTooltip="Assign to Me">
          <mat-icon>assignment_ind</mat-icon>
        </button>
        }
      </td>
    </ng-container>

    <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
    <tr mat-row *matRowDef="let row; columns: displayedColumns"
        [class.sla-row]="row.isSlaBreach"></tr>
  </table>

  <mat-paginator [length]="total()" [pageSize]="25"
                 [pageSizeOptions]="[25,50,100]"
                 (page)="onPage($event)">
  </mat-paginator>
</mat-card>
  `,
  styles: [`
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1a237e; }
.page-subtitle { margin: 4px 0 0; color: #666; font-size: 13px; }
.filter-card { margin-bottom: 16px; }
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-field { min-width: 160px; }
.table-card { overflow: hidden; }
.alert-table { width: 100%; }
.risk-score-cell {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 28px; border-radius: 14px; font-weight: 700; font-size: 13px;
}
.risk-critical { background: #ffcdd2; color: #c62828; }
.risk-high     { background: #ffe0b2; color: #bf360c; }
.risk-medium   { background: #fff9c4; color: #f57f17; }
.risk-low      { background: #c8e6c9; color: #1b5e20; }
.alert-link { color: #1565c0; text-decoration: none; font-weight: 600; }
.alert-link:hover { text-decoration: underline; }
.sla-breach-icon { font-size: 16px; color: #c62828; vertical-align: middle; margin-left: 4px; }
.channel-chip { font-size: 11px; color: #fff; min-height: 22px; }
.status-badge {
  padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500;
}
.status-open { background: #e3f2fd; color: #1565c0; }
.status-in-investigation { background: #fff3e0; color: #e65100; }
.status-escalated { background: #fce4ec; color: #880e4f; }
.status-closed-tp { background: #e8f5e9; color: #1b5e20; }
.status-closed-fp { background: #f3e5f5; color: #4a148c; }
.sla-row { background: #fff8f8; }
.bulk-actions { display: flex; align-items: center; gap: 12px; }
.sel-count { font-weight: 600; color: #1a237e; }
  `]
})
export class AlertListComponent implements OnInit {
  displayedColumns = ['select','riskScore','alertRef','channel','customerId',
                      'transactionAmount','status','assignedTo','transactionTimestamp','actions'];
  dataSource = new MatTableDataSource<AlertRow>([]);
  selection = new SelectionModel<AlertRow>(true, []);
  loading = signal(false);
  total = signal(0);
  page = 1;

  channels = ['UPI','MOBILE','INTERNET','CARD','AEPS','IMPS','NEFT','RTGS','BBPS','CBS','IVRS'];

  filters = this.fb.group({
    search: [''], channel: [''], riskLevel: [''],
    status: [''], assignedToMe: [false]
  });

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
    readonly auth: AuthService
  ) {}

  ngOnInit() {
    // Apply queryParams from dashboard links
    this.route.queryParams.subscribe(p => {
      if (p['riskLevel']) this.filters.patchValue({ riskLevel: p['riskLevel'] });
      if (p['assignedToMe']) this.filters.patchValue({ assignedToMe: true });
      this.load();
    });
    this.filters.valueChanges.subscribe(() => { this.page = 1; this.load(); });
  }

  load() {
    this.loading.set(true);
    const f = this.filters.value;
    let params = new HttpParams().set('page', this.page).set('pageSize', 25);
    if (f.search)       params = params.set('search', f.search);
    if (f.channel)      params = params.set('channel', f.channel);
    if (f.riskLevel)    params = params.set('riskLevel', f.riskLevel);
    if (f.status)       params = params.set('status', f.status);
    if (f.assignedToMe) params = params.set('assignedToMe', 'true');

    this.http.get<any>(`${environment.apiUrl}/alerts`, { params }).subscribe({
      next: res => { this.dataSource.data = res.items; this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onPage(e: PageEvent) { this.page = e.pageIndex + 1; this.load(); }
  isAllSelected() { return this.selection.selected.length === this.dataSource.data.length; }
  selectAll() { this.dataSource.data.forEach(row => this.selection.select(row)); }

  assignToMe(row: AlertRow) {
    this.http.post(`${environment.apiUrl}/alerts/${row.alertId}/assign`, { personId: 0 /* resolved server-side */ })
      .subscribe(() => { this.snack.open('Assigned to you', '', { duration: 2000 }); this.load(); });
  }

  bulkAssignToMe() {
    const ids = this.selection.selected.map(r => r.alertId);
    this.http.post(`${environment.apiUrl}/alerts/bulk-action`, { alertIds: ids, action: 'ASSIGN' })
      .subscribe(() => { this.snack.open('Bulk assigned', '', { duration: 2000 }); this.selection.clear(); this.load(); });
  }

  bulkClose() {
    const ids = this.selection.selected.map(r => r.alertId);
    this.http.post(`${environment.apiUrl}/alerts/bulk-action`, { alertIds: ids, action: 'CLOSE_FP', notes: 'Bulk FP closure' })
      .subscribe(() => { this.snack.open('Closed as FP', '', { duration: 2000 }); this.selection.clear(); this.load(); });
  }

  channelColor(ch: string): string {
    const m: Record<string,string> = {
      UPI:'#7b1fa2',MOBILE:'#1565c0',INTERNET:'#0277bd',CARD:'#c62828',
      AEPS:'#2e7d32',IMPS:'#e65100',NEFT:'#00695c',RTGS:'#004d40'
    };
    return m[ch] ?? '#546e7a';
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface MatrixRow { screenCode: string; screenName: string; moduleName: string; grants: Record<string, boolean>; }
interface Position { positionId: number; positionCode: string; positionName: string; positionLevel: number; }
interface Permission { permissionId: number; permissionCode: string; permissionName: string; isDataWrite: boolean; }

@Component({
  selector: 'efrm-access-matrix',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatTableModule, MatCheckboxModule, MatSelectModule,
    MatFormFieldModule, MatButtonModule, MatIconModule, MatSnackBarModule,
    MatProgressBarModule, MatTooltipModule, MatChipsModule
  ],
  template: `
<!-- ── Header ─────────────────────────────────────────────────────────── -->
<div class="page-header">
  <div>
    <h1 class="page-title">Access Control Matrix</h1>
    <p class="page-subtitle">Configure screen and permission grants per position role</p>
  </div>
  <div class="header-actions">
    @if (hasChanges()) {
      <span class="unsaved-badge">
        <mat-icon>edit_note</mat-icon> {{ changedCount() }} unsaved change{{ changedCount() > 1 ? 's' : '' }}
      </span>
    }
    <button mat-stroked-button (click)="revert()" [disabled]="!hasChanges()">
      <mat-icon>undo</mat-icon> Revert
    </button>
    <button mat-raised-button color="primary" (click)="saveMatrix()" [disabled]="!hasChanges() || saving()">
      <mat-icon>save</mat-icon> Save Changes
    </button>
  </div>
</div>

<!-- ── Position selector + stats ──────────────────────────────────────── -->
<div class="controls-row">
  <mat-card class="position-card">
    <mat-card-content>
      <p class="selector-label">Select Position</p>
      <div class="position-list">
        @for (p of positions(); track p.positionId) {
          <button class="pos-btn" [class.pos-btn--active]="selectedPosition === p.positionId"
                  (click)="selectPosition(p.positionId)">
            <span class="pos-name">{{ p.positionName }}</span>
            <span class="pos-code">{{ p.positionCode }}</span>
          </button>
        }
      </div>
    </mat-card-content>
  </mat-card>

  @if (selectedPosition && !loading()) {
  <mat-card class="summary-card">
    <mat-card-content>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-val">{{ totalGranted() }}</span>
          <span class="summary-lbl">Permissions Granted</span>
        </div>
        <div class="summary-item">
          <span class="summary-val">{{ screensWithAccess() }}</span>
          <span class="summary-lbl">Screens Accessible</span>
        </div>
        <div class="summary-item">
          <span class="summary-val">{{ totalGranted() > 0 ? pct() + '%' : '0%' }}</span>
          <span class="summary-lbl">Coverage</span>
        </div>
      </div>
      <div class="legend">
        <span class="legend-item"><span class="legend-dot legend-dot--read"></span>Read-only</span>
        <span class="legend-item"><span class="legend-dot legend-dot--write"></span>Write</span>
      </div>
    </mat-card-content>
  </mat-card>
  }
</div>

<!-- ── Matrix table ────────────────────────────────────────────────────── -->
@if (selectedPosition) {
<mat-card class="matrix-card">
  @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

  <div class="matrix-scroll">
    <table class="matrix-table">
      <thead>
        <tr>
          <th class="col-module">Module</th>
          <th class="col-screen">Screen</th>
          @for (perm of permissions(); track perm.permissionCode) {
            <th class="col-perm" [class.col-perm--write]="perm.isDataWrite"
                [matTooltip]="perm.isDataWrite ? 'Write permission' : 'Read permission'">
              <div class="perm-header">
                <mat-icon class="perm-icon">{{ permIcon(perm.permissionCode) }}</mat-icon>
                <span>{{ perm.permissionCode }}</span>
              </div>
            </th>
          }
          <th class="col-all">
            <span class="all-label">ALL</span>
          </th>
        </tr>
      </thead>
      <tbody>
        @for (row of matrix(); track row.screenCode; let i = $index) {
          <tr [class.module-first]="isModuleFirst(i)" [class.row-granted]="hasAnyGrant(row)">
            <td class="cell-module">
              @if (isModuleFirst(i)) {
                <span class="module-tag">{{ row.moduleName }}</span>
              }
            </td>
            <td class="cell-screen">
              <div class="screen-info">
                <mat-icon class="screen-icon">{{ screenIcon(row.screenCode) }}</mat-icon>
                {{ row.screenName }}
              </div>
            </td>
            @for (perm of permissions(); track perm.permissionCode) {
              <td class="cell-perm" [class.cell-perm--write]="perm.isDataWrite">
                <mat-checkbox
                  [checked]="row.grants[perm.permissionCode]"
                  (change)="toggle(row, perm.permissionCode, $event.checked)"
                  color="primary">
                </mat-checkbox>
              </td>
            }
            <td class="cell-all">
              <mat-checkbox
                [checked]="allGranted(row)"
                [indeterminate]="someGranted(row) && !allGranted(row)"
                (change)="toggleAll(row, $event.checked)"
                color="accent">
              </mat-checkbox>
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  <!-- Column-wide grant all -->
  <div class="grant-all-row">
    <span class="grant-all-label">Grant / Revoke all for column:</span>
    @for (perm of permissions(); track perm.permissionCode) {
      <button mat-stroked-button class="grant-col-btn" (click)="toggleColumn(perm.permissionCode)">
        {{ perm.permissionCode }}
      </button>
    }
    <button mat-stroked-button color="warn" (click)="revokeAll()">
      <mat-icon>block</mat-icon> Revoke All
    </button>
  </div>
</mat-card>
}

@if (!selectedPosition) {
  <div class="select-prompt">
    <mat-icon>touch_app</mat-icon>
    <p>Select a position from the left to view and edit its access matrix</p>
  </div>
}
  `,
  styles: [`
.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
.page-title { margin:0; font-size:22px; font-weight:700; color:#0F172A; }
.page-subtitle { margin:4px 0 0; color:#64748B; font-size:13px; }
.header-actions { display:flex; align-items:center; gap:10px; }
.unsaved-badge { display:flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#D97706; background:#FEF3C7; padding:4px 12px; border-radius:20px; }
.unsaved-badge mat-icon { font-size:14px; width:14px; height:14px; }

.controls-row { display:grid; grid-template-columns:280px 1fr; gap:16px; margin-bottom:16px; }

.position-card { height:fit-content; }
.selector-label { margin:0 0 10px; font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; }
.position-list { display:flex; flex-direction:column; gap:4px; }
.pos-btn { text-align:left; padding:10px 14px; border-radius:10px; border:1px solid #E2E8F0; background:#fff; cursor:pointer; transition:all 150ms; display:flex; flex-direction:column; gap:2px; }
.pos-btn:hover { background:#F8FAFC; border-color:#CBD5E1; }
.pos-btn--active { background:rgba(59,130,246,.1); border-color:#3B82F6; }
.pos-name { font-size:13px; font-weight:600; color:#0F172A; }
.pos-code { font-size:11px; color:#94A3B8; font-family:monospace; }
.pos-btn--active .pos-name { color:#1D4ED8; }
.pos-btn--active .pos-code { color:#3B82F6; }

.summary-card { }
.summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; }
.summary-item { text-align:center; }
.summary-val { font-size:28px; font-weight:800; color:#0D1B4B; display:block; line-height:1; }
.summary-lbl { font-size:11px; color:#64748B; margin-top:4px; display:block; }
.legend { display:flex; gap:20px; justify-content:center; padding-top:4px; border-top:1px solid #F1F5F9; }
.legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#64748B; }
.legend-dot { width:10px; height:10px; border-radius:2px; }
.legend-dot--read { background:#3B82F6; }
.legend-dot--write { background:#F59E0B; }

.matrix-card { overflow:hidden; }
.matrix-scroll { overflow-x:auto; }
.matrix-table { width:100%; border-collapse:collapse; font-size:13px; }
.matrix-table thead { position:sticky; top:0; z-index:2; }
.matrix-table th { background:#0D1B4B; color:#fff; padding:10px 12px; text-align:center; white-space:nowrap; font-size:11.5px; font-weight:700; letter-spacing:.4px; }
.matrix-table th:first-child,
.matrix-table th:nth-child(2) { text-align:left; }
.col-module { width:120px; }
.col-screen { min-width:200px; }
.col-perm { width:80px; }
.col-perm--write { background:#1A2B5E; }
.col-all { width:70px; background:#1E3A8A; }
.all-label { font-size:10px; font-weight:800; letter-spacing:1px; }

.perm-header { display:flex; flex-direction:column; align-items:center; gap:2px; }
.perm-icon { font-size:14px; width:14px; height:14px; color:rgba(255,255,255,.6); }

.matrix-table td { padding:6px 12px; border-bottom:1px solid #F1F5F9; }
.module-first td { border-top:2px solid #E2E8F0; }
.row-granted { background:#FAFBFF; }

.cell-module { padding-left:16px; }
.module-tag { font-size:10.5px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:.8px; background:#E2E8F0; padding:2px 8px; border-radius:4px; white-space:nowrap; }
.cell-screen { }
.screen-info { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; color:#1E293B; }
.screen-icon { font-size:15px; width:15px; height:15px; color:#94A3B8; }
.cell-perm { text-align:center; }
.cell-perm--write { background:rgba(245,158,11,.04); }
.cell-all { text-align:center; background:rgba(59,130,246,.04); }

.grant-all-row { display:flex; align-items:center; gap:8px; padding:12px 20px; border-top:1px solid #E2E8F0; background:#F8FAFC; flex-wrap:wrap; }
.grant-all-label { font-size:12px; font-weight:600; color:#64748B; }
.grant-col-btn { font-size:11.5px !important; padding:0 10px !important; height:30px !important; }

.select-prompt { text-align:center; padding:60px; color:#94A3B8; }
.select-prompt mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto 12px; }
  `]
})
export class AccessMatrixComponent implements OnInit {
  positions   = signal<Position[]>([]);
  permissions = signal<Permission[]>([]);
  matrix      = signal<MatrixRow[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  selectedPosition: number | null = null;
  private changes: { screenCode: string; permCode: string; granted: boolean }[] = [];
  private originalMatrix: MatrixRow[] = [];
  private lastModule = '';

  hasChanges()   { return this.changes.length > 0; }
  changedCount() { return this.changes.length; }
  totalGranted() { return this.matrix().flatMap(r => Object.values(r.grants)).filter(v => v).length; }
  screensWithAccess() { return this.matrix().filter(r => Object.values(r.grants).some(v => v)).length; }
  pct() {
    const total = this.matrix().length * this.permissions().length;
    return total ? Math.round(this.totalGranted() / total * 100) : 0;
  }

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() {
    this.http.get<Position[]>(`${environment.apiUrl}/admin/positions`).subscribe(d => this.positions.set(d));
    this.http.get<Permission[]>(`${environment.apiUrl}/admin/permissions`).subscribe(d => this.permissions.set(d));
  }

  selectPosition(id: number) {
    if (this.hasChanges() && !confirm('You have unsaved changes. Discard them?')) return;
    this.selectedPosition = id;
    this.loadMatrix();
  }

  loadMatrix() {
    if (!this.selectedPosition) return;
    this.loading.set(true);
    this.changes = [];
    this.http.get<MatrixRow[]>(`${environment.apiUrl}/admin/access-matrix/${this.selectedPosition}`)
      .subscribe(d => {
        this.originalMatrix = JSON.parse(JSON.stringify(d));
        this.matrix.set(d);
        this.loading.set(false);
        this.lastModule = '';
      });
  }

  toggle(row: MatrixRow, permCode: string, granted: boolean) {
    row.grants[permCode] = granted;
    this.matrix.update(m => [...m]);
    this.trackChange(row.screenCode, permCode, granted);
  }

  toggleAll(row: MatrixRow, granted: boolean) {
    for (const p of this.permissions()) {
      row.grants[p.permissionCode] = granted;
      this.trackChange(row.screenCode, p.permissionCode, granted);
    }
    this.matrix.update(m => [...m]);
  }

  toggleColumn(permCode: string) {
    const anyGranted = this.matrix().some(r => r.grants[permCode]);
    for (const row of this.matrix()) {
      row.grants[permCode] = !anyGranted;
      this.trackChange(row.screenCode, permCode, !anyGranted);
    }
    this.matrix.update(m => [...m]);
  }

  revokeAll() {
    for (const row of this.matrix()) {
      for (const p of this.permissions()) {
        row.grants[p.permissionCode] = false;
        this.trackChange(row.screenCode, p.permissionCode, false);
      }
    }
    this.matrix.update(m => [...m]);
  }

  revert() {
    this.matrix.set(JSON.parse(JSON.stringify(this.originalMatrix)));
    this.changes = [];
    this.lastModule = '';
  }

  saveMatrix() {
    if (!this.selectedPosition || this.changes.length === 0) return;
    this.saving.set(true);
    this.http.put(`${environment.apiUrl}/admin/access-matrix/${this.selectedPosition}`, this.changes).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Access matrix saved', '', { duration: 2500 });
        this.originalMatrix = JSON.parse(JSON.stringify(this.matrix()));
        this.changes = [];
      },
      error: () => { this.saving.set(false); this.snack.open('Save failed', '', { duration: 3000 }); }
    });
  }

  private trackChange(screenCode: string, permCode: string, granted: boolean) {
    const i = this.changes.findIndex(c => c.screenCode === screenCode && c.permCode === permCode);
    if (i >= 0) this.changes[i].granted = granted;
    else this.changes.push({ screenCode, permCode, granted });
  }

  allGranted(row: MatrixRow)  { return this.permissions().every(p => row.grants[p.permissionCode]); }
  someGranted(row: MatrixRow) { return this.permissions().some(p => row.grants[p.permissionCode]); }
  hasAnyGrant(row: MatrixRow) { return this.someGranted(row); }

  isModuleFirst(i: number): boolean {
    const rows = this.matrix();
    return i === 0 || rows[i].moduleName !== rows[i - 1].moduleName;
  }

  screenIcon(code: string): string {
    const map: Record<string, string> = {
      DASHBOARD:'dashboard', ALERT_LIST:'notifications', ALERT_DETAIL:'notifications_active',
      CASE_LIST:'folder_open', CASE_DETAIL:'folder', RULE_LIST:'rule', RULE_EDITOR:'edit_note',
      APPROVAL_QUEUE:'approval', CUSTOMER_PROFILE:'person_search', REPORTS:'bar_chart',
      ADMIN_USERS:'manage_accounts', ADMIN_ACCESS:'shield', APPROVAL_MATRIX:'grid_on'
    };
    return map[code] ?? 'web';
  }

  permIcon(code: string): string {
    const map: Record<string, string> = {
      VIEW:'visibility', CREATE:'add_circle', EDIT:'edit', DELETE:'delete', EXPORT:'download'
    };
    return map[code] ?? 'key';
  }
}

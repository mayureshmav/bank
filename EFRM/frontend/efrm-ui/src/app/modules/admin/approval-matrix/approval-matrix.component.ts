import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../../environments/environment';

interface MatrixEntry {
  matrixId: number;
  docTypeName: string;
  positionName: string;
  locationTypeFilter?: string;
  amountFrom?: number;
  amountTo?: number;
  maxApprovalAmount?: number;
  isActive: boolean;
}

interface DocType { docTypeId: number; docTypeCode: string; docTypeName: string; category?: string; }
interface Position { positionId: number; positionCode: string; positionName: string; }

@Component({
  selector: 'efrm-approval-matrix',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule,
    MatTooltipModule, MatProgressBarModule, MatDividerModule, MatSnackBarModule, MatChipsModule
  ],
  template: `
<!-- ── Header ─────────────────────────────────────────────────────────── -->
<div class="page-header">
  <div>
    <h1 class="page-title">Approval Matrix</h1>
    <p class="page-subtitle">Configure which positions can approve which document types and within what limits</p>
  </div>
  <button mat-raised-button color="primary" (click)="openPanel()">
    <mat-icon>add</mat-icon> Add Entry
  </button>
</div>

<!-- ── Summary cards ───────────────────────────────────────────────────── -->
<div class="stat-row">
  <div class="stat-card">
    <div class="stat-icon stat-icon--blue"><mat-icon>grid_on</mat-icon></div>
    <div class="stat-body">
      <span class="stat-value">{{ entries().length }}</span>
      <span class="stat-label">Total Entries</span>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon stat-icon--green"><mat-icon>check_circle</mat-icon></div>
    <div class="stat-body">
      <span class="stat-value">{{ activeEntries() }}</span>
      <span class="stat-label">Active</span>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon stat-icon--purple"><mat-icon>description</mat-icon></div>
    <div class="stat-body">
      <span class="stat-value">{{ docTypes().length }}</span>
      <span class="stat-label">Document Types</span>
    </div>
  </div>
  <div class="stat-card">
    <div class="stat-icon stat-icon--orange"><mat-icon>work</mat-icon></div>
    <div class="stat-body">
      <span class="stat-value">{{ uniquePositions() }}</span>
      <span class="stat-label">Positions Configured</span>
    </div>
  </div>
</div>

<!-- ── Content layout ─────────────────────────────────────────────────── -->
<div class="content-layout" [class.panel-open]="panelOpen()">

  <!-- Matrix table -->
  <mat-card class="table-card">
    @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <mat-card-content class="no-pad">

      @for (group of grouped(); track group.docType) {
        <!-- Document type group header -->
        <div class="group-header">
          <div class="group-header__left">
            <div class="doctype-badge" [class]="'doctype-badge--' + categoryClass(group.category)">
              <mat-icon>{{ categoryIcon(group.category) }}</mat-icon>
              {{ group.docType }}
            </div>
            <span class="group-count">{{ group.entries.length }} rule{{ group.entries.length !== 1 ? 's' : '' }}</span>
          </div>
          @if (group.category) {
            <span class="category-tag">{{ group.category }}</span>
          }
        </div>

        <table mat-table [dataSource]="group.entries" class="group-table">

          <ng-container matColumnDef="position">
            <th mat-header-cell *matHeaderCellDef>Approving Position</th>
            <td mat-cell *matCellDef="let e">
              <div class="pos-cell">
                <mat-icon class="pos-icon">manage_accounts</mat-icon>
                {{ e.positionName }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="locType">
            <th mat-header-cell *matHeaderCellDef>Location Scope</th>
            <td mat-cell *matCellDef="let e">
              @if (e.locationTypeFilter) {
                <span class="scope-chip">{{ e.locationTypeFilter }}</span>
              } @else {
                <span class="text-muted">All Locations</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="amountRange">
            <th mat-header-cell *matHeaderCellDef>Amount Range</th>
            <td mat-cell *matCellDef="let e">
              @if (e.amountFrom != null || e.amountTo != null) {
                <span class="amount-range">
                  ₹{{ (e.amountFrom ?? 0) | number }} – {{ e.amountTo != null ? '₹' + (e.amountTo | number) : 'No limit' }}
                </span>
              } @else {
                <span class="text-muted">Any amount</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="maxAmount">
            <th mat-header-cell *matHeaderCellDef>Max Approval</th>
            <td mat-cell *matCellDef="let e">
              @if (e.maxApprovalAmount != null) {
                <span class="max-amount">₹{{ e.maxApprovalAmount | number }}</span>
              } @else {
                <span class="text-muted">Unlimited</span>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let e">
              <span class="status-badge" [class.active]="e.isActive">
                {{ e.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <div class="action-btns">
                <button mat-icon-button matTooltip="Edit entry" (click)="openPanel(e)">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>

        <mat-divider></mat-divider>
      }

      @if (!loading() && entries().length === 0) {
        <div class="empty-state">
          <mat-icon>grid_off</mat-icon>
          <p>No approval matrix entries found</p>
          <button mat-stroked-button (click)="openPanel()">Add First Entry</button>
        </div>
      }
    </mat-card-content>
  </mat-card>

  <!-- ── Side panel ───────────────────────────────────────────────────── -->
  @if (panelOpen()) {
  <div class="side-panel">
    <div class="panel-header">
      <h2>{{ editing ? 'Edit Entry' : 'New Matrix Entry' }}</h2>
      <button mat-icon-button (click)="closePanel()"><mat-icon>close</mat-icon></button>
    </div>
    <mat-divider></mat-divider>
    <div class="panel-body">
      <form [formGroup]="form" (ngSubmit)="submit()">

        <mat-form-field appearance="outline" class="full">
          <mat-label>Document Type</mat-label>
          <mat-icon matPrefix>description</mat-icon>
          <mat-select formControlName="docTypeId">
            @for (d of docTypes(); track d.docTypeId) {
              <mat-option [value]="d.docTypeId">{{ d.docTypeName }}</mat-option>
            }
          </mat-select>
          <mat-error *ngIf="form.get('docTypeId')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Approving Position</mat-label>
          <mat-icon matPrefix>manage_accounts</mat-icon>
          <mat-select formControlName="positionId">
            @for (p of positions(); track p.positionId) {
              <mat-option [value]="p.positionId">{{ p.positionName }}</mat-option>
            }
          </mat-select>
          <mat-error *ngIf="form.get('positionId')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Location Type Filter</mat-label>
          <mat-icon matPrefix>location_city</mat-icon>
          <mat-select formControlName="locationTypeFilter">
            <mat-option [value]="null">All Locations</mat-option>
            <mat-option value="HEAD_OFFICE">Head Office</mat-option>
            <mat-option value="REGION">Regional Office</mat-option>
            <mat-option value="ZONE">Zone</mat-option>
            <mat-option value="BRANCH">Branch</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="two-col">
          <mat-form-field appearance="outline">
            <mat-label>Amount From (₹)</mat-label>
            <input matInput type="number" formControlName="amountFrom" placeholder="0">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Amount To (₹)</mat-label>
            <input matInput type="number" formControlName="amountTo" placeholder="No limit">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Max Approval Amount (₹)</mat-label>
          <mat-icon matPrefix>currency_rupee</mat-icon>
          <input matInput type="number" formControlName="maxApprovalAmount" placeholder="Unlimited">
        </mat-form-field>

        @if (formError()) {
          <div class="error-banner"><mat-icon>error</mat-icon> {{ formError() }}</div>
        }

        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="closePanel()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
            {{ editing ? 'Save Changes' : 'Add Entry' }}
          </button>
        </div>
      </form>
    </div>
  </div>
  }
</div>
  `,
  styles: [`
.page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
.page-title { margin:0; font-size:22px; font-weight:700; color:#0F172A; }
.page-subtitle { margin:4px 0 0; color:#64748B; font-size:13px; }

.stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
.stat-card { display:flex; align-items:center; gap:14px; padding:16px 20px; border-radius:12px; background:#fff; border:1px solid #E2E8F0; }
.stat-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.stat-icon mat-icon { font-size:22px; width:22px; height:22px; color:#fff; }
.stat-icon--blue { background:#3B82F6; }
.stat-icon--green { background:#22C55E; }
.stat-icon--purple { background:#8B5CF6; }
.stat-icon--orange { background:#F59E0B; }
.stat-body { display:flex; flex-direction:column; }
.stat-value { font-size:22px; font-weight:700; color:#0F172A; line-height:1; }
.stat-label { font-size:12px; color:#64748B; margin-top:2px; }

.content-layout { display:grid; grid-template-columns:1fr; gap:16px; }
.content-layout.panel-open { grid-template-columns:1fr 380px; }

.table-card { min-width:0; overflow:hidden; }
.no-pad mat-card-content { padding:0 !important; }
mat-card-content.no-pad { padding:0 !important; }

.group-header { display:flex; align-items:center; justify-content:space-between; padding:14px 20px 10px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; }
.group-header__left { display:flex; align-items:center; gap:10px; }
.doctype-badge { display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; padding:5px 12px; border-radius:8px; }
.doctype-badge mat-icon { font-size:16px; width:16px; height:16px; }
.doctype-badge--rules    { background:#EEF2FF; color:#3730A3; }
.doctype-badge--cases    { background:#FEF3C7; color:#92400E; }
.doctype-badge--alerts   { background:#ECFDF5; color:#065F46; }
.doctype-badge--finance  { background:#FFF7ED; color:#7C2D12; }
.doctype-badge--admin    { background:#F5F3FF; color:#5B21B6; }
.doctype-badge--default  { background:#F1F5F9; color:#475569; }
.group-count { font-size:12px; color:#94A3B8; }
.category-tag { font-size:11px; font-weight:600; color:#64748B; background:#E2E8F0; padding:2px 10px; border-radius:20px; }

.group-table { width:100%; }

.pos-cell { display:flex; align-items:center; gap:8px; }
.pos-icon { font-size:16px; width:16px; height:16px; color:#64748B; }

.scope-chip { font-size:11.5px; font-weight:600; background:#EFF6FF; color:#1D4ED8; padding:2px 8px; border-radius:6px; }
.amount-range { font-size:12.5px; font-weight:500; color:#0F172A; }
.max-amount { font-size:13px; font-weight:700; color:#16A34A; }
.text-muted { color:#94A3B8; font-size:12.5px; }

.status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; background:#F1F5F9; color:#64748B; }
.status-badge.active { background:#DCFCE7; color:#166534; }

.action-btns { display:flex; }

.empty-state { text-align:center; padding:48px; color:#94A3B8; }
.empty-state mat-icon { font-size:48px; width:48px; height:48px; display:block; margin:0 auto; }
.empty-state p { margin:8px 0 16px; }

.side-panel { background:#fff; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; align-self:start; position:sticky; top:0; }
.panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
.panel-header h2 { margin:0; font-size:16px; font-weight:700; color:#0F172A; }
.panel-body { padding:20px; display:flex; flex-direction:column; gap:4px; overflow-y:auto; max-height:calc(100vh - 200px); }
.full { width:100%; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.error-banner { display:flex; align-items:center; gap:8px; background:#FEF2F2; color:#B91C1C; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:8px; }
.form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:8px; }
  `]
})
export class ApprovalMatrixComponent implements OnInit {
  entries   = signal<MatrixEntry[]>([]);
  docTypes  = signal<DocType[]>([]);
  positions = signal<Position[]>([]);
  loading   = signal(false);
  saving    = signal(false);
  panelOpen = signal(false);
  formError = signal<string | null>(null);
  editing: MatrixEntry | null = null;

  cols = ['position', 'locType', 'amountRange', 'maxAmount', 'status', 'actions'];

  form = this.fb.group({
    docTypeId:          [null as number | null, Validators.required],
    positionId:         [null as number | null, Validators.required],
    locationTypeFilter: [null as string | null],
    amountFrom:         [null as number | null],
    amountTo:           [null as number | null],
    maxApprovalAmount:  [null as number | null]
  });

  private readonly api = environment.apiUrl;

  grouped() {
    const map = new Map<string, { docType: string; category: string; entries: MatrixEntry[] }>();
    for (const e of this.entries()) {
      if (!map.has(e.docTypeName)) map.set(e.docTypeName, { docType: e.docTypeName, category: '', entries: [] });
      map.get(e.docTypeName)!.entries.push(e);
    }
    // attach category from docTypes
    for (const [name, group] of map.entries()) {
      const dt = this.docTypes().find(d => d.docTypeName === name);
      group.category = dt?.category ?? '';
    }
    return Array.from(map.values());
  }

  activeEntries()   { return this.entries().filter(e => e.isActive).length; }
  uniquePositions() { return new Set(this.entries().map(e => e.positionName)).size; }

  constructor(private http: HttpClient, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit() {
    this.http.get<DocType[]>(`${this.api}/admin/document-types`).subscribe(d => this.docTypes.set(d));
    this.http.get<Position[]>(`${this.api}/admin/positions`).subscribe(d => this.positions.set(d));
    this.loadEntries();
  }

  loadEntries() {
    this.loading.set(true);
    this.http.get<MatrixEntry[]>(`${this.api}/approvals/matrix`).subscribe({
      next: d => { this.entries.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openPanel(entry?: MatrixEntry) {
    this.editing = entry ?? null;
    this.formError.set(null);
    this.form.reset();
    if (entry) {
      // Find docType/position IDs from names
      const dt  = this.docTypes().find(d => d.docTypeName === entry.docTypeName);
      const pos = this.positions().find(p => p.positionName === entry.positionName);
      this.form.patchValue({
        docTypeId: dt?.docTypeId ?? null,
        positionId: pos?.positionId ?? null,
        locationTypeFilter: entry.locationTypeFilter ?? null,
        amountFrom: entry.amountFrom ?? null,
        amountTo: entry.amountTo ?? null,
        maxApprovalAmount: entry.maxApprovalAmount ?? null
      });
    }
    this.panelOpen.set(true);
  }

  closePanel() { this.panelOpen.set(false); this.editing = null; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set(null);
    const v = this.form.value;
    const payload = {
      docTypeId: v.docTypeId, positionId: v.positionId,
      locationTypeFilter: v.locationTypeFilter || null,
      amountFrom: v.amountFrom || null, amountTo: v.amountTo || null,
      maxApprovalAmount: v.maxApprovalAmount || null
    };
    this.http.put(`${this.api}/approvals/matrix`, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open('Matrix entry saved', '', { duration: 2500 });
        this.closePanel();
        this.loadEntries();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err.error?.error ?? 'Save failed');
      }
    });
  }

  categoryClass(cat: string): string {
    const c = (cat || '').toUpperCase();
    if (c === 'RULES') return 'rules';
    if (c === 'CASES') return 'cases';
    if (c === 'ALERTS') return 'alerts';
    if (c === 'FINANCE') return 'finance';
    if (c === 'ADMIN') return 'admin';
    return 'default';
  }

  categoryIcon(cat: string): string {
    const c = (cat || '').toUpperCase();
    if (c === 'RULES') return 'rule';
    if (c === 'CASES') return 'folder_open';
    if (c === 'ALERTS') return 'notifications';
    if (c === 'FINANCE') return 'currency_rupee';
    if (c === 'ADMIN') return 'admin_panel_settings';
    return 'description';
  }
}

import { Component, OnInit, signal, computed } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../environments/environment';

interface User {
  personId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  mobile?: string;
  primaryPositionId?: number;
  primaryPosition?: string;
  primaryPositionCode?: string;
  primaryLocationId?: number;
  primaryLocation?: string;
  isActive: boolean;
  isMfaEnabled: boolean;
  lastLoginAt?: string;
}

interface Position { positionId: number; positionCode: string; positionName: string; positionLevel: number; }
interface Location { locationId: number; locationCode: string; locationName: string; locationType: string; }

@Component({
  selector: 'efrm-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule,
    MatTooltipModule, MatProgressBarModule, MatChipsModule, MatSnackBarModule, MatDividerModule
  ],
  template: `
<!-- ── Header ─────────────────────────────────────────────────────────── -->
<div class="page-header">
  <div>
    <h1 class="page-title">User Management</h1>
    <p class="page-subtitle">Manage system users, positions, and access assignments</p>
  </div>
  <button mat-raised-button color="primary" (click)="openForm()">
    <mat-icon>person_add</mat-icon> Add User
  </button>
</div>

<!-- ── Stat cards ──────────────────────────────────────────────────────── -->
<div class="stat-row">
  <div class="stat-card stat-card--blue">
    <mat-icon>people</mat-icon>
    <div class="stat-body">
      <span class="stat-value">{{ users().length }}</span>
      <span class="stat-label">Total Users</span>
    </div>
  </div>
  <div class="stat-card stat-card--green">
    <mat-icon>check_circle</mat-icon>
    <div class="stat-body">
      <span class="stat-value">{{ activeCount() }}</span>
      <span class="stat-label">Active</span>
    </div>
  </div>
  <div class="stat-card stat-card--red">
    <mat-icon>block</mat-icon>
    <div class="stat-body">
      <span class="stat-value">{{ users().length - activeCount() }}</span>
      <span class="stat-label">Inactive</span>
    </div>
  </div>
  <div class="stat-card stat-card--orange">
    <mat-icon>verified_user</mat-icon>
    <div class="stat-body">
      <span class="stat-value">{{ mfaCount() }}</span>
      <span class="stat-label">MFA Enabled</span>
    </div>
  </div>
</div>

<!-- ── Layout: table + side panel ─────────────────────────────────────── -->
<div class="content-layout" [class.panel-open]="panelOpen()">

  <!-- Table card -->
  <mat-card class="table-card">
    <mat-card-content>
      <!-- Search bar -->
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search users…</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="searchTerm" (input)="applyFilter()" placeholder="Name, email, employee code…">
          @if (searchTerm) {
            <button matSuffix mat-icon-button (click)="searchTerm=''; applyFilter()"><mat-icon>close</mat-icon></button>
          }
        </mat-form-field>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

      <table mat-table [dataSource]="filtered()" class="users-table">

        <!-- Avatar + Name column -->
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>User</th>
          <td mat-cell *matCellDef="let u">
            <div class="user-cell">
              <div class="avatar" [style.background]="avatarColor(u.fullName)">
                {{ initials(u.fullName) }}
              </div>
              <div class="user-info">
                <span class="user-name">{{ u.fullName }}</span>
                <span class="user-email">{{ u.email }}</span>
              </div>
            </div>
          </td>
        </ng-container>

        <!-- Employee code -->
        <ng-container matColumnDef="empCode">
          <th mat-header-cell *matHeaderCellDef>Emp Code</th>
          <td mat-cell *matCellDef="let u">
            <span class="emp-code">{{ u.employeeCode }}</span>
          </td>
        </ng-container>

        <!-- Position -->
        <ng-container matColumnDef="position">
          <th mat-header-cell *matHeaderCellDef>Position</th>
          <td mat-cell *matCellDef="let u">
            @if (u.primaryPosition) {
              <span class="pos-chip" [class]="'pos-chip--' + posLevel(u.primaryPositionCode)">
                {{ u.primaryPosition }}
              </span>
            } @else {
              <span class="text-muted">—</span>
            }
          </td>
        </ng-container>

        <!-- Location -->
        <ng-container matColumnDef="location">
          <th mat-header-cell *matHeaderCellDef>Location</th>
          <td mat-cell *matCellDef="let u">
            <span class="location-badge">
              <mat-icon class="loc-icon">location_on</mat-icon>
              {{ u.primaryLocation ?? '—' }}
            </span>
          </td>
        </ng-container>

        <!-- Last login -->
        <ng-container matColumnDef="lastLogin">
          <th mat-header-cell *matHeaderCellDef>Last Login</th>
          <td mat-cell *matCellDef="let u">
            @if (u.lastLoginAt) {
              <span class="text-muted">{{ u.lastLoginAt | date:'dd MMM, HH:mm' }}</span>
            } @else {
              <span class="never-badge">Never</span>
            }
          </td>
        </ng-container>

        <!-- MFA -->
        <ng-container matColumnDef="mfa">
          <th mat-header-cell *matHeaderCellDef>MFA</th>
          <td mat-cell *matCellDef="let u">
            @if (u.isMfaEnabled) {
              <mat-icon class="mfa-on" matTooltip="MFA enabled">shield</mat-icon>
            } @else {
              <mat-icon class="mfa-off" matTooltip="MFA disabled">shield_outlined</mat-icon>
            }
          </td>
        </ng-container>

        <!-- Status -->
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let u">
            <span class="status-badge" [class.status-badge--active]="u.isActive" [class.status-badge--inactive]="!u.isActive">
              {{ u.isActive ? 'Active' : 'Inactive' }}
            </span>
          </td>
        </ng-container>

        <!-- Actions -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u">
            <div class="action-btns">
              <button mat-icon-button matTooltip="Edit user" (click)="openForm(u)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="u.isActive ? 'Deactivate' : 'Activate'"
                      (click)="toggleStatus(u)" [class.btn-red]="u.isActive">
                <mat-icon>{{ u.isActive ? 'person_off' : 'person' }}</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Reset password" (click)="resetPassword(u)">
                <mat-icon>lock_reset</mat-icon>
              </button>
            </div>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;" [class.row-inactive]="!row.isActive"></tr>
      </table>

      @if (!loading() && filtered().length === 0) {
        <div class="empty-state">
          <mat-icon>people_outline</mat-icon>
          <p>No users found</p>
        </div>
      }
    </mat-card-content>
  </mat-card>

  <!-- ── Side panel ───────────────────────────────────────────────────── -->
  @if (panelOpen()) {
  <div class="side-panel">
    <div class="panel-header">
      <h2>{{ editing ? 'Edit User' : 'Add New User' }}</h2>
      <button mat-icon-button (click)="closePanel()"><mat-icon>close</mat-icon></button>
    </div>

    <mat-divider></mat-divider>

    <div class="panel-body">
      <form [formGroup]="form" (ngSubmit)="submit()">

        <mat-form-field appearance="outline" class="full">
          <mat-label>Full Name</mat-label>
          <mat-icon matPrefix>person</mat-icon>
          <input matInput formControlName="fullName">
          <mat-error *ngIf="form.get('fullName')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Employee Code</mat-label>
          <mat-icon matPrefix>badge</mat-icon>
          <input matInput formControlName="employeeCode" [readonly]="!!editing">
          <mat-error *ngIf="form.get('employeeCode')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <mat-icon matPrefix>email</mat-icon>
          <input matInput formControlName="email" type="email" [readonly]="!!editing">
          <mat-error *ngIf="form.get('email')?.hasError('required')">Required</mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">Invalid email</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Mobile</mat-label>
          <mat-icon matPrefix>phone</mat-icon>
          <input matInput formControlName="mobile">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Position</mat-label>
          <mat-icon matPrefix>work</mat-icon>
          <mat-select formControlName="positionId">
            @for (p of positions(); track p.positionId) {
              <mat-option [value]="p.positionId">{{ p.positionName }}</mat-option>
            }
          </mat-select>
          <mat-error *ngIf="form.get('positionId')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Location</mat-label>
          <mat-icon matPrefix>location_on</mat-icon>
          <mat-select formControlName="locationId">
            @for (l of locations(); track l.locationId) {
              <mat-option [value]="l.locationId">{{ l.locationName }}</mat-option>
            }
          </mat-select>
          <mat-error *ngIf="form.get('locationId')?.hasError('required')">Required</mat-error>
        </mat-form-field>

        @if (!editing) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Temporary Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput formControlName="tempPassword" type="password">
            <mat-error *ngIf="form.get('tempPassword')?.hasError('required')">Required</mat-error>
          </mat-form-field>
        }

        @if (editing) {
          <div class="toggle-row">
            <mat-slide-toggle formControlName="isMfaEnabled" color="primary">
              MFA Enabled
            </mat-slide-toggle>
          </div>
        }

        @if (formError()) {
          <div class="error-banner"><mat-icon>error</mat-icon> {{ formError() }}</div>
        }

        <div class="form-actions">
          <button mat-stroked-button type="button" (click)="closePanel()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
            @if (saving()) { <mat-icon class="spin">sync</mat-icon> }
            {{ editing ? 'Save Changes' : 'Create User' }}
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

/* Stats */
.stat-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
.stat-card { display:flex; align-items:center; gap:14px; padding:16px 20px; border-radius:12px; background:#fff; border:1px solid #E2E8F0; }
.stat-card mat-icon { font-size:28px; width:28px; height:28px; }
.stat-card--blue mat-icon { color:#3B82F6; }
.stat-card--green mat-icon { color:#22C55E; }
.stat-card--red mat-icon { color:#EF4444; }
.stat-card--orange mat-icon { color:#F59E0B; }
.stat-body { display:flex; flex-direction:column; }
.stat-value { font-size:22px; font-weight:700; color:#0F172A; line-height:1; }
.stat-label { font-size:12px; color:#64748B; margin-top:2px; }

/* Layout */
.content-layout { display:grid; grid-template-columns:1fr; gap:16px; transition:grid-template-columns 240ms ease; }
.content-layout.panel-open { grid-template-columns:1fr 380px; }

/* Table card */
.table-card { min-width:0; }
.search-bar { padding:0 0 12px; }
.search-field { width:100%; max-width:380px; }
.users-table { width:100%; }

.user-cell { display:flex; align-items:center; gap:12px; padding:4px 0; }
.avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:700; flex-shrink:0; }
.user-info { display:flex; flex-direction:column; }
.user-name { font-size:13.5px; font-weight:600; color:#0F172A; }
.user-email { font-size:11.5px; color:#64748B; }

.emp-code { font-size:12px; font-weight:600; color:#475569; background:#F1F5F9; border:1px solid #E2E8F0; padding:2px 8px; border-radius:6px; font-family:monospace; }

.pos-chip { font-size:11.5px; font-weight:600; padding:3px 10px; border-radius:20px; }
.pos-chip--admin { background:#EEF2FF; color:#4338CA; }
.pos-chip--manager { background:#FEF3C7; color:#92400E; }
.pos-chip--supervisor { background:#ECFDF5; color:#065F46; }
.pos-chip--investigator { background:#F0F9FF; color:#0C4A6E; }
.pos-chip--analyst { background:#FDF4FF; color:#6B21A8; }
.pos-chip--compliance { background:#FFF7ED; color:#7C2D12; }
.pos-chip--default { background:#F1F5F9; color:#475569; }

.location-badge { display:flex; align-items:center; gap:4px; font-size:12.5px; color:#475569; }
.loc-icon { font-size:14px; width:14px; height:14px; color:#94A3B8; }

.never-badge { font-size:11px; background:#FEF2F2; color:#DC2626; padding:2px 8px; border-radius:20px; }

.mfa-on { color:#16A34A; font-size:18px; width:18px; height:18px; }
.mfa-off { color:#CBD5E1; font-size:18px; width:18px; height:18px; }

.status-badge { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; }
.status-badge--active { background:#DCFCE7; color:#166534; }
.status-badge--inactive { background:#F1F5F9; color:#64748B; }

.action-btns { display:flex; gap:2px; }
.btn-red { color:#EF4444 !important; }

.row-inactive { opacity:.55; }

.empty-state { text-align:center; padding:48px; color:#94A3B8; }
.empty-state mat-icon { font-size:48px; width:48px; height:48px; }
.empty-state p { margin:8px 0 0; }

/* Side panel */
.side-panel { background:#fff; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; align-self:start; position:sticky; top:0; }
.panel-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; }
.panel-header h2 { margin:0; font-size:16px; font-weight:700; color:#0F172A; }
.panel-body { padding:20px; display:flex; flex-direction:column; gap:4px; overflow-y:auto; max-height:calc(100vh - 200px); }
.full { width:100%; }
.toggle-row { padding:8px 0 12px; }
.error-banner { display:flex; align-items:center; gap:8px; background:#FEF2F2; color:#B91C1C; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:8px; }
.form-actions { display:flex; justify-content:flex-end; gap:8px; padding-top:8px; }

.text-muted { color:#94A3B8; font-size:12.5px; }
.spin { animation:spin 1s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class UserManagementComponent implements OnInit {
  users = signal<User[]>([]);
  filtered = signal<User[]>([]);
  positions = signal<Position[]>([]);
  locations = signal<Location[]>([]);
  loading = signal(false);
  saving = signal(false);
  panelOpen = signal(false);
  formError = signal<string | null>(null);
  editing: User | null = null;
  searchTerm = '';

  cols = ['user', 'empCode', 'position', 'location', 'lastLogin', 'mfa', 'status', 'actions'];

  activeCount = computed(() => this.users().filter(u => u.isActive).length);
  mfaCount    = computed(() => this.users().filter(u => u.isMfaEnabled).length);

  form = this.fb.group({
    fullName:     ['', Validators.required],
    employeeCode: ['', Validators.required],
    email:        ['', [Validators.required, Validators.email]],
    mobile:       [''],
    positionId:   [null as number | null, Validators.required],
    locationId:   [null as number | null, Validators.required],
    tempPassword: [''],
    isMfaEnabled: [false]
  });

  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient, private fb: FormBuilder, private snack: MatSnackBar) {}

  ngOnInit() {
    this.loadUsers();
    this.http.get<Position[]>(`${this.api}/admin/positions`).subscribe(d => this.positions.set(d));
    this.http.get<Location[]>(`${this.api}/admin/locations`).subscribe(d => this.locations.set(d));
  }

  loadUsers() {
    this.loading.set(true);
    this.http.get<User[]>(`${this.api}/admin/users`).subscribe({
      next: d => { this.users.set(d); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  applyFilter() {
    const q = this.searchTerm.toLowerCase();
    if (!q) { this.filtered.set(this.users()); return; }
    this.filtered.set(this.users().filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.employeeCode.toLowerCase().includes(q) ||
      (u.primaryPosition ?? '').toLowerCase().includes(q)
    ));
  }

  openForm(user?: User) {
    this.editing = user ?? null;
    this.formError.set(null);
    if (user) {
      this.form.patchValue({
        fullName: user.fullName, employeeCode: user.employeeCode,
        email: user.email, mobile: user.mobile ?? '',
        positionId: user.primaryPositionId ?? null,
        locationId: user.primaryLocationId ?? null,
        isMfaEnabled: user.isMfaEnabled
      });
      this.form.get('tempPassword')?.clearValidators();
    } else {
      this.form.reset();
      this.form.get('tempPassword')?.setValidators(Validators.required);
    }
    this.form.get('tempPassword')?.updateValueAndValidity();
    this.panelOpen.set(true);
  }

  closePanel() { this.panelOpen.set(false); this.editing = null; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.formError.set(null);
    const v = this.form.value;

    const req$ = this.editing
      ? this.http.put(`${this.api}/admin/users/${this.editing.personId}`, {
          fullName: v.fullName, mobile: v.mobile,
          positionId: v.positionId, locationId: v.locationId, isMfaEnabled: v.isMfaEnabled
        })
      : this.http.post(`${this.api}/admin/users`, {
          employeeCode: v.employeeCode, fullName: v.fullName, email: v.email,
          mobile: v.mobile, tempPassword: v.tempPassword,
          positionId: v.positionId, locationId: v.locationId
        });

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snack.open(this.editing ? 'User updated' : 'User created', '', { duration: 2500 });
        this.closePanel();
        this.loadUsers();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err.error?.error ?? 'Operation failed');
      }
    });
  }

  toggleStatus(user: User) {
    this.http.patch(`${this.api}/admin/users/${user.personId}/status`, {}).subscribe({
      next: (r: any) => {
        user.isActive = r.isActive;
        this.users.update(list => [...list]);
        this.snack.open(`User ${r.isActive ? 'activated' : 'deactivated'}`, '', { duration: 2000 });
      },
      error: err => this.snack.open(err.error?.error ?? 'Failed', '', { duration: 3000 })
    });
  }

  resetPassword(user: User) {
    this.http.patch(`${this.api}/admin/users/${user.personId}/reset-password`, {}).subscribe({
      next: (r: any) => {
        this.snack.open(`Temporary password: ${r.tempPassword}`, 'Copy', { duration: 10000 });
      },
      error: () => this.snack.open('Reset failed', '', { duration: 3000 })
    });
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = ['#1E40AF','#065F46','#7C3AED','#B45309','#0C4A6E','#9D174D','#1F2937'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  posLevel(code?: string): string {
    if (!code) return 'default';
    const c = code.toLowerCase();
    if (c.includes('admin')) return 'admin';
    if (c.includes('manager')) return 'manager';
    if (c.includes('supervisor')) return 'supervisor';
    if (c.includes('invest')) return 'investigator';
    if (c.includes('analyst')) return 'analyst';
    if (c.includes('compliance')) return 'compliance';
    return 'default';
  }
}

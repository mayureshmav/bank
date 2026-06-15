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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { environment } from '../../../../environments/environment';

interface MatrixEntry {
  screenCode: string;
  screenName: string;
  moduleName: string;
  grants: Record<string, boolean>;
}

@Component({
  selector: 'efrm-access-matrix',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatTableModule, MatCheckboxModule,
    MatSelectModule, MatFormFieldModule, MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
<div class="page-header">
  <div>
    <h1 class="page-title">Access Control Matrix</h1>
    <p class="page-subtitle">Position × Screen × Permission configuration</p>
  </div>
</div>

<mat-card class="filter-bar">
  <mat-card-content>
    <mat-form-field appearance="outline">
      <mat-label>Position</mat-label>
      <mat-select [(value)]="selectedPosition" (selectionChange)="loadMatrix()">
        @for (p of positions(); track p.positionId) {
          <mat-option [value]="p.positionId">{{ p.positionName }} ({{ p.positionCode }})</mat-option>
        }
      </mat-select>
    </mat-form-field>
    <button mat-raised-button color="primary" (click)="saveMatrix()" [disabled]="saving()">
      <mat-icon>save</mat-icon> Save Changes
    </button>
  </mat-card-content>
</mat-card>

<mat-card class="matrix-card">
  @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
  <div class="matrix-wrap">
    <table class="matrix-table">
      <thead>
        <tr>
          <th class="screen-col">Screen</th>
          <th class="module-col">Module</th>
          @for (perm of permissions(); track perm.permissionCode) {
            <th class="perm-col">{{ perm.permissionCode }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of matrix(); track row.screenCode) {
        <tr [class.module-start]="isModuleStart(row)">
          <td class="screen-name">{{ row.screenName }}</td>
          <td class="module-name">{{ row.moduleName }}</td>
          @for (perm of permissions(); track perm.permissionCode) {
          <td class="perm-cell">
            <mat-checkbox
              [checked]="row.grants[perm.permissionCode]"
              (change)="toggleGrant(row, perm.permissionCode, $event.checked)"
              color="primary">
            </mat-checkbox>
          </td>
          }
        </tr>
        }
      </tbody>
    </table>
  </div>
</mat-card>
  `,
  styles: [`
.page-header { margin-bottom: 20px; }
.page-title { margin: 0; font-size: 24px; font-weight: 700; color: #1a237e; }
.page-subtitle { margin: 4px 0 0; color: #666; font-size: 13px; }
.filter-bar mat-card-content { display: flex; align-items: center; gap: 16px; }
.matrix-card { margin-top: 16px; overflow: hidden; }
.matrix-wrap { overflow-x: auto; }
.matrix-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.matrix-table th { background: #1a237e; color: #fff; padding: 10px 12px; text-align: left; white-space: nowrap; }
.matrix-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
.screen-col { min-width: 200px; }
.module-col { min-width: 120px; }
.perm-col { min-width: 70px; text-align: center; }
.perm-cell { text-align: center; }
.screen-name { font-weight: 500; }
.module-name { color: #757575; font-size: 12px; }
.module-start td { border-top: 2px solid #e3f2fd; }
  `]
})
export class AccessMatrixComponent implements OnInit {
  positions = signal<any[]>([]);
  permissions = signal<any[]>([]);
  matrix = signal<MatrixEntry[]>([]);
  selectedPosition: number | null = null;
  loading = signal(false);
  saving = signal(false);
  private changedGrants: { screenCode: string; permCode: string; granted: boolean }[] = [];
  private lastModuleGroup = '';

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/admin/positions`).subscribe(d => {
      this.positions.set(d);
      if (d.length > 0) { this.selectedPosition = d[0].positionId; this.loadMatrix(); }
    });
    this.http.get<any[]>(`${environment.apiUrl}/admin/permissions`).subscribe(d => this.permissions.set(d));
  }

  loadMatrix() {
    if (!this.selectedPosition) return;
    this.loading.set(true);
    this.changedGrants = [];
    this.http.get<MatrixEntry[]>(`${environment.apiUrl}/admin/access-matrix/${this.selectedPosition}`)
      .subscribe(d => { this.matrix.set(d); this.loading.set(false); });
  }

  toggleGrant(row: MatrixEntry, permCode: string, granted: boolean) {
    row.grants[permCode] = granted;
    const existing = this.changedGrants.find(g => g.screenCode === row.screenCode && g.permCode === permCode);
    if (existing) existing.granted = granted;
    else this.changedGrants.push({ screenCode: row.screenCode, permCode, granted });
  }

  saveMatrix() {
    if (!this.selectedPosition || this.changedGrants.length === 0) return;
    this.saving.set(true);
    this.http.put(`${environment.apiUrl}/admin/access-matrix/${this.selectedPosition}`, this.changedGrants)
      .subscribe({
        next: () => {
          this.snack.open('Access matrix saved', '', { duration: 2500 });
          this.changedGrants = [];
          this.saving.set(false);
        },
        error: () => { this.snack.open('Save failed', '', { duration: 3000 }); this.saving.set(false); }
      });
  }

  isModuleStart(row: MatrixEntry): boolean {
    const is = row.moduleName !== this.lastModuleGroup;
    this.lastModuleGroup = row.moduleName;
    return is;
  }
}

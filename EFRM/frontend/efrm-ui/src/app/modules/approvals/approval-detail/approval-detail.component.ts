import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'efrm-approval-detail',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatStepperModule,
    MatDialogModule, MatProgressSpinnerModule
  ],
  template: `
<div class="back-nav" routerLink="/approvals">
  <mat-icon>arrow_back</mat-icon> Back to Queue
</div>

@if (loading()) {
  <div class="center"><mat-spinner></mat-spinner></div>
} @else if (detail()) {
<div class="detail-layout">
  <!-- Left: Request info -->
  <mat-card class="info-card">
    <mat-card-header>
      <mat-card-title>{{ detail()!.requestRef }}</mat-card-title>
      <mat-card-subtitle>{{ detail()!.docTypeName }}</mat-card-subtitle>
    </mat-card-header>
    <mat-card-content>
      <div class="info-grid">
        <div class="info-item">
          <label>Entity Type</label>
          <span>{{ detail()!.entityType }}</span>
        </div>
        <div class="info-item">
          <label>Entity ID</label>
          <span>{{ detail()!.entityId }}</span>
        </div>
        <div class="info-item">
          <label>Amount</label>
          <span>{{ detail()!.amount ? ('₹' + (detail()!.amount | number:'1.2-2')) : '—' }}</span>
        </div>
        <div class="info-item">
          <label>Requested By</label>
          <span>{{ detail()!.requestedByName }}</span>
        </div>
        <div class="info-item">
          <label>Submitted</label>
          <span>{{ detail()!.requestedAt | date:'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="info-item">
          <label>Status</label>
          <span class="status-badge">{{ detail()!.status }}</span>
        </div>
      </div>

      @if (detail()!.entitySnapshot) {
      <details class="snapshot">
        <summary>Entity Snapshot (at submission)</summary>
        <pre>{{ formatJson(detail()!.entitySnapshot) }}</pre>
      </details>
      }
    </mat-card-content>
  </mat-card>

  <!-- Right: Workflow progress + decision -->
  <div class="workflow-col">
    <!-- Stage stepper -->
    <mat-card class="stages-card">
      <mat-card-header><mat-card-title>Approval Workflow</mat-card-title></mat-card-header>
      <mat-card-content>
        <div class="stage-list">
          @for (stage of detail()!.decisions; track stage.stageNumber) {
          <div class="stage-item" [class.current]="stage.isCurrentStage" [class.done]="stage.decision === 'APPROVED'">
            <div class="stage-icon">
              @if (stage.decision === 'APPROVED') { <mat-icon class="done-icon">check_circle</mat-icon> }
              @else if (stage.decision === 'REJECTED') { <mat-icon class="reject-icon">cancel</mat-icon> }
              @else if (stage.isCurrentStage) { <mat-icon class="current-icon">pending</mat-icon> }
              @else { <mat-icon class="pending-icon">radio_button_unchecked</mat-icon> }
            </div>
            <div class="stage-info">
              <div class="stage-name">{{ stage.stageName }}</div>
              @if (stage.decision) {
                <div class="stage-decision">{{ stage.decision }} by {{ stage.decidedByName }}
                  at {{ stage.decidedAt | date:'dd/MM HH:mm' }}</div>
                @if (stage.comments) {
                  <div class="stage-comment">{{ stage.comments }}</div>
                }
              } @else if (stage.isCurrentStage) {
                <div class="stage-pending">Awaiting decision</div>
              }
            </div>
          </div>
          @if (!$last) { <div class="stage-connector"></div> }
          }
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Decision form -->
    @if (detail()!.canApprove) {
    <mat-card class="decision-card">
      <mat-card-header><mat-card-title>Your Decision</mat-card-title></mat-card-header>
      <mat-card-content>
        <form [formGroup]="decisionForm" (ngSubmit)="decide($event)">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Comments</mat-label>
            <textarea matInput formControlName="comments" rows="3"
                      placeholder="Add your review comments (optional)"></textarea>
          </mat-form-field>

          <div class="decision-btns">
            <button mat-raised-button color="primary" type="submit"
                    [disabled]="submitting()" (click)="decisionType = 'APPROVED'">
              <mat-icon>check</mat-icon> Approve
            </button>
            <button mat-raised-button type="button"
                    [disabled]="submitting()" (click)="decisionType = 'RETURNED'; decide($event)">
              <mat-icon>undo</mat-icon> Return
            </button>
            <button mat-raised-button color="warn" type="button"
                    [disabled]="submitting()" (click)="decisionType = 'REJECTED'; decide($event)">
              <mat-icon>close</mat-icon> Reject
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
    }
  </div>
</div>
}
  `,
  styles: [`
.back-nav { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #1565c0;
            margin-bottom: 20px; font-weight: 500; }
.detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-item label { display: block; font-size: 11px; color: #757575; text-transform: uppercase; }
.info-item span  { font-weight: 500; }
.status-badge { background: #e3f2fd; color: #1565c0; padding: 3px 10px; border-radius: 10px; font-size: 12px; }
.snapshot { margin-top: 16px; }
.snapshot pre { background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 12px; overflow: auto; max-height: 200px; }
.stage-list { display: flex; flex-direction: column; }
.stage-item { display: flex; gap: 12px; align-items: flex-start; }
.stage-connector { width: 2px; height: 24px; background: #e0e0e0; margin-left: 11px; }
.stage-icon { flex-shrink: 0; }
.done-icon    { color: #388e3c; }
.reject-icon  { color: #c62828; }
.current-icon { color: #1565c0; }
.pending-icon { color: #bdbdbd; }
.stage-info { padding-top: 2px; }
.stage-name    { font-weight: 600; font-size: 14px; }
.stage-decision { font-size: 12px; color: #388e3c; margin-top: 2px; }
.stage-pending  { font-size: 12px; color: #e65100; margin-top: 2px; }
.stage-comment  { font-size: 12px; color: #757575; font-style: italic; }
.stage-item.current .stage-name { color: #1565c0; }
.decision-card { margin-top: 16px; }
.full-width { width: 100%; }
.decision-btns { display: flex; gap: 12px; margin-top: 8px; }
.center { display: flex; justify-content: center; padding: 64px; }
  `]
})
export class ApprovalDetailComponent implements OnInit {
  detail = signal<any | null>(null);
  loading = signal(true);
  submitting = signal(false);
  decisionType: string = 'APPROVED';

  decisionForm = this.fb.group({ comments: [''] });

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.http.get<any>(`${environment.apiUrl}/approvals/${id}`).subscribe(d => {
      this.detail.set(d); this.loading.set(false);
    });
  }

  decide(event: Event) {
    event.preventDefault();
    this.submitting.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    this.http.post(`${environment.apiUrl}/approvals/${id}/decide`, {
      decision: this.decisionType,
      comments: this.decisionForm.value.comments
    }).subscribe({
      next: () => {
        this.snack.open(`Decision recorded: ${this.decisionType}`, '', { duration: 3000 });
        this.router.navigate(['/approvals']);
      },
      error: () => { this.snack.open('Failed to record decision', '', { duration: 3000 }); this.submitting.set(false); }
    });
  }

  formatJson(json: string): string {
    try { return JSON.stringify(JSON.parse(json), null, 2); } catch { return json; }
  }
}

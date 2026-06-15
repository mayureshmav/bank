import { Component, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'efrm-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, CommonModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  template: `
<div class="login-page">
  <div class="login-card-wrap">
    <!-- Bank branding -->
    <div class="brand">
      <div class="brand-logo">🏦</div>
      <h1>UPGB EFRM</h1>
      <p>Enterprise Fraud Risk Management</p>
    </div>

    <mat-card class="login-card">
      <mat-card-content>
        <h2>Sign In</h2>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Employee ID / Email</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="username" autocomplete="username">
            <mat-error *ngIf="form.get('username')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput [type]="showPwd() ? 'text' : 'password'"
                   formControlName="password" autocomplete="current-password">
            <button mat-icon-button matSuffix type="button"
                    (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.get('password')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          @if (requireMfa()) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>MFA Code</mat-label>
            <mat-icon matPrefix>verified</mat-icon>
            <input matInput formControlName="mfaCode" maxlength="6"
                   placeholder="6-digit code from authenticator">
          </mat-form-field>
          }

          @if (errorMsg()) {
          <div class="error-banner">
            <mat-icon>error_outline</mat-icon>
            {{ errorMsg() }}
          </div>
          }

          <button mat-raised-button color="primary" type="submit"
                  [disabled]="loading()" class="full-width submit-btn">
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Sign In
            }
          </button>
        </form>
      </mat-card-content>
    </mat-card>

    <div class="footer-note">
      Authorized access only · All activity is monitored and logged
    </div>
  </div>
</div>
  `,
  styles: [`
.login-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1a237e 0%, #283593 60%, #3949ab 100%);
}
.login-card-wrap { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.brand { text-align: center; color: #fff; }
.brand-logo { font-size: 56px; margin-bottom: 8px; }
.brand h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; }
.brand p  { margin: 4px 0 0; opacity: .8; font-size: 14px; }
.login-card { width: 420px; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.4); }
h2 { color: #1a237e; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
.full-width { width: 100%; }
.submit-btn { height: 48px; font-size: 16px; font-weight: 600; margin-top: 8px; }
.error-banner {
  display: flex; align-items: center; gap: 8px;
  background: #ffebee; color: #c62828; border-radius: 6px;
  padding: 10px 14px; margin-bottom: 12px; font-size: 14px;
}
.footer-note { color: rgba(255,255,255,.5); font-size: 12px; text-align: center; }
mat-spinner { display: inline-block; }
  `]
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    mfaCode:  ['']
  });

  loading = signal(false);
  showPwd = signal(false);
  requireMfa = signal(false);
  errorMsg = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set(null);

    const { username, password, mfaCode } = this.form.value;
    this.auth.login(username!, password!, mfaCode ?? undefined).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.error ?? 'Login failed. Please try again.';
        if (msg.includes('MFA')) this.requireMfa.set(true);
        else this.errorMsg.set(msg);
      }
    });
  }
}

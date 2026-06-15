import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-alert-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:24px">
  <button mat-stroked-button routerLink="/alerts"><mat-icon>arrow_back</mat-icon> Back to Alerts</button>
  <h2 style="margin-top:16px">Alert Detail</h2>
  <p>Full alert detail view — coming soon.</p>
</div>`
})
export class AlertDetailComponent {}

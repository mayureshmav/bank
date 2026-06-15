import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-unauthorized',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:48px;text-align:center">
  <mat-icon style="font-size:64px;height:64px;width:64px;color:#c62828">block</mat-icon>
  <h2>Access Denied</h2>
  <p>You do not have permission to access this page.</p>
  <button mat-raised-button color="primary" routerLink="/dashboard">Go to Dashboard</button>
</div>`
})
export class UnauthorizedComponent {}

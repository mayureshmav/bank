import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-rule-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:24px">
  <h2>Rule Engine</h2>
  <button mat-raised-button color="primary" routerLink="/rules/editor">
    <mat-icon>add</mat-icon> New Rule
  </button>
  <p style="margin-top:16px">Fraud rule list — coming soon.</p>
</div>`
})
export class RuleListComponent {}

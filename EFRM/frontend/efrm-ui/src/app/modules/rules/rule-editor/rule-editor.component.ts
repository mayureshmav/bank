import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-rule-editor',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:24px">
  <button mat-stroked-button routerLink="/rules"><mat-icon>arrow_back</mat-icon> Back to Rules</button>
  <h2 style="margin-top:16px">Rule Editor</h2>
  <p>Rule editor — coming soon.</p>
</div>`
})
export class RuleEditorComponent {}

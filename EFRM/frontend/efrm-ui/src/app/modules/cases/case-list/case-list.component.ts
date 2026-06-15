import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-case-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:24px">
  <h2>Case Management</h2>
  <p>Fraud case list — coming soon.</p>
</div>`
})
export class CaseListComponent {}

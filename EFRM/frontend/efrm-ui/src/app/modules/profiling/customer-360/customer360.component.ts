import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'efrm-customer360',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
<div style="padding:24px">
  <h2>Customer 360°</h2>
  <p>Customer profiling view — coming soon.</p>
</div>`
})
export class Customer360Component {}

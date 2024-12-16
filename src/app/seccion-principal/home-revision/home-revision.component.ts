import { Component, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home-revision.component.html',
  styleUrl: './home-revision.component.css'
})
export class HomeRevisionComponent {
  title: string = '';
  description: string = '';
  charCount: number = 0;

  updateCharCount() {
    this.charCount = this.description.length;
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-detalle-revision',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule],
  templateUrl: './detalle-revision.component.html',
  styleUrl: './detalle-revision.component.css'
})
export class DetalleRevisionComponent {
  title: string = '';
  description: string = '';
  charCount: number = 0;

  updateCharCount() {
    this.charCount = this.description.length;
  }
}

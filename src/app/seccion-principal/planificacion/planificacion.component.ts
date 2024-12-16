import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent {
  paginaSeleccionada: string = 'pagina1';
}

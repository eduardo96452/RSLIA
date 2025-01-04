import { Component, inject } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './home-revision.component.html',
  styleUrl: './home-revision.component.css'
})
export class HomeRevisionComponent {
  title: string = '';
  description: string = '';
  tipoRevision: string = '';
  charCount: number = 0;

  constructor(private router: Router, private authService: AuthService) {}

  updateCharCount() {
    this.charCount = this.description.length;
  }

  async createReview() {
    const userId = await this.authService.getSession().then(session => session?.user?.id);
    if (!userId) {
      console.error('No se pudo obtener el ID del usuario.');
      return;
    }
  
    const reviewData = {
      id_usuarios: userId,
      titulo_revision: this.title,
      tipo_revision: this.tipoRevision,
      descripcion: this.description,
      fecha_creacion: new Date().toISOString(),
    };
  
    const { insertData, error } = await this.authService.createReview(reviewData);
  
    if (error) {
      console.error('Error al crear la reseña:', error);
      return;
    }
  
    console.log('Reseña creada exitosamente:', insertData);

    // Mostrar alerta con SweetAlert2
  Swal.fire({
    title: '¡Éxito!',
    text: 'Reseña creada exitosamente.',
    icon: 'success',
    confirmButtonText: 'OK',
  }).then(() => {
    // Redirigir después de cerrar la alerta
    this.router.navigate(['/detalle_revision']);
  });
  }
}

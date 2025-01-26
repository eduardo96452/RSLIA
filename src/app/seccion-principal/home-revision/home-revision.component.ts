import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';
import { FooterComponent } from "../../principal/footer/footer.component";

@Component({
  selector: 'app-home-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent],
  templateUrl: './home-revision.component.html',
  styleUrl: './home-revision.component.css'
})
export class HomeRevisionComponent implements OnInit  {
  title: string = '';
  description: string = '';
  tipoRevision: string = '';
  charCount: number = 0; // Contador de caracteres (opcional)
  isLargeScreen: boolean = true;

  constructor(private router: Router, private authService: AuthService) { }

  updateCharCount() {
    this.charCount = this.description.length;
  }

  async ngOnInit() {
    this.charCount = this.description.length;
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
  }

  onTextChange(value: string) {
    this.charCount = value.length;
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
  
    // Accede al ID correctamente
    const newReviewId = insertData?.[0]?.id_detalles_revision;
    if (!newReviewId) {
      console.error('No se recibió ID de la nueva reseña');
      return;
    }
  
    Swal.fire({
      title: '¡Éxito!',
      text: 'Reseña creada exitosamente.',
      icon: 'success',
      confirmButtonText: 'OK',
    }).then(() => {
      this.router.navigate(['/detalle_revision'], {
        queryParams: { id: newReviewId },
      });
    });
  }
  
  
}

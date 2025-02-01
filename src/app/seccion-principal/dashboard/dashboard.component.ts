import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NgChartsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  userReviewCount: number = 0;
  userReviews: any[] = [];
  slug: string | null = null;
  isLargeScreen: boolean = true;
  userDocumentCount: number = 0; // Almacena el conteo de documentos procesados
  datosGrafico: Array<{ database: string, count: number }> = [];

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    await this.loadUserReviewCount();
    await this.loadUserReviews();
    this.slug = this.route.snapshot.paramMap.get('slug');
    this.loadRevisionBySlug(this.slug);
    this.checkScreenSize();
    await this.loadUserDocumentCount();
    try {
      this.datosGrafico = await this.authService.getDistribucionEstudiosPorBaseDeDatosDeUsuario();
      // Aquí ya tienes la info lista para graficar:
      // Por ejemplo, [{ database: 'PubMed', count: 10 }, { database: 'Scopus', count: 7 }, ... ]
    } catch (error) {
      console.error(error);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
  }

  loadRevisionBySlug(slug: string | null): void {
    // Lógica para obtener la revisión desde la base de datos utilizando el slug
    console.log('Slug recibido:', slug);
    // Ejemplo: Llama a tu servicio para buscar la revisión
  }

  async loadUserReviews() {
    const userId = localStorage.getItem('user_id');
  
    if (!userId) {
      console.error('No se encontró un usuario autenticado');
      return;
    }
  
    this.userReviews = await this.authService.getUserReviews(userId);
  }

  slugify(title: string): string {
    return title
      .toLowerCase()
      .replace(/ /g, '-')   // Reemplaza espacios con guiones
      .replace(/[^\w-]+/g, '');  // Elimina caracteres especiales
  }

  navigateToReviewDetail() {
    this.router.navigate(['/detalle_revision']); // Redirige al detalle
  }

  async loadUserReviewCount() {
    const userId = localStorage.getItem('user_id');

    if (userId) {
      this.userReviewCount = await this.authService.countUserReviews(userId);
    } else {
      console.warn('Usuario no autenticado');
      this.userReviewCount = 0;
    }
  }

  async loadUserDocumentCount(): Promise<void> {
    const userId = localStorage.getItem('user_id');

    if (userId) {
      this.userDocumentCount = await this.authService.countUserDocuments(userId);
    } else {
      console.warn('Usuario no autenticado');
      this.userDocumentCount = 0;
    }
  }
}

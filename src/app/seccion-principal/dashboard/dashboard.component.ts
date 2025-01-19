import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from "../../principal/navbar/navbar.component";
import { AuthService } from '../../auth/data-access/auth.service';
import { FooterComponent } from "../../principal/footer/footer.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  userReviewCount: number = 0;
  userReviews: any[] = [];
  slug: string | null = null;

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) {}

  async ngOnInit() {
    await this.loadUserReviewCount();
    await this.loadUserReviews();
    this.slug = this.route.snapshot.paramMap.get('slug');
    this.loadRevisionBySlug(this.slug);
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
}

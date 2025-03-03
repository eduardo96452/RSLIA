import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { Chart } from 'chart.js/auto';
import { filter } from 'rxjs';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  userReviewCount: number = 0;
  userReviews: any[] = [];
  slug: string | null = null;
  isLargeScreen: boolean = true;
  userDocumentCount: number = 0; // Almacena el conteo de documentos procesados
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;
  isLoading = true;
  errorMessage: string | null = null;
  distributionData: { [key: string]: number } | null = null;
  private checkInterval: any;

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute) { }

  async ngOnInit() {
    await this.loadUserReviewCount();
    await this.loadUserReviews();
    this.slug = this.route.snapshot.paramMap.get('slug');
    this.loadRevisionBySlug(this.slug);
    this.checkScreenSize();
    await this.loadUserDocumentCount();
    try {
      this.distributionData = await this.authService.getEstudiosDistributionByDatabase();
      
    } catch (error) {
      console.error('Error en ngOnInit:', error); // Debug
      this.errorMessage = 'Error al cargar los datos: ' + (error as Error).message;
    } finally {
      this.isLoading = false;
    }

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });
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
    
    
    // Ejemplo: Llama a tu servicio para buscar la revisión
  }

  async loadUserReviews() {
    const userId = localStorage.getItem('user_id');

    if (!userId) {
      console.error('No se encontró un usuario autenticado');
      return;
    }

    this.userReviews = await this.authService.getUserReviews(userId);

    // 2. Para cada revisión, obten la cantidad de documentos y guárdala en la propiedad docCount
    for (const review of this.userReviews) {
      review.docCount = await this.authService.countUserDocumentsByRevision( userId, review.id_detalles_revision);
    }
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

  async eliminarRevision(idRevision: number): Promise<void> {
    const confirmResult = await Swal.fire({
      title: '¿Estás seguro de eliminar esta revisión?',
      text: 'Esta acción no se puede revertir.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
  
    if (!confirmResult.isConfirmed) return;
  
    try {
      const { error } = await this.authService.eliminarRevision(idRevision);
      if (error) {
        throw error;
      }
      Swal.fire({
        icon: 'success',
        title: 'Revisión eliminada',
        text: 'La revisión se eliminó correctamente.'
      });
      // Actualizamos la lista y el contador
      await this.loadUserReviews();
      // userReviewCount se actualiza en loadUserReviews, por ejemplo:
      // this.userReviewCount = this.userReviews.length;
    } catch (err) {
      console.error('Error inesperado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al eliminar la revisión.'
      });
    }
  }
  
  

}

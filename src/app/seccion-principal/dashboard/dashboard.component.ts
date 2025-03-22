import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { Chart } from 'chart.js/auto';
import { Subscription, filter, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Propiedades
  userReviewCount: number = 0;
  userReviews: any[] = [];
  userInformeCount: number = 0;
  slug: string | null = null;
  isLargeScreen: boolean = true;
  isLoading = true;
  errorMessage: string | null = null;
  distributionData: { [key: string]: number } | null = null;
  chart: Chart | null = null;
  private routerSubscription!: Subscription;
  private userId: string | null = localStorage.getItem('user_id');
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    // Si el usuario no está autenticado, maneja el error o redirige.
    if (!this.userId) {
      this.isLoading = false;
      return;
    }

    // Ejecuta en paralelo las cargas asíncronas que no dependen una de otra
    try {
      await Promise.all([
        this.loadUserReviewCount(),
        this.loadUserReviews(),
        this.loadUserInformesCount()
      ]);
      this.slug = this.route.snapshot.paramMap.get('slug');
      this.loadRevisionBySlug(this.slug);
      this.checkScreenSize();
      this.distributionData = await this.authService.getEstudiosDistributionByDatabase();
    } catch (error: any) {
      this.errorMessage = 'Error al cargar los datos: ' + error.message;
    } finally {
      this.isLoading = false;
    }

    // Suscribirse a NavigationEnd para reiniciar el scroll
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => window.scrollTo(0, 0));
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768;
  }

  // Simulación de loadRevisionBySlug; implementar según tu lógica.
  loadRevisionBySlug(slug: string | null): void {
    // Lógica para obtener la revisión a partir del slug
  }

  async loadUserReviews() {
    if (!this.userId) {
      return;
    }
    try {
      this.userReviews = await this.authService.getUserReviews(this.userId);
      // Para cada revisión, obtener la cantidad de documentos
      await Promise.all(this.userReviews.map(async review => {
        review.docCount = await this.authService.countUserDocumentsByRevision(this.userId!, review.id_detalles_revision);
      }));
    } catch (err) {
    }
  }

  slugify(title: string): string {
    return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  }

  navigateToReviewDetail(): void {
    this.router.navigate(['/detalle_revision']);
  }

  async loadUserReviewCount() {
    if (this.userId) {
      this.userReviewCount = await this.authService.countUserReviews(this.userId);
    } else {
      this.userReviewCount = 0;
    }
  }

  async loadUserInformesCount() {
    if (this.userId) {
      this.userInformeCount = await this.authService.countUserInformes(this.userId);
    } else {
      this.userInformeCount = 0;
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
      if (error) throw error;
      Swal.fire({
        icon: 'success',
        title: 'Revisión eliminada',
        text: 'La revisión se eliminó correctamente.'
      });
      // Actualizar lista y contador
      await this.loadUserReviews();
      this.userReviewCount = this.userReviews.length;
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al eliminar la revisión.'
      });
    }
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }
}

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { Chart } from 'chart.js/auto';
import { filter } from 'rxjs';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {

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
      console.log('Datos recibidos:', this.distributionData); // Debug
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

  ngAfterViewInit() {
    console.log('AfterViewInit - Canvas disponible:', !!this.chartCanvas?.nativeElement); // Debug
    
    // Verificar periódicamente si los datos y el canvas están listos
    this.checkInterval = setInterval(() => {
      if (this.distributionData && this.chartCanvas?.nativeElement) {
        this.createChart(this.distributionData);
        clearInterval(this.checkInterval);
      }
    }, 100);
  }

  private createChart(distribution: { [key: string]: number }) {
    try {
      console.log('Creando gráfico con datos:', distribution); // Debug
      
      if (this.chart) {
        this.chart.destroy();
      }

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo obtener el contexto 2D del canvas');
      }

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(distribution),
          datasets: [{
            label: 'Estudios por base de datos',
            data: Object.values(distribution),
            backgroundColor: [
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 99, 132, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(255, 159, 64, 0.5)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          }
        }
      });
      
      console.log('Gráfico creado exitosamente'); // Debug
    } catch (error) {
      console.error('Error al crear el gráfico:', error); // Debug
      this.errorMessage = 'Error al crear el gráfico: ' + (error as Error).message;
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

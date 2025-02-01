import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-detalle-revision',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './detalle-revision.component.html',
  styleUrl: './detalle-revision.component.css'
})
export class DetalleRevisionComponent implements OnInit {
  title: string = '';
  description: string = '';
  charCount1: number = 0;
  reviewId!: string;
  reviewData = {
    titulo_revision: '',
    tipo_revision: '',
    descripcion: ''
  };
  originalData: any = {};
  isModified: boolean = false;
  form: FormGroup;
  userData: any = null;
  isLargeScreen: boolean = true;

  updateCharCount1() {
    this.charCount1 = this.description.length;
  }

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    // Inicializa el formulario reactivo
    this.form = this.fb.group({
      titulo_revision: [''],
      tipo_revision: [''],
      descripcion: [''],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.reviewId = params['id'];
      if (this.reviewId) {
        console.log('Recibí el ID:', this.reviewId);
        // Aquí llamas al método para cargar o procesar los datos de la reseña
        this.loadReviewData1();
      } else {
        console.error('No se encontró el ID en queryParams.');
      }
    });

    this.checkScreenSize();

    this.reviewId = this.route.snapshot.queryParams['id'];

    this.reviewId = this.route.snapshot.paramMap.get('id')!;
    if (this.reviewId) {
      this.loadReviewData();
    }

    this.loadUserData();

    // Detectar cambios en el formulario
    this.form.valueChanges.subscribe(() => {
      this.isModified = this.form.dirty || this.form.touched; // Detecta cambios
    });

  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
  }

  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }

  loadReviewData1(): void {
    this.authService.getReviewById(this.reviewId).then(review => {
      if (review) {
        this.form.patchValue({
          titulo_revision: review.titulo_revision,
          tipo_revision: review.tipo_revision,
          descripcion: review.descripcion
        });
      } else {
        console.error('No se encontraron datos para la revisión con ID:', this.reviewId);
      }
    });
  }

  async loadReviewData() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    try {
      const review = await this.authService.getReviewById(this.reviewId);
      if (review) {
        this.reviewData = review;
        this.originalData = { ...review };
      }
    } catch (error) {
      console.error('Error al cargar los datos de la reseña:', error);
    }
  }

  // Método para detectar cambios en el formulario
  onFieldChange(value: string): void {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.isModified = JSON.stringify(this.reviewData) !== JSON.stringify(this.originalData);
    this.charCount1 = value.length;
  }

  updateReview(): void {
    if (this.form.valid && this.reviewId) {
      const updatedData = this.form.value;

      this.authService.updateReview(this.reviewId, updatedData).then(({ data, error }) => {
        if (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al actualizar la revisión. Por favor, inténtalo de nuevo.',
          });
          console.error('Error al actualizar la revisión:', error);
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Actualización exitosa',
            text: 'La revisión se actualizó correctamente.',
            showConfirmButton: true,
            timer: 2000,
          }).then(() => {
            this.router.navigate(['/planificacion'], { queryParams: { id: this.reviewId } });
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor, completa todos los campos obligatorios antes de continuar.',
      });
    }
  }

  navigateToNext(): void {
    this.reviewId = this.route.snapshot.queryParams['id'];
    if (this.reviewId) {
      this.router.navigate(['/planificacion'], { queryParams: { id: this.reviewId } });
    } else {
      console.error('No se encontró el ID para redirigir.');
    }
  }
}

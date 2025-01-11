import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';
import { FooterComponent } from "../../principal/footer/footer.component";

@Component({
  selector: 'app-detalle-revision',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent, ReactiveFormsModule, FooterComponent],
  templateUrl: './detalle-revision.component.html',
  styleUrl: './detalle-revision.component.css'
})
export class DetalleRevisionComponent implements OnInit {
  title: string = '';
  description: string = '';
  charCount1: number = 0;
  reviewId!: string;
  reviewData: any = {};
  originalData: any = {};
  isModified: boolean = false;
  form: FormGroup;
  userData: any = null;

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
      titulo_revision: ['', Validators.required],
      tipo_revision: ['', Validators.required],
      descripcion: ['', Validators.required],
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

    this.reviewId = this.route.snapshot.queryParams['id'];

    this.reviewId = this.route.snapshot.paramMap.get('id')!;
    if (this.reviewId) {
      this.loadReviewData();
    }

    this.loadUserData();

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
  onFieldChange(): void {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.isModified = JSON.stringify(this.reviewData) !== JSON.stringify(this.originalData);
  }

  updateReview(): void {
  this.reviewId = this.route.snapshot.queryParams['id'];
  if (this.form.valid && this.reviewId) {
    const updatedData = {
      titulo_revision: this.form.value.titulo_revision,
      tipo_revision: this.form.value.tipo_revision,
      descripcion: this.form.value.descripcion
    };

    this.authService.updateReview(this.reviewId, updatedData).then(({ data, error }) => {
      if (error) {
        // Mostrar alerta de error
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al actualizar la revisión. Por favor, inténtalo de nuevo.',
        });
        console.error('Error al actualizar la revisión:', error);
      } else {
        // Mostrar alerta de éxito
        Swal.fire({
          icon: 'success',
          title: 'Actualización exitosa',
          text: 'La revisión se actualizó correctamente.',
          showConfirmButton: true,
          timer: 2000, // Tiempo de duración de la alerta
        }).then(() => {
          // Navegar a otra página después de cerrar la alerta
          this.router.navigate(['/planificacion'], { queryParams: { id: this.reviewId } });
        });
        console.log('Revisión actualizada con éxito:', data);
      }
    });
  } else {
    // Mostrar alerta si el formulario es inválido
    Swal.fire({
      icon: 'warning',
      title: 'Formulario incompleto',
      text: 'Por favor, completa todos los campos obligatorios antes de continuar.',
    });
    console.error('Formulario inválido o ID no encontrado.');
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

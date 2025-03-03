import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';
import { filter } from 'rxjs';

@Component({
  selector: 'app-detalle-revision',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './detalle-revision.component.html',
  styleUrl: './detalle-revision.component.css'
})
export class DetalleRevisionComponent implements OnInit {
  showExplanation: boolean = false;
  reviewId!: string;

  // Objeto que almacena los campos de la reseña, incluida la nueva información (alcance, pais, etc.)
  reviewData: any = {
    titulo_revision: '',
    tipo_revision: '',
    descripcion: '',
    alcance: '',
    pais: '',
    ciudad: '',
    institucion: '',
    area_conocimiento: '',
    tipo_investigacion: ''
  };

  originalData: any = {};  // Almacena los datos originales para comparar cambios
  isModified: boolean = false;

  // Contador de caracteres para la descripción
  charCount1: number = 0;
  form: FormGroup;
  isLargeScreen: boolean = true;

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
      alcance: [''],
      pais: [''],
      ciudad: [''],
      institucion: [''],
      area_conocimiento: [''],
      tipo_investigacion: ['']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.reviewId = params['id'];
      if (this.reviewId) {
        // Cargar los datos de la reseña
        this.loadReviewData();
      } else {
        console.error('No se encontró el ID en queryParams.');
      }
    });

    this.checkScreenSize();

    // Escuchar cambios en el formulario para detectar modificaciones
    this.form.valueChanges.subscribe(() => {
      this.isModified = this.form.dirty || this.form.touched;
    });

    // Nos suscribimos a NavigationEnd, para llevar el scroll al tope
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        window.scrollTo(0, 0);
      });
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // true si la pantalla es >= md
  }

  // Cargar datos desde Supabase
  async loadReviewData() {
    try {
      const review = await this.authService.getReviewById(this.reviewId);
      if (review) {
        this.reviewData = review;
        this.originalData = { ...review };

        // Llenar el formulario reactivo
        this.form.patchValue({
          titulo_revision: review.titulo_revision,
          tipo_revision: review.tipo_revision,
          descripcion: review.descripcion,
          alcance: review.alcance,
          pais: review.pais,
          ciudad: review.ciudad,
          institucion: review.institucion,
          area_conocimiento: review.area_conocimiento,
          tipo_investigacion: review.tipo_investigacion
        });

        // Actualizar el contador de caracteres si es necesario
        this.charCount1 = (review.descripcion || '').length;
      }
    } catch (error) {
      console.error('Error al cargar datos de la reseña:', error);
    }
  }

  // Manejar cambios en algún campo (para contador de caracteres, etc.)
  onFieldChange(value: string): void {
    this.isModified = JSON.stringify(this.reviewData) !== JSON.stringify(this.originalData);
    this.charCount1 = value.length;
  }

  // Actualizar la reseña en Supabase
  updateReview(): void {
    if (this.form.valid && this.reviewId) {
      const updatedData = this.form.value;
      // Asignamos la fecha_modificacion internamente si deseas
      updatedData.fecha_modificacion = new Date().toISOString();

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
            // Opcional: recargar la página o navegar
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

  // Navegar a la siguiente vista
  navigateToNext(): void {
    if (this.reviewId) {
      this.router.navigate(['/planificacion'], { queryParams: { id: this.reviewId } });
    } else {
      console.error('No se encontró el ID para redirigir.');
    }
  }
}
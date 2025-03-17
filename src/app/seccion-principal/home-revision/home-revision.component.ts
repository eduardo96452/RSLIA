import { Component, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';
import { filter } from 'rxjs';

@Component({
  selector: 'app-home-revision',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReactiveFormsModule],
  templateUrl: './home-revision.component.html',
  styleUrl: './home-revision.component.css'
})
export class HomeRevisionComponent implements OnInit {
  title: string = '';
  description: string = '';
  tipoRevision: string = '';
  alcance: string = '';
  pais: string = '';
  ciudad: string = '';
  institucion: string = '';
  areaConocimiento: string = '';
  tipoInvestigacion: string = '';
  charCount: number = 0;
  isLargeScreen: boolean = true;
  form!: FormGroup;
  formSubmitted: boolean = false;
  isDarkModeEnabled: boolean = false;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) { }

  validateFields(): {
    title: boolean;
    tipoRevision: boolean;
    alcance: boolean;
    areaConocimiento: boolean;
    tipoInvestigacion: boolean;
    description: boolean;
    pais: boolean;
    ciudad: boolean;
    institucion: boolean;
  } {
    return {
      title: !!this.title.trim(),
      tipoRevision: !!this.tipoRevision,
      alcance: !!this.alcance,
      areaConocimiento: !!this.areaConocimiento.trim(),
      tipoInvestigacion: !!this.tipoInvestigacion,
      description: !!this.description.trim(),
      pais: (this.alcance === 'Internacional' || this.alcance === 'Nacional' || this.alcance === 'Nivel institucional')
        ? !!this.pais.trim() : true,
      ciudad: (this.alcance === 'Alcance local (Ciudad(es) o unidades territoriales)')
        ? !!this.ciudad.trim() : true,
      institucion: (this.alcance === 'Nivel institucional')
        ? !!this.institucion.trim() : true
    };
  }

  updateCharCount() {
    this.charCount = this.description.length;
  }

  async ngOnInit() {
    this.charCount = this.description.length;
    this.checkScreenSize();

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });

    // Recupera el valor del localStorage y actualiza la variable
    const darkMode = localStorage.getItem('darkMode') === 'true';
    this.isDarkModeEnabled = darkMode;
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

  // Getter que retorna true si todos los campos obligatorios son válidos
  get isFormValid(): boolean {
    const v = this.validateFields();
    return Object.values(v).every(val => val === true);
  }


  async createReview(): Promise<void> {
    this.formSubmitted = true;
    if (!this.isFormValid) {
      // Si hay campos vacíos, no procede
      return;
    }
    const userId = await this.authService.getSession().then(session => session?.user?.id);
    if (!userId) {
      return;
    }

    const reviewData = {
      id_usuarios: userId,
      titulo_revision: this.title,
      tipo_revision: this.tipoRevision,
      descripcion: this.description,
      fecha_creacion: new Date().toISOString(),
      fecha_modificacion: new Date().toISOString(),
      alcance: this.alcance,
      pais: (this.alcance === 'Internacional' || this.alcance === 'Nacional' || this.alcance === 'Nivel institucional') ? this.pais : null,
      ciudad: this.alcance === 'Alcance local (Ciudad(es) o unidades territoriales)' ? this.ciudad : null,
      area_conocimiento: this.areaConocimiento,
      tipo_investigacion: this.tipoInvestigacion,
      institucion: this.alcance === 'Nivel institucional' ? this.institucion : null
    };

    const { insertData, error } = await this.authService.createReview(reviewData);

    if (error) {
      console.error('Error al crear la reseña:', error);
      return;
    }

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

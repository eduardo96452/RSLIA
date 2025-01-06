import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import Swal from 'sweetalert2';
import { HttpClientModule } from '@angular/common/http';

interface Question {
  id: number;
  value: string;
}

@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule, NavbarComponent, ReactiveFormsModule, HttpClientModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent implements OnInit {
  description: string = '';
  paginaSeleccionada: string = 'pagina1';
  // Datos iniciales de la tabla
  tableData = [
    { keyword: 'Machine Learning', related: 'Boolean', synonyms: '', isEditing: false },
    { keyword: 'Artificial Intelligence', related: 'PICO', synonyms: '', isEditing: false },
  ];

  // Opciones para la columna "Relacionado"
  methodologies = ['Boolean', 'PICO', 'SPIDER', 'SPICE'];

  inputValue: string = '';
  items: string[] = [];
  inclusionValue: string = '';
  inclusions: string[] = [];
  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  objetivo: string = ''; // Campo para guardar el objetivo traído de la BD
  charCount: number = 0; // Contador de caracteres (opcional)

  // Datos de la reseña
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';

  constructor(
      private route: ActivatedRoute, 
      private authService: AuthService, 
      private fb: FormBuilder,
      private router: Router,
      private openAiService: OpenAiService
    ) {}
  
  ngOnInit(): void {
    
    this.reviewId = this.route.snapshot.queryParams['id'];

    this.loadReviewData();
    
    this.loadUserData();



  }

  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }

  // Cargar datos de la base de datos
  async loadReviewData() {
    try {
      const reviewData = await this.authService.getReviewById(this.reviewId);
      if (reviewData) {
        this.titulo_revision = reviewData.titulo_revision || '';
        this.tipo_revision = reviewData.tipo_revision || '';
        this.descripcion = reviewData.descripcion || '';
        this.objetivo = reviewData.objetivo || '';
        this.charCount = this.objetivo.length;
      }
    } catch (error) {
      console.error('Error al cargar la reseña:', error);
    }
  }

  /*async loadReviewData() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    try {
      const review = await this.authService.getReviewById(this.reviewId);
      if (review) {
        this.reviewData = review;
        this.titulo_revision = review.titulo_revision || '';
        this.tipo_revision = review.tipo_revision || '';
        this.descripcion = review.descripcion || '';
        this.objetivo = review.objetivo || '';
        this.charCount = this.objetivo.length;
      }
    } catch (error) {
      console.error('Error al cargar los datos de la reseña:', error);
    }
  }*/

  onTextChange(value: string) {
    this.charCount = value.length;
  }

  // Obtener sugerencia de la IA
  getIaSuggestion() {
    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Llamar al servicio OpenAiService
    this.openAiService.getSuggestionFromChatGPT(
      this.titulo_revision,
      this.tipo_revision,
      this.descripcion
    ).subscribe({
      next: (response) => {
        const suggestion = response.objective; // Ajusta según la respuesta del backend
        if (suggestion) {
          this.objetivo = suggestion;
          this.charCount = suggestion.length;
        }
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Sugerencia generada',
          text: 'La IA ha generado una sugerencia para el objetivo.',
          timer: 2500
        });
      },
      error: (error) => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar la sugerencia. Inténtalo nuevamente.'
        });
        console.error('Error en la llamada a la API de ChatGPT:', error);
      }
    });
  }

  // Guardar objetivo en la base de datos
  async saveObjective() {
    try {
      const { data, error } = await this.authService.updateReviewObjective(this.reviewId, this.objetivo);
      if (error) {
        console.error('Error al actualizar el objetivo:', error);
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Objetivo guardado',
          text: 'El objetivo se ha guardado correctamente.',
          timer: 2500
        });
      }
    } catch (err) {
      console.error('Error al guardar el objetivo:', err);
    }
  }







  // Agregar una nueva fila a la tabla
  addRow(): void {
    this.tableData.push({
      keyword: '',
      related: this.methodologies[0],
      synonyms: '',
      isEditing: true,
    });
  }

  // Editar o guardar una fila
  toggleEdit(index: number): void {
    const row = this.tableData[index];
    if (row.isEditing) {
      // Guardar cambios
      row.isEditing = false;
    } else {
      // Activar modo edición
      row.isEditing = true;
    }
  }

  // Eliminar una fila
  deleteRow(index: number): void {
    this.tableData.splice(index, 1);
  }

  // Formatear los sinónimos (separar por comas)
  formatSynonyms(index: number): void {
    const row = this.tableData[index];
    if (row.synonyms) {
      row.synonyms = row.synonyms
        .split(',')
        .map((word: string) => word.trim())
        .filter((word: string) => word !== '')
        .join(', ');
    }
  }


  questions: Question[] = [];

  addQuestion() {
    this.questions.push({ id: Date.now(), value: '' });
  }

  saveQuestion(question: Question) {
    console.log('Saving question:', question.value);
  }

  cancelQuestion(id: number) {
    this.questions = this.questions.filter(q => q.id !== id);
  }

  // Agrega un elemento a la lista
  addItem(): void {
    if (this.inputValue.trim()) {
      this.items.push(this.inputValue.trim());
      this.inputValue = ''; // Limpiar el campo de entrada
    }
  }

  // Elimina un elemento de la lista por índice
  removeItem(index: number): void {
    this.items.splice(index, 1);
  }

  // Agrega un elemento a la lista de inclusiones
  addInclusion(): void {
    if (this.inclusionValue.trim()) {
      this.inclusions.push(this.inclusionValue.trim());
      this.inclusionValue = ''; // Limpiar el campo de entrada
    }
  }

  // Elimina un elemento de la lista de inclusiones por índice
  removeInclusion(index: number): void {
    this.inclusions.splice(index, 1);
  }
  
}

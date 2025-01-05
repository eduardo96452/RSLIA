import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import { AuthService } from '../../auth/data-access/auth.service';

interface Question {
  id: number;
  value: string;
}

@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule, NavbarComponent, ReactiveFormsModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent implements OnInit {
  description: string = '';
  charCount: number = 0;
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

  constructor(
      private route: ActivatedRoute, 
      private authService: AuthService, 
      private fb: FormBuilder,
      private router: Router
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

  async loadReviewData() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    try {
      const review = await this.authService.getReviewById(this.reviewId);
      if (review) {
        this.reviewData = review;
      }
    } catch (error) {
      console.error('Error al cargar los datos de la reseña:', error);
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

  updateCharCount() {
    this.charCount = this.description.length;
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

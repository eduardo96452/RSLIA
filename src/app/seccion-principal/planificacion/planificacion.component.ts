import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Question {
  id: number;
  value: string;
}

@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent {
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

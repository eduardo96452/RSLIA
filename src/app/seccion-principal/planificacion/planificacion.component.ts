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
  paginaSeleccionada: string = 'pagina1';

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
}

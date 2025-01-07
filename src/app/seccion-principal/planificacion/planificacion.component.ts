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
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent, ReactiveFormsModule, HttpClientModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent implements OnInit {
  description: string = '';
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

  metodoToPagina: { [key: string]: string } = {
    'PICO': 'pagina1',
    'PICOC': 'pagina2',
    'PICOTT': 'pagina3',
    'SPICE': 'pagina4'
  };

  paginaToMetodo: { [key: string]: string } = {
    'pagina1': 'PICO',
    'pagina2': 'PICOC',
    'pagina3': 'PICOTT',
    'pagina4': 'SPICE'
  };

  // Nombre de la metodología existente (si la hay)
  existingMethodologyName: string | null = null;

  paginaSeleccionada: string = 'pagina1';
  // PICO
  picoP = '';
  picoI = '';
  picoC = '';
  picoO = '';

  // PICOC
  picocP = '';
  picocI = '';
  picocC = '';
  picocO = '';
  picocContext = '';

  // PICOTT
  picottP = '';
  picottI = '';
  picottC = '';
  picottO = '';
  picottT = '';
  picottT2 = '';

  // SPICE
  spiceS = '';
  spiceP = '';
  spiceI = '';
  spiceC = '';
  spiceE = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService
  ) { }

  ngOnInit(): void {

    this.reviewId = this.route.snapshot.queryParams['id'];

    this.loadReviewData();

    this.loadUserData();

    this.route.queryParams.subscribe(params => {
      this.reviewId = params['id'];
      console.log('Revision ID:', this.reviewId);
      if (this.reviewId) {
        // 2. Cargar metodología existente
        this.loadExistingMethodology();
      }
    });


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
        this.reviewData = reviewData;
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

  async loadExistingMethodology() {
    try {
      const metodologia = await this.authService.getMetodologiaByRevisionId(this.reviewId);
      if (metodologia) {
        // Guardamos el nombre para saber que sí existe
        this.existingMethodologyName = metodologia.nombre_metodologia;

        // Ajustamos la página del select
        const pagina = this.metodoToPagina[metodologia.nombre_metodologia];
        if (pagina) {
          this.paginaSeleccionada = pagina;
        }

        // Rellenar campos según sea PICO, PICOC, PICOTT, SPICE
        if (metodologia.nombre_metodologia === 'PICO') {
          this.picoP = metodologia.p || '';
          this.picoI = metodologia.i || '';
          this.picoC = metodologia.c || '';
          this.picoO = metodologia.o || '';
        } else if (metodologia.nombre_metodologia === 'PICOC') {
          this.picocP = metodologia.p || '';
          this.picocI = metodologia.i || '';
          this.picocC = metodologia.c || '';
          this.picocO = metodologia.o || '';
          this.picocContext = metodologia.c2 || '';
        } else if (metodologia.nombre_metodologia === 'PICOTT') {
          this.picottP = metodologia.p || '';
          this.picottI = metodologia.i || '';
          this.picottC = metodologia.c || '';
          this.picottO = metodologia.o || '';
          this.picottT = metodologia.t || '';
          this.picottT2 = metodologia.t2 || '';
        } else if (metodologia.nombre_metodologia === 'SPICE') {
          this.spiceS = metodologia.s || '';
          this.spiceP = metodologia.p || '';
          this.spiceI = metodologia.i || '';
          this.spiceC = metodologia.c || '';
          this.spiceE = metodologia.e || '';
        }
      } else {
        // No hay metodología previa
        this.existingMethodologyName = null;
      }
    } catch (error) {
      console.error('Error al cargar metodología existente:', error);
    }
  }

  /**
   * Se llama cuando cambia la selección del <select>.
   * Si ya hay una metodología existente y el usuario quiere ver otra,
   * se muestra un SweetAlert2 avisando.
   */

  onMetodoChange(nuevaPagina: string) {
    // Si no hay ninguna metodología guardada, simplemente cambiamos la página
    if (!this.existingMethodologyName) {
      this.paginaSeleccionada = nuevaPagina;
      console.log('Cambiando a', nuevaPagina);
      return;
    }

    // Si la hay, verificamos si el usuario está cambiando a una distinta a la actual
    const metodoActual = this.existingMethodologyName;  // p.ej. "PICO"
    const paginaActual = this.metodoToPagina[metodoActual]; // p.ej. 'pagina1'

    if (paginaActual === nuevaPagina) {
      // El usuario está seleccionando la misma metodología que ya está guardada,
      // no pasa nada especial: se queda en la misma.
      this.paginaSeleccionada = nuevaPagina;
      return;
    }

    // Aquí, la metodología en la BD es distinta a la que usuario seleccionó
    // => Mostrar SweetAlert2 para avisar
    Swal.fire({
      title: '¿Cambiar de metodología?',
      text: `Actualmente tienes guardada la metodología "${metodoActual}". 
¿Quieres ver la sección de "${this.paginaToMetodo[nuevaPagina]}"? 
(No se modificará lo guardado, solo cambiará la vista.)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Usuario confirma => solo cambiamos la vista (no tocamos la BD)
        this.paginaSeleccionada = nuevaPagina;
      } else {
        // Usuario cancela => volver a la página anterior
        this.paginaSeleccionada = paginaActual;
      }
    });
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

  async guardarMetodologiaPICO() {
    if (!this.reviewId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró la ID de la revisión en la URL.'
      });
      return;
    }

    try {
      // 1. Verificar si ya existe metodología para esta revisión
      const existing = await this.authService.getMetodologiaByRevisionId(this.reviewId);

      if (existing) {
        // 2. El usuario confirma si desea sobrescribir
        const result = await Swal.fire({
          title: 'Reemplazar metodología',
          text: 'Ya existe una metodología guardada para esta revisión. ¿Deseas reemplazarla?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, reemplazar',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
          // El usuario canceló la acción
          return;
        }

        // 3. Eliminar la metodología anterior
        await this.authService.deleteMetodologiaByRevisionId(this.reviewId);
      }

      // 4. Insertar la nueva metodología
      const data = {
        id_detalles_revision: this.reviewId,
        nombre_metodologia: 'PICO',
        p: this.picoP,
        i: this.picoI,
        c: this.picoC,
        o: this.picoO
      };

      await this.authService.insertMetodologia(data);

      // 5. Notificar éxito
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'La metodología PICO se guardó correctamente.'
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la metodología.'
      });
      console.error('Error al guardar la metodología PICO:', error);
    }
  }

  async guardarMetodologiaPICOC() {
    if (!this.reviewId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró la ID de la revisión en la URL.'
      });
      return;
    }

    try {
      // 1. Verificar si ya existe metodología para esta revisión
      const existing = await this.authService.getMetodologiaByRevisionId(this.reviewId);

      if (existing) {
        // 2. El usuario confirma si desea sobrescribir
        const result = await Swal.fire({
          title: 'Reemplazar metodología',
          text: 'Ya existe una metodología guardada para esta revisión. ¿Deseas reemplazarla?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, reemplazar',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
          // El usuario canceló la acción
          return;
        }

        // 3. Eliminar la metodología anterior
        await this.authService.deleteMetodologiaByRevisionId(this.reviewId);
      }
      // 4. Insertar la nueva metodología
      const data = {
        id_detalles_revision: this.reviewId,
        nombre_metodologia: 'PICOC',
        p: this.picocP,
        i: this.picocI,
        c: this.picocC,
        o: this.picocO,
        c2: this.picocContext
        // s, e, t, t2 quedan en null

      };
      await this.authService.insertMetodologia(data);

      // 5. Notificar éxito
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'La metodología PICOC se guardó correctamente.'
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la metodología.'
      });
      console.error('Error al guardar la metodología PICOC:', error);
    }
  }

  async guardarMetodologiaPICOTT() {
    if (!this.reviewId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró la ID de la revisión en la URL.'
      });
      return;
    }

    try {
      // 1. Verificar si ya existe metodología para esta revisión
      const existing = await this.authService.getMetodologiaByRevisionId(this.reviewId);

      if (existing) {
        // 2. El usuario confirma si desea sobrescribir
        const result = await Swal.fire({
          title: 'Reemplazar metodología',
          text: 'Ya existe una metodología guardada para esta revisión. ¿Deseas reemplazarla?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, reemplazar',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
          // El usuario canceló la acción
          return;
        }

        // 3. Eliminar la metodología anterior
        await this.authService.deleteMetodologiaByRevisionId(this.reviewId);
      }

      // 4. Insertar la nueva metodología
      const data = {
        id_detalles_revision: this.reviewId,
        nombre_metodologia: 'PICOTT',
        p: this.picottP,
        i: this.picottI,
        c: this.picottC,
        o: this.picottO,
        t: this.picottT,
        t2: this.picottT2
      };
      await this.authService.insertMetodologia(data);

      // 5. Notificar éxito
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'La metodología PICOTT se guardó correctamente.'
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la metodología.'
      });
      console.error('Error al guardar la metodología PICOTT:', error);
    }
  }

  async guardarMetodologiaSPICE() {
    if (!this.reviewId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró la ID de la revisión en la URL.'
      });
      return;
    }

    try {
      // 1. Verificar si ya existe metodología para esta revisión
      const existing = await this.authService.getMetodologiaByRevisionId(this.reviewId);

      if (existing) {
        // 2. El usuario confirma si desea sobrescribir
        const result = await Swal.fire({
          title: 'Reemplazar metodología',
          text: 'Ya existe una metodología guardada para esta revisión. ¿Deseas reemplazarla?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Sí, reemplazar',
          cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
          // El usuario canceló la acción
          return;
        }

        // 3. Eliminar la metodología anterior
        await this.authService.deleteMetodologiaByRevisionId(this.reviewId);
      }

      // 4. Insertar la nueva metodología
      const data = {
        id_detalles_revision: this.reviewId,
        nombre_metodologia: 'SPICE',
        s: this.spiceS,
        p: this.spiceP,
        i: this.spiceI,
        c: this.spiceC,
        e: this.spiceE
      };
      await this.authService.insertMetodologia(data);

      // 5. Notificar éxito
      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'La metodología SPICE se guardó correctamente.'
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la metodología.'
      });
      console.error('Error al guardar la metodología SPICE:', error);
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

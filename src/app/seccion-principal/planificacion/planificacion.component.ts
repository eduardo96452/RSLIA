import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService, KeywordRow, Respuesta } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import Swal from 'sweetalert2';
import { HttpClientModule } from '@angular/common/http';
import { Question } from '../../auth/data-access/auth.service';
import { Criterio } from '../../auth/data-access/auth.service';
import { Pregunta } from '../../auth/data-access/auth.service';
import { filter } from 'rxjs';


@Component({
  selector: 'app-planificacion',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './planificacion.component.html',
  styleUrl: './planificacion.component.css'
})
export class PlanificacionComponent implements OnInit {
  description: string = '';
  // Datos iniciales de la tabla
  tableData: KeywordRow[] = []; // Almacena las palabras clave

  // Este array define tus metodologías (puedes ajustar el formato).
  // Observa que en paréntesis está la letra clave.
  methodologies: string[] = [
    'Escenario (S)',
    'Población (P)',
    'Intervención (I)',
    'Comparación (C)',
    'Resultado (O)',
    'Contexto (C)',
    'Tipo de pregunta (T)',
    'Tipo de articulo (T)',
    'Escenario (E)',
    'Perspectiva (P)',
    'Evaluación (E)'
  ];

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
    'PICO': 'PICO',
    'PICOC': 'PICOC',
    'PICOTT': 'PICOTT',
    'SPICE': 'SPICE'
  };

  paginaToMetodo: { [key: string]: string } = {
    'PICO': 'PICO',
    'PICOC': 'PICOC',
    'PICOTT': 'PICOTT',
    'SPICE': 'SPICE'
  };

  // Nombre de la metodología existente (si la hay)
  existingMethodologyName: string | null = null;

  paginaSeleccionada: string = 'PICO';
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

  questions: Question[] = [];

  cadenaBusqueda: string = '';

  // Para ingresar criterios de exclusión
  exclusionValue: string = '';
  // Lista local de criterios de exclusión
  exclusions: Criterio[] = [];
  // Para ingresar criterios de inclusión
  inclusionValue: string = '';
  // Lista local de criterios de inclusión
  inclusions: Criterio[] = [];

  showScrollButton: boolean = true; // Controla la visibilidad del botón

  questions1: Pregunta[] = []; // Lista de preguntas
  answers1: Respuesta[] = []; // Lista de respuestas
  limitScore1: number = 0; // Puntuación límite
  isLargeScreen: boolean = true;
  showButton = false;


  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService
  ) { }

  async ngOnInit(): Promise<void> {

    this.reviewId = this.route.snapshot.queryParams['id'];

    this.checkScreenSize();

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

    // Obtener preguntas asociadas a la revisión
    await this.loadQuestions();

    this.loadKeywords();

    this.loadCadena();

    await this.loadCriterios();

    this.loadQuestions1();
    this.loadAnswers1();
    this.loadPuntuacion();

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

  onTextChange(value: string) {
    this.charCount = value.length;
  }

  // Método para limpiar el textarea
  clearObjetivo() {
    this.objetivo = '';
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

  // Obtener sugerencia de la IA
  getIaSuggestion() {
    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
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

  generateMethodologyStructure() {
    // Verifica que se hayan ingresado todos los datos necesarios
    if (!this.titulo_revision || !this.paginaSeleccionada || !this.objetivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos faltantes',
        text: 'Por favor, completa el título, la metodología y el objetivo.'
      });
      return;
    }

    // Muestra un SweetAlert de carga
    Swal.fire({
      title: 'Generando estructura...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Llamada a la API
    this.openAiService.getMethodologyStructure(
      this.titulo_revision,
      this.paginaSeleccionada,
      this.objetivo
    ).subscribe({
      next: (response) => {
        // Según la metodología, asigna los valores generados a las variables correspondientes
        const methodologyKey = this.paginaSeleccionada.toUpperCase();
        if (methodologyKey === 'PICO') {
          this.picoP = response.picoP || '';
          this.picoI = response.picoI || '';
          this.picoC = response.picoC || '';
          this.picoO = response.picoO || '';
        } else if (methodologyKey === 'PICOC') {
          this.picocP = response.picocP || '';
          this.picocI = response.picocI || '';
          this.picocC = response.picocC || '';
          this.picocO = response.picocO || '';
          this.picocContext = response.picocContext || '';
        } else if (methodologyKey === 'PICOTT') {
          this.picottP = response.picottP || '';
          this.picottI = response.picottI || '';
          this.picottC = response.picottC || '';
          this.picottO = response.picottO || '';
          this.picottT = response.picottT || '';
          this.picottT2 = response.picottT2 || '';
        } else if (methodologyKey === 'SPICE') {
          this.spiceS = response.spiceS || '';
          this.spiceP = response.spiceP || '';
          this.spiceI = response.spiceI || '';
          this.spiceC = response.spiceC || '';
          this.spiceE = response.spiceE || '';
        }
        console.log('Estructura generada:', response);
        // Cierra el SweetAlert de carga
        Swal.close();
        // Muestra mensaje de éxito
        Swal.fire({
          icon: 'success',
          title: 'Estructura generada',
          text: 'La IA ha generado la estructura de la metodología.',
          timer: 2500
        });
      },
      error: (error) => {
        console.error('Error generando la estructura metodológica:', error);
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar la estructura. Inténtalo nuevamente.'
        });
      }
    });
  }

  addQuestion() {
    this.questions.push({ id: Date.now(), value: '', id_detalles_revision: this.reviewId || undefined, isSaved: false });
  }

  async saveQuestion(question: Question) {
    if (!this.reviewId) {
      await Swal.fire({
        icon: 'error',
        title: 'ID de estudio no disponible',
        text: 'No se puede guardar la pregunta.',
      });
      return;
    }

    if (!question.value.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Pregunta vacía',
        text: 'La pregunta no puede estar vacía.',
      });
      return;
    }

    try {
      const { data, error } = await this.authService.saveResearchQuestion({
        ...question,
        id_estudios: null, // O asigna el ID del estudio asociado si está disponible
        id_detalles_revision: this.reviewId,
      });

      if (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: 'Por favor, intenta nuevamente.',
        });
      } else {
        console.log('Pregunta guardada exitosamente:', data);
        await Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'Pregunta guardada exitosamente.',
        });
      }
      question.isSaved = true;
    } catch (error) {
      console.error('Error al guardar la pregunta:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un error inesperado.',
      });
    }
  }


  async saveAllQuestions() {
    for (const question of this.questions) {
      await this.saveQuestion(question);
    }
    await Swal.fire({
      icon: 'success',
      title: '¡Todo guardado!',
      text: 'Todas las preguntas se han guardado.',
    });
  }


  async cancelQuestion(id: number) {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la pregunta de forma local.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      this.questions = this.questions.filter(q => q.id !== id);
      await Swal.fire({
        icon: 'success',
        title: 'Eliminada',
        text: 'La pregunta ha sido eliminada de forma local.',
      });
    }
  }

  // Método para editar: habilitar el input nuevamente
  editQuestion(question: Question) {
    question.isSaved = false;
  }

  async loadQuestions() {
    if (this.reviewId) {
      const { data, error } = await this.authService.getResearchQuestionsByRevision(this.reviewId);
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error al cargar preguntas',
          text: 'Intente nuevamente.',
        });
        console.error(error);
      } else {
        this.questions = data.map((q: any) => ({
          id: q.id_preguntas_investigacion,
          value: q.pregunta,
          id_estudios: q.id_estudios,
          id_detalles_revision: q.id_detalles_revision,
          isSaved: true,
        }));
        console.log('Preguntas cargadas:', this.questions);
      }
    }
  }

  async deleteQuestion(questionId: number) {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la pregunta de forma permanente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const { error } = await this.authService.deleteResearchQuestion(questionId);

        if (error) {
          await Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: 'Por favor, intenta nuevamente.',
          });
          console.error(error);
        } else {
          this.questions = this.questions.filter(q => q.id !== questionId);
          await Swal.fire({
            icon: 'success',
            title: 'Eliminada',
            text: 'La pregunta ha sido eliminada exitosamente.',
          });
        }
      } catch (error) {
        console.error('Error al eliminar la pregunta:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un error inesperado al eliminar la pregunta.',
        });
      }
    }
  }

  // Función para generar preguntas de investigación a través de la API
  generateResearchQuestions() {
    Swal.fire({
      title: 'Número de Preguntas',
      text: '¿Cuántas preguntas desea generar?',
      icon: 'question',
      input: 'number',
      inputLabel: 'Número de preguntas',
      inputPlaceholder: 'Ingrese un número',
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          return 'Por favor, ingrese un número válido';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const numQuestions = Number(result.value);
        console.log('Generar', numQuestions, 'preguntas');
        // Muestra un SweetAlert de carga
        Swal.fire({
          title: 'Generando preguntas...',
          text: 'Por favor, espera un momento.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading(Swal.getConfirmButton());
          }
        });

        // Llamada al servicio OpenAiService para generar las preguntas
        this.openAiService.getResearchQuestions(
          this.titulo_revision,    // o el título que uses en tu componente
          this.paginaSeleccionada,      // o la metodología (ajusta según tu lógica)
          this.objetivo,        // o el objetivo, etc.
          numQuestions
        ).subscribe(
          (response) => {
            // Cierra el alert de carga
            Swal.close();

            // Suponemos que la respuesta tiene la propiedad "questions" como arreglo de strings.
            const generatedQuestions: string[] = response.questions || [];
            // Mapea cada string a un objeto Question
            this.questions = generatedQuestions.map(q => ({
              id: Date.now() + Math.floor(Math.random() * 1000),
              value: q,
              id_detalles_revision: this.reviewId,
              isSaved: false
            }));
            Swal.fire({
              icon: 'success',
              title: 'Preguntas Generadas',
              text: `Se han generado ${this.questions.length} preguntas de investigación.`,
              timer: 1500
            });
          },
          (error) => {
            console.error('Error al generar preguntas:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron generar las preguntas.',
              timer: 1500
            });
          }
        );
      }
    });
  }

  /**
     * Método para “entrar en modo edición” en una fila que ya existe en BD.
     * Se deshabilita el botón de Guardar (porque ya no es un registro nuevo)
     * y se mostrará en su lugar el botón Actualizar.
     */
  editRow(index: number) {
    const row = this.tableData[index];
    row.isEditing = true; // Activa el modo edición
  }

  // Cargar palabras clave de la base
  async loadKeywords() {
    const { data, error } = await this.authService.getKeywordsByRevision(this.reviewId);
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar',
        text: 'No se pudieron cargar las palabras clave.',
      });
      return;
    }
    // Mapea los datos a tu estructura local
    this.tableData = (data || []).map((item: any) => ({
      id_palabras_clave: item.id_palabras_clave,
      keyword: item.palabra_clave,
      related: item.seccion_metodologia || '',
      // Combina los sinónimos en un solo string separado por comas
      synonyms: [
        item.sinonimo1,
        item.sinonimo2,
        item.sinonimo3,
        item.sinonimo4,
        item.sinonimo5,
      ].filter(Boolean).join(', '),
      isEditing: false,
    }));
  }

  // Agregar una nueva fila a la tabla
  addRow() {
    this.tableData.push({
      keyword: '',
      related: '',
      synonyms: '',
      isEditing: true
    });
  }

  /**
   * Inserta un NUEVO registro en la BD (sólo se usa si NO tiene id_palabras_clave).
   */
  async saveRow(row: KeywordRow) {
    const synonymsArray = row.synonyms
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    try {
      const { data, error } = await this.authService.saveKeyword(
        row.keyword,
        row.related,
        synonymsArray,
        this.reviewId
      );

      if (error) {
        console.error('Error al guardar (insertar):', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo guardar la palabra clave.',
        });
        return;
      }

      // Si se insertó correctamente, data[0] debería traer el nuevo ID
      if (data && data.length > 0) {
        row.id_palabras_clave = data[0].id_palabras_clave;
      }

      row.isEditing = false; // Termina modo edición
      //window.location.reload();
      await Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'La palabra clave se ha insertado correctamente.',
        timer: 1500
      });
    } catch (err) {
      console.error('Error inesperado al guardar:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al guardar la palabra clave.',
        timer: 1500
      });
    }
  }

  /**
   * Actualiza un registro EXISTENTE en la BD (cuando sí tiene id_palabras_clave).
   */
  async updateRow(row: KeywordRow) {
    const synonymsArray = row.synonyms
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    // Verifica que tengamos un ID
    if (!row.id_palabras_clave) {
      console.warn('No existe un id_palabras_clave, no se puede actualizar.');
      return;
    }

    try {
      const { data, error } = await this.authService.updateKeyword(
        row.id_palabras_clave,
        row.keyword,
        row.related,
        synonymsArray,
        this.reviewId
      );

      if (error) {
        console.error('Error al actualizar:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo actualizar la palabra clave.',
        });
        return;
      }

      row.isEditing = false; // Termina modo edición
      await Swal.fire({
        icon: 'success',
        title: '¡Actualizado!',
        text: 'La palabra clave se ha actualizado correctamente.',
      });
    } catch (err) {
      console.error('Error inesperado al actualizar:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al actualizar la palabra clave.',
      });
    }
  }

  async deleteRow(index: number) {
    const row = this.tableData[index];

    // Si la fila no tiene un ID de BD, significa que nunca se guardó,
    // entonces basta con eliminarla localmente.
    if (!row.id_palabras_clave) {
      // Solo quita la fila de la tabla local
      this.tableData.splice(index, 1);
      return;
    }

    // Mostrar confirmación con SweetAlert2
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `La palabra "${row.keyword}" se eliminará.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        // Llamar al método de eliminación en la BD
        const { error } = await this.authService.deleteKeyword(row.id_palabras_clave);

        if (error) {
          // Mostrar error en caso de falla
          Swal.fire({
            icon: 'error',
            title: 'Error al eliminar',
            text: `No se pudo eliminar "${row.keyword}". Intente nuevamente.`,
          });
          console.error(error);
        } else {
          // Eliminar de la tabla local
          this.tableData.splice(index, 1);

          // Confirmación de éxito
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: `La palabra "${row.keyword}" ha sido eliminada.`,
          });
        }
      } catch (e) {
        console.error('Error inesperado al eliminar la palabra clave:', e);
        Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un error al eliminar la palabra clave.',
        });
      }
    }
  }

  // Formatear sinónimos en tiempo real (opcional)  
  formatSynonyms(i: number) {
    // Si deseas normalizar mayúsculas/minúsculas, espacios, etc.
    const row = this.tableData[i];
    // row.synonyms = row.synonyms.trim().toLowerCase();
  }

  buildMethodologyData(): any {
    switch (this.paginaSeleccionada.toUpperCase()) {
      case 'PICO':
        return { P: this.picoP, I: this.picoI, C: this.picoC, O: this.picoO };
      case 'PICOC':
        return { P: this.picocP, I: this.picocI, C: this.picocC, O: this.picocO, Context: this.picocContext };
      case 'PICOTT':
        return { P: this.picottP, I: this.picottI, C: this.picottC, O: this.picottO, T: this.picottT, T2: this.picottT2 };
      case 'SPICE':
        return { S: this.spiceS, P: this.spiceP, I: this.spiceI, C: this.spiceC, E: this.spiceE };
      default:
        return {};
    }
  }

  generateKeywords(): void {
    const methodologyData = this.buildMethodologyData();

    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    this.openAiService.generateKeywords(methodologyData).subscribe(
      (response) => {
        if (response && response.keywords) {
          // Aquí se asigna id_palabras_clave como null para marcar el registro como nuevo,
          // y se establece isEditing a true para mostrar el botón "Guardar".
          this.tableData = response.keywords.map((item: any) => ({
            id_palabras_clave: null,  // No se asigna un ID, por lo que se considera nuevo.
            keyword: item.palabra_clave,
            related: item.metodologia,
            synonyms: Array.isArray(item.sinonimos) ? item.sinonimos.join(', ') : item.sinonimos,
            isEditing: true
          }));
        } else {
          console.error('La respuesta no contiene la propiedad "keywords"');
        }
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Sugerencia generada',
          text: 'La IA ha generado una sugerencia para las palabras clave.',
          timer: 2500
        });
      },
      (error) => {
        console.error("Error generando palabras clave:", error);
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar la sugerencia.'
        });
      }
    );
  }

  // Método para limpiar el textarea
  clearCadena() {
    this.cadenaBusqueda = '';
  }

  /**
   * Guarda la cadena en la base de datos (INSERT).
   * Si sólo existe una cadena por revisión, luego de guardarla,
   * podrías recargar para mostrar en la BD, o simplemente asumir
   * que el valor es el que acabamos de guardar.
   */
  async saveCadena() {
    if (!this.cadenaBusqueda.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cadena vacía',
        text: 'Por favor, ingresa una cadena de búsqueda antes de guardar.',
      });
      return;
    }

    try {
      const { data, error } = await this.authService.insertarCadenaBusqueda(
        this.cadenaBusqueda,
        this.reviewId
      );

      if (error) {
        console.error('Error al guardar la cadena de búsqueda:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: error.message || 'No se pudo guardar la cadena de búsqueda.',
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'La cadena de búsqueda se ha guardado correctamente.',
      });

      // Opcional: recargar para asegurar que reflejas lo que está en BD
      // this.loadCadena();
    } catch (err) {
      console.error('Error inesperado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al guardar la cadena de búsqueda.',
      });
    }
  }

  /**
   * Carga la cadena de búsqueda desde la BD (si existe)
   * y la muestra en el textarea.
   */
  async loadCadena() {
    const { data, error } = await this.authService.getCadenaBusqueda(this.reviewId);

    if (error) {
      console.error('Error al cargar la cadena de búsqueda:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al cargar',
        text: 'No se pudo obtener la cadena de búsqueda.',
      });
      return;
    }

    // Si se espera una sola cadena
    if (data && data.length > 0) {
      // Toma la primera
      this.cadenaBusqueda = data[0].cadena_busqueda;
    } else {
      // No hay ninguna cadena guardada
      this.cadenaBusqueda = '';
    }
  }

  generateSearchString() {
    // Mostrar alerta de carga
    Swal.fire({
      title: 'Generando cadena...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Llamar a la API para generar la cadena de búsqueda
    console.log('Generando cadena de búsqueda con:', this.tableData);
    this.openAiService.getSearchString(this.tableData).subscribe(
      (response) => {
        // Suponemos que la respuesta tiene la propiedad "searchString"
        if (response && response.searchString) {
          this.cadenaBusqueda = response.searchString;
        } else {
          this.cadenaBusqueda = '';
          console.warn('La respuesta de la API no contiene "searchString".');
        }
        // Cerrar la alerta de carga
        Swal.close();
        // Mostrar alerta de éxito
        Swal.fire({
          icon: 'success',
          title: 'Cadena Generada',
          text: 'Se ha generado la cadena de búsqueda.',
          timer: 1500
        });
      },
      (error) => {
        console.error('Error al generar la cadena de búsqueda', error);
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar la cadena de búsqueda.'
        });
      }
    );
  }

  /**
   * Carga los criterios desde la BD y los separa en exclusiones/inclusiones.
   */
  async loadCriterios() {
    const { data, error } = await this.authService.getCriterios(this.reviewId);
    if (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los criterios.',
      });
      return;
    }

    // data es un array con todos los criterios
    // Separamos según sea "exclusion" o "inclusion"
    this.exclusions = [];
    this.inclusions = [];

    (data || []).forEach((crit: any) => {
      const criterio: Criterio = {
        id_criterios: crit.id_criterios,
        descripcion: crit.descripcion,
        tipo: crit.tipo,
        isEditing: false
      };
      if (crit.tipo === 'exclusion') {
        this.exclusions.push(criterio);
      } else {
        this.inclusions.push(criterio);
      }
    });
  }

  /**
   * Agrega un criterio de exclusión en la BD (tipo='exclusion').
   * Se invoca cuando se hace clic en el botón "Agregar" en exclusión.
   */
  async addExclusion() {
    if (!this.exclusionValue.trim()) return;

    // Insertar el criterio en la base de datos
    const { data, error } = await this.authService.insertCriterio(
      this.exclusionValue.trim(),
      'exclusion', // Tipo de criterio
      this.reviewId // ID de la revisión asociada
    );

    if (error) {
      console.error('Error al insertar exclusión:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo insertar el criterio de exclusión.',
      });
      return;
    }

    // Si la inserción fue exitosa, agregamos al arreglo local
    if (data && data.length > 0) {
      const newCriterio: Criterio = {
        id_criterios: (data[0] as any).id_criterios,
        descripcion: (data[0] as any).descripcion,
        tipo: 'exclusion',
        isEditing: false, // Modo edición desactivado inicialmente
      };
      this.exclusions.push(newCriterio);
    }

    // Limpiar el campo de entrada
    this.exclusionValue = '';
  }

  /**
   * Agrega un criterio de inclusión en la BD (tipo='inclusion').
   * Se invoca cuando se hace clic en el botón "Agregar" en inclusión.
   */
  async addInclusion() {
    if (!this.inclusionValue.trim()) return;

    const { data, error } = await this.authService.insertCriterio(
      this.inclusionValue.trim(),
      'inclusion',
      this.reviewId
    );

    if (error) {
      console.error('Error al insertar inclusión:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo insertar el criterio de inclusión.',
      });
      return;
    }

    // Si la inserción fue exitosa, agregamos al arreglo local
    if (data && data.length > 0) {
      const newCriterio: Criterio = {
        id_criterios: (data[0] as any).id_criterios,
        descripcion: (data[0] as any).descripcion,
        tipo: 'inclusion',
        isEditing: false, // Modo edición desactivado inicialmente
      };
      this.inclusions.push(newCriterio);
    }

    this.inclusionValue = '';
  }

  /**
   * Eliminar un criterio de exclusión en la BD y localmente
   */
  async removeExclusion(index: number) {
    const crit = this.exclusions[index];
    if (!crit.id_criterios) {
      // Si por algún motivo no tuviera ID, solo quita local
      this.exclusions.splice(index, 1);
      return;
    }

    // Confirmación
    const result = await Swal.fire({
      title: '¿Eliminar criterio?',
      text: crit.descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    // Llamar al servicio para eliminar
    const { error } = await this.authService.deleteCriterio(crit.id_criterios);
    if (error) {
      console.error('Error al eliminar criterio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el criterio.',
      });
      return;
    }

    // Eliminar local
    this.exclusions.splice(index, 1);
  }

  /**
   * Eliminar un criterio de inclusión en la BD y localmente
   */
  async removeInclusion(index: number) {
    const crit = this.inclusions[index];
    if (!crit.id_criterios) {
      this.inclusions.splice(index, 1);
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar criterio?',
      text: crit.descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    const { error } = await this.authService.deleteCriterio(crit.id_criterios);
    if (error) {
      console.error('Error al eliminar criterio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el criterio.',
      });
      return;
    }

    this.inclusions.splice(index, 1);
  }

  /**
   * Activar modo edición en una exclusión
   */
  editExclusion(index: number) {
    this.exclusions[index].isEditing = true;
  }

  /**
   * Guardar actualización de una exclusión (ya existe en BD)
   */
  async updateExclusion(index: number) {
    const crit = this.exclusions[index];
    let updateError = null;

    // Si existe id_criterios, intentamos actualizar
    if (crit.id_criterios) {
      const { error } = await this.authService.updateCriterio(
        crit.id_criterios,
        crit.descripcion
      );
      updateError = error;
      if (!updateError) {
        crit.isEditing = false;
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'El criterio ha sido actualizado.'
        });
        return;
      } else {
        console.error('Error al actualizar criterio:', updateError);
      }
    }

    // Si no existe id_criterios o la actualización falló, intentamos insertar
    const { data, error } = await this.authService.insertCriterio(
      crit.descripcion,
      'exclusion', // Tipo de criterio
      this.reviewId // ID de la revisión asociada
    );

    if (error) {
      console.error('Error al insertar criterio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar ni insertar el criterio.'
      });
      return;
    }

    // Si la inserción fue exitosa, actualizamos el arreglo local
    if (data && data.length > 0) {
      const newCriterio: Criterio = {
        id_criterios: data[0].id_criterios,
        descripcion: data[0].descripcion,
        tipo: 'exclusion',
        isEditing: false
      };
      this.exclusions[index] = newCriterio;
    }

    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: 'El criterio se ha agregado a la base de datos.',
      timer: 1500
    });
  }

  /**
   * Activar modo edición en una inclusión
   */
  editInclusion(index: number) {
    this.inclusions[index].isEditing = true;
  }

  /**
   * Guardar actualización de una inclusión (ya existe en BD)
   */
  async updateInclusion(index: number) {
    const crit = this.inclusions[index];
    let updateError = null;

    // Si existe id_criterios, intentamos actualizar
    if (crit.id_criterios) {
      const { error } = await this.authService.updateCriterio(
        crit.id_criterios,
        crit.descripcion
      );
      updateError = error;
      if (!updateError) {
        crit.isEditing = false;
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'El criterio ha sido actualizado.'
        });
        return;
      } else {
        console.error('Error al actualizar criterio:', updateError);
      }
    }

    // Si no existe id_criterios o si la actualización falló, intentamos insertar
    const { data, error } = await this.authService.insertCriterio(
      crit.descripcion,
      'inclusion',
      this.reviewId
    );

    if (error) {
      console.error('Error al insertar criterio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar ni insertar el criterio.'
      });
      return;
    }

    // Si la inserción fue exitosa, actualizamos el arreglo local
    if (data && data.length > 0) {
      const newCriterio: Criterio = {
        id_criterios: data[0].id_criterios,
        descripcion: data[0].descripcion,
        tipo: 'inclusion',
        isEditing: false
      };
      this.inclusions[index] = newCriterio;
    }

    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: 'El criterio se ha agregado a la base de datos.',
      timer: 1500
    });
  }

  generateCriteriaFromAI() {
    if (!this.titulo_revision || !this.objetivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos faltantes',
        text: 'Por favor, asegúrate de ingresar el título y el objetivo del estudio.'
      });
      return;
    }

    // Mostrar alerta de carga
    Swal.fire({
      title: 'Generando criterios...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        // Puedes pasar Swal.getConfirmButton() si lo requieres, pero generalmente se usa sin parámetro
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    this.openAiService.generateCriteria(this.titulo_revision, this.objetivo).subscribe(
      (response) => {
        console.log('Respuesta de la IA:', response);
        // Cerrar la alerta de carga
        Swal.close();

        // Se espera que response sea un array de objetos: { criterio, categoria }
        // Reiniciar arrays de criterios
        this.exclusions = [];
        this.inclusions = [];

        response.forEach((item: any) => {
          // Convertir la categoría a minúsculas para facilitar la comparación
          const cat = item.categoria.toLowerCase();
          // Aquí, asigna la propiedad 'descripcion' tomando el valor de item.criterio
          const criterioObj: Criterio = {
            descripcion: item.criterio,  // Asegúrate de que 'item.criterio' contenga la palabra que deseas mostrar
            isEditing: true,             // Se inicia en modo edición
            tipo: (cat.includes('excluido') || cat.includes('exclusion')) ? 'exclusion' : 'inclusion'
          };

          if (criterioObj.tipo === 'exclusion') {
            this.exclusions.push(criterioObj);
          } else {
            this.inclusions.push(criterioObj);
          }
        });

        // Mostrar alerta de éxito
        Swal.fire({
          icon: 'success',
          title: 'Criterios Generados',
          text: 'Se ha generado la cadena de búsqueda.',
          timer: 1500
        });
      },
      (error) => {
        Swal.close();
        console.error('Error al generar criterios:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron generar los criterios con IA.'
        });
      }
    );
  }









  //segunda pagina

  // Cargar preguntas desde la BD
  async loadQuestions1() {
    const { data, error } = await this.authService.getPreguntasByRevision(this.reviewId);
    if (error) {
      console.error('Error al cargar preguntas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las preguntas.'
      });
    } else {
      this.questions1 = data || [];
    }
  }

  // Añadir una nueva pregunta
  async addQuestion1() {
    try {
      const result = await Swal.fire({
        title: 'Nueva pregunta',
        text: 'Ingrese la descripción de la nueva pregunta:',
        icon: 'question',
        input: 'text',
        inputPlaceholder: 'Escribe aquí la pregunta...',
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '¡La pregunta no puede estar vacía!';
          }
          return null;
        }
      });

      // Si el usuario hace clic en "Agregar" y se valida el input...
      if (result.isConfirmed && result.value) {
        const nuevaDescripcion = result.value.trim();

        const { data, error } = await this.authService.insertPregunta(nuevaDescripcion, this.reviewId);
        if (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo insertar la pregunta.'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Pregunta agregada',
            text: 'La pregunta se agregó correctamente.'
          });
          // data[0] => registro insertado
          if (data && data.length > 0) {
            this.questions1.push(data[0]);
          }
        }
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al agregar la pregunta.'
      });
    }
  }

  // Editar una pregunta existente
  async editQuestion1(index: number) {
    const current = this.questions1[index];

    try {
      // Usa SweetAlert2 para mostrar un input donde el usuario edite la pregunta
      const result = await Swal.fire({
        title: 'Editar pregunta',
        text: 'Modifica la descripción de la pregunta:',
        icon: 'question',
        input: 'text',
        inputValue: current.descripcion, // Muestra la descripción actual en el input
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '¡La pregunta no puede estar vacía!';
          }
          return null;
        }
      });

      // Verifica si el usuario confirmó la actualización
      if (result.isConfirmed && result.value) {
        const nuevaDescripcion = result.value.trim();

        // Llama al servicio para actualizar la pregunta
        const { error } = await this.authService.updatePregunta(current.id_pregunta, nuevaDescripcion);

        if (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo actualizar la pregunta.'
          });
        } else {
          // Actualiza localmente la descripción
          this.questions1[index].descripcion = nuevaDescripcion;

          Swal.fire({
            icon: 'success',
            title: 'Pregunta actualizada',
            text: 'La pregunta se actualizó correctamente.'
          });
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al editar la pregunta.'
      });
    }
  }

  // Eliminar una pregunta
  async deleteQuestion1(index: number) {
    const current = this.questions1[index];
    const result = await Swal.fire({
      title: '¿Eliminar pregunta?',
      text: current.descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const { error } = await this.authService.deletePregunta(current.id_pregunta);
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la pregunta.'
      });
    } else {
      this.questions1.splice(index, 1);
      Swal.fire({
        icon: 'success',
        title: 'Pregunta eliminada',
        text: 'La pregunta se eliminó correctamente.'
      });
    }
  }

  // Cargar respuestas desde la BD
  async loadAnswers1() {
    const { data, error } = await this.authService.getRespuestasByRevision(this.reviewId);
    if (error) {
      console.error('Error al cargar respuestas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las respuestas.'
      });
    } else {
      this.answers1 = data || [];
    }
  }

  /**
   * Añadir una fila nueva en modo edición (sin id_respuesta).
   */
  addLocalAnswer() {
    this.answers1.push({
      descripcion: '',
      peso: 0,
      isEditing: true,
      id_respuesta: 0//queda undefined => indica que aún no está guardado en la BD
    });
  }

  /**
   * Guardar en la BD la respuesta nueva (la que no tiene id_respuesta)
   */
  async saveNewAnswer(index: number) {
    const current = this.answers1[index];
    if (!current.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción vacía',
        text: 'Por favor, ingresa una descripción antes de guardar.'
      });
      return;
    }

    // Llamamos al AuthService para insertar
    const { data, error } = await this.authService.insertRespuesta(
      current.descripcion,
      current.peso,
      this.reviewId
    );
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo insertar la respuesta.'
      });
      console.error('Error al insertar respuesta:', error);
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Respuesta guardada',
        text: 'La respuesta se insertó correctamente.'
      });
      // data[0] => registro recién insertado (Supabase)
      if (data && data.length > 0) {
        this.answers1[index] = {
          ...data[0],
          isEditing: false
        };
      } else {
        // Si no se devolvieron datos, al menos quita modo edición
        this.answers1[index].isEditing = false;
      }
    }
  }

  editAnswer1(index: number) {
    this.answers1[index].isEditing = true;
  }

  /**
   * Guardar cambios en la BD para una respuesta existente.
   */
  async updateAnswer1(index: number) {
    const current = this.answers1[index];
    if (!current.id_respuesta) {
      console.error('No existe id_respuesta => no se puede actualizar en la BD.');
      return;
    }
    if (!current.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción vacía',
        text: 'Por favor, ingresa una descripción antes de actualizar.'
      });
      return;
    }

    const { error } = await this.authService.updateRespuesta(
      current.id_respuesta,
      current.descripcion,
      current.peso
    );
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la respuesta.'
      });
      console.error('Error al actualizar respuesta:', error);
    } else {
      this.answers1[index].isEditing = false;
      Swal.fire({
        icon: 'success',
        title: 'Respuesta actualizada',
        text: 'La respuesta se actualizó correctamente.'
      });
    }
  }

  // Eliminar una respuesta
  async deleteAnswer1(index: number) {
    const current = this.answers1[index];

    // Si la respuesta no tiene ID, significa que nunca se guardó => se quita local
    if (!current.id_respuesta) {
      this.answers1.splice(index, 1);
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar respuesta?',
      text: current.descripcion,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    const { error } = await this.authService.deleteRespuesta(current.id_respuesta);
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la respuesta.'
      });
      console.error('Error al eliminar respuesta:', error);
    } else {
      this.answers1.splice(index, 1);
      Swal.fire({
        icon: 'success',
        title: 'Respuesta eliminada',
        text: 'La respuesta se eliminó correctamente.'
      });
    }
  }

  // ---------------- PUNTUACIONES ----------------

  async loadPuntuacion() {
    try {
      const data = await this.authService.getScoreByRevision(this.reviewId);
      if (data && data.length > 0) {
        // Toma la primera fila
        this.limitScore1 = data[0].puntuacion_limite;
      } else {
        console.log('No se encontró puntuación para esta revisión. Se creará una nueva si se guarda.');
      }
    } catch (error) {
      console.error('Error al cargar puntuación:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al cargar la puntuación.',
      });
    }
  }

  /**
   * Guarda la puntuación límite (crear o actualizar).
   */
  async saveLimitScore() {
    try {
      const { data, error } = await this.authService.saveLimitScore(this.reviewId, this.limitScore1);
      if (error) {
        console.error('Error al guardar puntuación:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la puntuación.',
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: '¡Guardado!',
          text: 'Puntuación límite guardada correctamente.',
          timer: 2000,
        });
      }
    } catch (err) {
      console.error('Error inesperado al guardar la puntuación:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al guardar la puntuación.',
      });
    }
  }

}

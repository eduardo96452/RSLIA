import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { AuthService, BaseBibliografica, DataField, KeywordRow, Metodologia, Respuesta } from '../../auth/data-access/auth.service';
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
  tableData: KeywordRow[] = [];

  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  objetivo: string = '';
  showObjectiveHelp = false;
  objectiveSaved: boolean = false;
  isCopied: boolean = false;
  charCount: number = 0;
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  metodologias: Metodologia[] = [];

  metodoToPagina: { [key: string]: string } = {
    'PICO': 'PICO',
    'PICOC': 'PICOC',
    'PICOTT': 'PICOTT',
    'SPICE': 'SPICE'
  };

  paginaToMetodo: { [key: string]: string } = {
    'PICO': 'Metodología PICO',
    'PICOC': 'Metodología PICOC',
    'PICOTT': 'Metodología PICOTT',
    'SPICE': 'Metodología SPICE'
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

  showFrameworkHelp = false;

  metodologiaGuardada = false;

  questions: Question[] = [];

  showQuestionsHelp = false;

  questionsUpdated = false;

  private temporaryIdCounter: number = 1;

  relatedOptions: { id: number; nombre: string }[] = [];

  idmetodologiaSeleccionada: number | null = null;
  metodologiaNombreSeleccionada: string | null = null;

  sinonimo: string = '';
  palabraClave: string = '';
  metodologiaName: string = '';
  metodologiaSeleccionada: string = '';
  defaultRelatedOption = { id: null, nombre: 'Elije un componente' };
  showKeywordsHelp = false;
  keywordsUpdated: boolean = false;

  cadenaBusqueda: string = '';
  cadenaGuardada: boolean = false;
  isCadenaCopied: boolean = false;
  showSearchHelp = false;
  globalCadena: string = '';
  isGlobalCadenaCopied: boolean = false;
  globalCadenaGuardada: boolean = false;


  bases: BaseBibliografica[] = [];
  showBasesHelp = false;

  suggestions = [
    { nombre: 'IEEE Xplore', url: 'https://ieeexplore.ieee.org/' },
    { nombre: 'Scopus', url: 'https://www.scopus.com/' },
    { nombre: 'ScienceDirect', url: 'https://www.sciencedirect.com/' },
    { nombre: 'ACM Digital Library', url: 'https://dl.acm.org/' }
  ];
  basesGuardadas: boolean = false;

  exclusionValue: string = '';
  exclusions: Criterio[] = [];
  inclusionValue: string = '';
  inclusions: Criterio[] = [];
  showSelectionHelp = false;
  criteriosGuardados: boolean = false;

  showScrollButton: boolean = true;

  questions1: Pregunta[] = [];
  showQualityHelp = false;
  qualityQuestionsSaved: boolean = false;


  answers1: Respuesta[] = [];
  showAnswersHelp = false;
  respuestasGuardadas: boolean = false;

  limitScore1: number = 0;
  showScoresHelp = false;
  puntuacionesGuardadas: boolean = false;

  isLargeScreen: boolean = true;
  showButton = false;

  fields: DataField[] = [];
  showExtractionHelp = false;
  fieldsSaved: boolean = false;
  dataExtractionQuestions: Array<{ pregunta: string; tipo: string }> = [];
  basesBibliograficas: any;

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

    this.loadMetodologias();

    this.loadSavedMetodologia();

    // Obtener preguntas asociadas a la revisión
    await this.loadQuestions();

    this.loadComponentsForSelect();

    await this.loadKeywordsAndSynonyms()

    await this.loadGlobalCadena();

    await this.loadBases();

    await this.loadBasesCadenas();

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

    await this.loadFields();
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

        // Si existe contenido en la BD, marcamos como "guardado"
        // con trim() aseguramos no contar espacios en blanco
        this.objectiveSaved = !!this.objetivo.trim();
      }
    } catch (error) {
      console.error('Error al cargar la reseña:', error);
    }
  }

  onInputChanged() {
    this.metodologiaGuardada = false;
  }

  // ---------------- OBJETIVO ----------------

  onTextChange(value: string) {
    this.charCount = value.length;
    this.objectiveSaved = false;
  }

  clearObjetivo() {
    this.objetivo = '';
    this.objectiveSaved = false;
  }

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
    this.objectiveSaved = true;
  }

  getIaSuggestion() {
    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Preparar objeto con campos opcionales
    const extraFields: any = {};

    if (this.reviewData.alcance && this.reviewData.alcance.trim()) {
      extraFields.alcance = this.reviewData.alcance.trim();
    }
    if (this.reviewData.pais && this.reviewData.pais.trim()) {
      extraFields.pais = this.reviewData.pais.trim();
    }
    if (this.reviewData.ciudad && this.reviewData.ciudad.trim()) {
      extraFields.ciudad = this.reviewData.ciudad.trim();
    }
    if (this.reviewData.area_conocimiento && this.reviewData.area_conocimiento.trim()) {
      extraFields.area_conocimiento = this.reviewData.area_conocimiento.trim();
    }
    if (this.reviewData.tipo_investigacion && this.reviewData.tipo_investigacion.trim()) {
      extraFields.tipo_investigacion = this.reviewData.tipo_investigacion.trim();
    }
    if (this.reviewData.institucion && this.reviewData.institucion.trim()) {
      extraFields.institucion = this.reviewData.institucion.trim();
    }

    // Llamar al servicio OpenAiService y pasarle los campos opcionales
    this.openAiService.getSuggestionFromChatGPT(
      this.titulo_revision,
      this.tipo_revision,
      this.descripcion,
      extraFields
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
        this.metodologiaGuardada = false;
        this.objectiveSaved = false;
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

  copyObjective(): void {
    const textToCopy = this.objetivo || '';
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Cambiamos el texto del botón a “Copiado”
        this.isCopied = true;

        // Después de 2 segundos, volvemos a mostrar “Copiar”
        setTimeout(() => {
          this.isCopied = false;
        }, 2000);
      })
      .catch(err => {
        console.error('Error al copiar el texto', err);
      });
  }


  // ---------------- PREGUNTAS DE INVESTIGACIÓN ----------------

  addQuestion() {
    this.questions.push({
      id: this.temporaryIdCounter++, // Usa el contador temporal para asignar un ID pequeño
      value: '',
      id_detalles_revision: this.reviewId || undefined,
      isSaved: false
    });
    this.questionsUpdated = false;
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
        id_detalles_revision: this.reviewId,
      });

      if (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: 'Por favor, intenta nuevamente.',
        });
        return;
      }

      // Actualizar el objeto con el ID retornado
      if (data && data.length > 0) {
        question.id = data[0].id_preguntas_investigacion;
      }
      question.isSaved = true;
      question.isEditing = false;

      await Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'Pregunta guardada exitosamente.',
      });
      this.questionsUpdated = true;
    } catch (error) {
      console.error('Error al guardar la pregunta:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un error inesperado.',
      });
    }
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

  editQuestion(question: Question) {
    question.isSaved = false;
    question.isEditing = true;
    this.questionsUpdated = false;
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
          id_detalles_revision: q.id_detalles_revision,
          isSaved: true,
        }));

        // Si se han cargado preguntas guardadas, mostramos el icono de verificación
        this.questionsUpdated = this.questions.length > 0;
      }
    }
  }

  async updateQuestion(question: Question) {
    try {
      // Llamada al servicio para actualizar la pregunta en la base de datos.
      // Se asume que el método updateQuestion recibe un objeto con la pregunta y su ID.
      const result = await this.authService.updateQuestion(question);

      if (result.error) {
        // Manejar el error, por ejemplo, mostrar una alerta.
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Ocurrió un error al actualizar la pregunta.'
        });
        return;
      }

      // Si la actualización fue exitosa, se actualizan los estados locales
      question.isSaved = true;
      question.isEditing = false;

      Swal.fire({
        icon: 'success',
        title: 'Actualizado',
        text: 'La pregunta se actualizó correctamente.'
      });
      this.questionsUpdated = true;
    } catch (error) {
      console.error('Error al actualizar la pregunta:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al actualizar la pregunta.'
      });
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
          this.questionsUpdated = false;
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

  generateResearchQuestions(): void {
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
        // Mostrar alerta de carga
        Swal.fire({
          title: 'Generando preguntas...',
          text: 'Por favor, espera un momento.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading(Swal.getConfirmButton());
          }
        });

        // Llamada al servicio para generar las preguntas
        this.openAiService.getResearchQuestions(
          this.titulo_revision,       // Título o dato que uses
          this.paginaSeleccionada,    // Metodología seleccionada
          this.objetivo,              // Objetivo
          numQuestions,
          this.reviewData.tipo_investigacion // Campo adicional
        ).subscribe({
          next: (response) => {
            Swal.close();
            // Suponemos que response.questions es un arreglo de strings
            const generatedQuestions: string[] = response.questions || [];

            // Mapea cada string a un objeto Question
            const newQuestions = generatedQuestions.map(q => ({
              id: Date.now() + Math.floor(Math.random() * 1000),
              value: q,
              id_detalles_revision: this.reviewId,
              isSaved: false
            }));

            // Si ya existen registros, se agregan los nuevos al final
            if (this.questions && this.questions.length > 0) {
              this.questions = [...this.questions, ...newQuestions];
            } else {
              this.questions = newQuestions;
            }

            Swal.fire({
              icon: 'success',
              title: 'Preguntas Generadas',
              text: `Se han generado ${newQuestions.length} preguntas de investigación.`,
              timer: 1500
            });
            this.questionsUpdated = false;
          },
          error: (error) => {
            console.error('Error al generar preguntas:', error);
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudieron generar las preguntas.',
              timer: 1500
            });
          }
        });
      }
    });
  }

  // ---------------- FRAMEWORK ----------------

  async loadMetodologias(): Promise<void> {
    this.metodologias = await this.authService.getMetodologias();
  }

  async guardarMetodologia() {
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
          title: 'Reemplazar Framework',
          text: 'Ya existe un Framework guardado para esta revisión. ¿Deseas reemplazarla?',
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
        await this.authService.deleteMethodologiaByRevisionId(this.reviewId);
        await this.loadKeywordsAndSynonyms();
      }

      // 4. Obtener el id_metodologia según la página seleccionada (PICO, PICOC, PICOTT, SPICE, etc.)
      const metodologia = await this.authService.getMetodologiaByName(this.paginaSeleccionada);
      if (!metodologia) {
        // Si no se encuentra en la tabla "metodologias", avisar y terminar
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `No se encontró la Framework "${this.paginaSeleccionada}" en la base de datos.`
        });
        return;
      }

      // 5. Obtener los componentes (P, I, C, O, etc.) asociados a esa metodología
      const componentes = await this.authService.getComponentesByMetodologiaId(metodologia.id_metodologia);
      if (!componentes || componentes.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `No se encontraron componentes para el Framework "${this.paginaSeleccionada}".`
        });
        return;
      }

      let subcomponentValues: { [key: string]: string } = {};

      switch (this.paginaSeleccionada.toUpperCase()) {
        case 'PICO':
          subcomponentValues = {
            'P': this.picoP,
            'I': this.picoI,
            'C': this.picoC,
            'O': this.picoO
          };
          break;

        case 'PICOC':
          subcomponentValues = {
            'P': this.picocP,
            'I': this.picocI,
            'C': this.picocC,
            'O': this.picocO,
            'CONTEXT': this.picocContext
          };
          break;

        case 'PICOTT':
          subcomponentValues = {
            'P': this.picottP,
            'I': this.picottI,
            'C': this.picottC,
            'O': this.picottO,
            'TIPO1': this.picottT,
            'TIPO2': this.picottT2
          };
          break;

        case 'SPICE':
          subcomponentValues = {
            'S': this.spiceS,
            'P': this.spiceP,
            'I': this.spiceI,
            'C': this.spiceC,
            'E': this.spiceE
          };
          break;

        default:
          Swal.fire({
            icon: 'error',
            title: 'Framework desconocido',
            text: `El Framework "${this.paginaSeleccionada}" no está contemplada en el switch.`
          });
          return;
      }

      for (const comp of componentes) {
        const valor = subcomponentValues[comp.sigla.toUpperCase()] || '';
        if (valor.trim() !== '') {
          await this.authService.insertComponenteRevision(this.reviewId, comp.id_componente, valor);
          this.metodologiaGuardada = true;
        }
      }
      await this.loadKeywordsAndSynonyms();
      this.loadComponentsForSelect();

      Swal.fire({
        icon: 'success',
        title: 'Guardado',
        text: `El Framework "${this.paginaSeleccionada}" se guardó correctamente.`
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar el Framework.'
      });
      console.error('Error al guardar la metodología:', error);
    }
  }

  async loadSavedMetodologia() {
    try {
      // 1. Revisar qué metodología está asociada a la revisión
      const metodologia = await this.authService.getMetodologiaByRevisionId(this.reviewId);
      if (!metodologia) {
        // No hay metodología guardada
        this.metodologiaGuardada = false;
        return;
      }

      this.metodologiaGuardada = true;
      // 2. Saber cuál es el nombre o ID de esa metodología
      this.paginaSeleccionada = metodologia.nombre; // Ej: "PICO", "PICOC", etc.

      // 3. Obtener los componentes con sus valores
      const componentesRevision = await this.authService.getComponentesRevisionByReviewId(this.reviewId);

      // 4. Asignar cada valor al input correspondiente según la sigla
      componentesRevision.forEach(cr => {
        // Verificar si "componente" es un array y extraer el primer objeto
        let comp: { sigla: string; id_metodologia: number } | undefined;
        if (Array.isArray(cr.componente)) {
          if (cr.componente.length > 0) {
            comp = cr.componente[0];
          }
        } else {
          comp = cr.componente;
        }

        if (!comp) return; // Si no existe el componente, salimos de la iteración

        const sigla = comp.sigla.toUpperCase();
        const valor = cr.palabra_clave;

        // Según la metodología guardada, asignar a las variables correspondientes
        const metodologiaActual = this.paginaSeleccionada.toUpperCase();

        if (metodologiaActual === 'PICO') {
          switch (sigla) {
            case 'P':
              this.picoP = valor;
              break;
            case 'I':
              this.picoI = valor;
              break;
            case 'C':
              this.picoC = valor;
              break;
            case 'O':
              this.picoO = valor;
              break;
            default:
              console.warn(`Sigla ${sigla} no reconocida para PICO`);
              break;
          }
        } else if (metodologiaActual === 'PICOC') {
          switch (sigla) {
            case 'P':
              this.picocP = valor;
              break;
            case 'I':
              this.picocI = valor;
              break;
            case 'C':
              this.picocC = valor;
              break;
            case 'O':
              this.picocO = valor;
              break;
            // Suponiendo que la sigla para "Contexto" sea "CONTEXT"
            case 'CONTEXT':
              this.picocContext = valor;
              break;
            default:
              console.warn(`Sigla ${sigla} no reconocida para PICOC`);
              break;
          }
        } else if (metodologiaActual === 'PICOTT') {
          switch (sigla) {
            case 'P':
              this.picottP = valor;
              break;
            case 'I':
              this.picottI = valor;
              break;
            case 'C':
              this.picottC = valor;
              break;
            case 'O':
              this.picottO = valor;
              break;
            case 'TIPO1':
              this.picottT = valor;
              break;
            case 'TIPO2':
              this.picottT2 = valor;
              break;
            default:
              console.warn(`Sigla ${sigla} no reconocida para PICOTT`);
              break;
          }
        } else if (metodologiaActual === 'SPICE') {
          switch (sigla) {
            case 'S':
              this.spiceS = valor;
              break;
            case 'P':
              this.spiceP = valor;
              break;
            case 'I':
              this.spiceI = valor;
              break;
            case 'C':
              this.spiceC = valor;
              break;
            case 'E':
              this.spiceE = valor;
              break;
            default:
              console.warn(`Sigla ${sigla} no reconocida para SPICE`);
              break;
          }
        } else {
          console.warn(`Metodología ${this.paginaSeleccionada} no contemplada en el asignador de valores.`);
        }
      });

    } catch (error) {
      console.error('Error al cargar el Framework existente:', error);
    }

    this.metodologiaGuardada = true;
  }

  async onMetodoChange(nuevaPagina: string) {
    // Consultar la metodología guardada para la revisión
    const savedMethodology = await this.authService.getMetodologiaByRevisionId(this.reviewId);
    const savedMethodologyName = savedMethodology ? savedMethodology.nombre : null;

    // Si hay una metodología guardada, actualizamos la variable para ocultar el botón
    this.metodologiaGuardada = false;

    // Si no hay metodología guardada, se cambia la vista sin confirmar
    if (!savedMethodologyName) {
      this.paginaSeleccionada = nuevaPagina;
      return;
    }

    // Determinar la página actual a partir de la metodología guardada
    const paginaActual = this.metodoToPagina[savedMethodologyName]; // Ej.: "pagina1"

    // Si la nueva página es la misma que la actual, no se hace nada
    if (paginaActual === nuevaPagina) {
      this.paginaSeleccionada = nuevaPagina;
      return;
    }

    // Mostrar confirmación para cambiar de vista (solo la vista cambia, la BD se mantiene)
    Swal.fire({
      title: '¿Cambiar de Framework?',
      text: `Actualmente tienes guardada el Framework "${savedMethodologyName}". 
  ¿Quieres ver la sección de "${this.paginaToMetodo[nuevaPagina]}"? 
  (No se modificará lo guardado, solo cambiará la vista.)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Si confirma, cambiamos la vista a la nueva página
        this.paginaSeleccionada = nuevaPagina;
      } else {
        // Si cancela, se mantiene la vista en la metodología guardada
        this.paginaSeleccionada = paginaActual;
      }
    });
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
        // Cierra el SweetAlert de carga
        Swal.close();
        // Muestra mensaje de éxito
        Swal.fire({
          icon: 'success',
          title: 'Estructura generada',
          text: 'La IA ha generado la estructura del Framework.',
          timer: 2500
        });
        this.metodologiaGuardada = false;
      },
      error: (error) => {
        console.error('Error generando la estructura de la Framework:', error);
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar la estructura. Inténtalo nuevamente.'
        });
      }
    });
  }


  // ---------------- PALABRAS CLAVES Y SINONIMOS ----------------

  async loadComponentsForSelect() {
    const metodologyrevision = await this.authService.getMetodologiaByRevisionId(this.reviewId);

    if (metodologyrevision?.nombre) {
      this.relatedOptions = await this.authService.getComponentsByMethodologyName(metodologyrevision.nombre);
    } else {
      this.relatedOptions = [];
    }
  }

  removeSynonym(row: KeywordRow, index: number): void {
    // Elimina el sinónimo en la posición "index"
    row.synonyms.splice(index, 1);
  }

  async saveSynonymAndKeyword(row: KeywordRow) {
    try {
      // Asegúrate de que row.synonyms esté definido
      if (!row.synonyms) {
        row.synonyms = [];
      }

      // Unir los sinónimos en una cadena separada por comas (descartando vacíos)
      const sinonimoToInsert = row.synonyms
        .filter(s => s.trim() !== '')
        .join(', ');

      const palabraClaveToInsert = row.keyword;
      const fechaIngreso = new Date().toISOString();

      // Obtener el id del componente desde row.related
      const componenteId = row.related?.id;
      if (!componenteId) {
        throw new Error('No se ha seleccionado ningún componente.');
      }

      // Llamar al servicio para registrar la palabra clave y el sinónimo
      const { data, error } = await this.authService.registerSynonymThenKeyword(
        sinonimoToInsert,
        palabraClaveToInsert,
        this.reviewId,
        componenteId.toString(),
        fechaIngreso
      );

      if (error) {
        console.error('Error al registrar sinónimo y palabra clave:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo registrar el sinónimo y la palabra clave.'
        });
        return;
      }

      // Actualiza la fila con los datos retornados por el servicio
      if (data && data.keyword) {
        // Si es un registro nuevo, se asigna el id_palabras_clave retornado
        if (!row.id_palabras_clave && data.keyword.id_palabras_clave) {
          row.id_palabras_clave = data.keyword.id_palabras_clave;
        }
      }
      // Si el servicio retorna también datos del sinónimo, actualízalo si existe
      if (data && data.synonym && data.synonym.id_sinonimos) {
        row.id_sinonimos = data.synonym.id_sinonimos;
      }

      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'Se registró la palabra clave y el sinónimo satisfactoriamente.',
        timer: 2500,
        showConfirmButton: false
      });

      await this.refreshKeywordsTable();

      // Salir del modo edición para que se muestre el botón "Editar"
      row.isEditing = false;
      // Se actualiza la fila en tableData automáticamente (ya que row es una referencia)
      this.keywordsUpdated = true;
    } catch (err) {
      console.error('Error inesperado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al registrar el sinónimo y la palabra clave.'
      });
    }
  }

  async refreshKeywordsTable() {
    try {
      // 1. Obtén los registros guardados del servidor
      const data = await this.authService.getKeywordsAndSynonymsAdvanced(this.reviewId);
      const savedRows = data.map((item: any) => {
        let synonymsArray: string[] = [];
        let id_sinonimo: number | null = null;

        if (item.sinonimos && Array.isArray(item.sinonimos) && item.sinonimos.length > 0) {
          const sinonimoStr = item.sinonimos[0].sinonimo;
          id_sinonimo = item.sinonimos[0].id_sinonimos;
          if (typeof sinonimoStr === 'string') {
            synonymsArray = sinonimoStr
              .split(',')
              .map(s => s.trim())
              .filter(s => s !== '');
          }
        }

        let relatedOption: { id: number | null; nombre: string } = { id: null, nombre: 'Elije un componente' };
        if (
          item.componente_revision &&
          item.componente_revision.componente &&
          item.componente_revision.componente.id_componente
        ) {
          relatedOption = {
            id: item.componente_revision.componente.id_componente,
            nombre: item.componente_revision.componente.nombre
          };
        }

        return {
          id_palabras_clave: item.id_palabras_clave,
          keyword: item.palabra_clave,
          related: relatedOption,
          synonyms: synonymsArray,
          id_sinonimos: id_sinonimo,
          isEditing: false  // ya guardado
        } as KeywordRow;
      });

      // 2. Extrae los registros locales que aún no se han guardado (por ejemplo, inputs en edición)
      const unsavedRows = this.tableData.filter(row => !row.id_palabras_clave);

      // 3. Combina los registros guardados con los locales
      const combined = [...savedRows, ...unsavedRows];

      // 4. Normalización y ordenamiento según tu lógica
      const normalizeName = (name: string): string => {
        return name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
      };

      // Define el orden deseado (las claves deben coincidir con los nombres normalizados)
      const orderMapping: { [key: string]: number } = {
        'setting': 1,
        'perspective': 2,
        'poblacion': 3,
        'intervencion': 4,
        'comparacion': 5,
        'resultado': 6,
        'contexto': 7,
        'tipo de pregunta': 8,
        'tipo de estudio': 9,
        'intervención': 10,
        'comparison': 11,
        'evaluation': 12,
      };

      combined.sort((a, b) => {
        const aName = a.related && a.related.nombre ? normalizeName(a.related.nombre) : '';
        const bName = b.related && b.related.nombre ? normalizeName(b.related.nombre) : '';
        const aOrder = orderMapping[aName] || Number.MAX_SAFE_INTEGER;
        const bOrder = orderMapping[bName] || Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });

      // 5. Asigna el arreglo combinado ordenado a tu variable de tabla
      this.tableData = combined;
      this.keywordsUpdated = this.tableData.length > 0;
    } catch (err) {
      console.error('Error al refrescar la tabla de palabras clave:', err);
    }
  }

  async loadKeywordsAndSynonyms() {
    try {
      const data = await this.authService.getKeywordsAndSynonymsAdvanced(this.reviewId);

      const mappedData = data.map((item: any) => {
        let synonymsArray: string[] = [];
        let id_sinonimo: number | null = null;

        if (item.sinonimos && Array.isArray(item.sinonimos) && item.sinonimos.length > 0) {
          const sinonimoStr = item.sinonimos[0].sinonimo;
          id_sinonimo = item.sinonimos[0].id_sinonimos;
          if (typeof sinonimoStr === 'string') {
            synonymsArray = sinonimoStr
              .split(',')
              .map(s => s.trim())
              .filter(s => s !== '');
          }
        }

        let relatedOption: { id: number | null; nombre: string } = { id: null, nombre: 'Elije un componente' };
        if (
          item.componente_revision &&
          item.componente_revision.componente &&
          item.componente_revision.componente.id_componente
        ) {
          relatedOption = {
            id: item.componente_revision.componente.id_componente,
            nombre: item.componente_revision.componente.nombre
          };
        }

        return {
          id_palabras_clave: item.id_palabras_clave,
          keyword: item.palabra_clave,
          related: relatedOption,
          synonyms: synonymsArray,
          id_sinonimos: id_sinonimo,
          isEditing: false
        } as KeywordRow;
      });

      // Función para normalizar el nombre (quita acentos y pasa a minúsculas)
      const normalizeName = (name: string): string => {
        return name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
      };

      // Define el orden deseado (las claves deben coincidir con los nombres normalizados)
      const orderMapping: { [key: string]: number } = {
        'setting': 1,
        'perspective': 2,
        'poblacion': 3,
        'intervencion': 4,
        'comparacion': 5,
        'resultado': 6,
        'contexto': 7,
        'tipo de pregunta': 8,
        'tipo de estudio': 9,
        'intervención': 10,
        'comparison': 11,
        'evaluation': 12,
      };

      // Ordenamos el arreglo usando la prioridad definida
      mappedData.sort((a, b) => {
        const aName = a.related && a.related.nombre ? normalizeName(a.related.nombre) : '';
        const bName = b.related && b.related.nombre ? normalizeName(b.related.nombre) : '';
        const aOrder = orderMapping[aName] || Number.MAX_SAFE_INTEGER;
        const bOrder = orderMapping[bName] || Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder;
      });

      this.tableData = mappedData;
      this.keywordsUpdated = this.tableData.length > 0;
    } catch (err) {
      console.error('Error al cargar las palabras clave:', err);
    }
  }

  editRow(index: number) {
    const row = this.tableData[index];
    row.isEditing = true; // Activa el modo edición
    this.keywordsUpdated = false;
  }

  addRow() {
    this.tableData.push({
      id_palabras_clave: null,
      keyword: '',
      related: '',
      synonyms: [], // Arreglo vacío para sinónimos
      id_sinonimos: null,
      isEditing: true
    });
    this.keywordsUpdated = false;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  addSynonym(row: KeywordRow) {
    // Verifica que synonyms sea un arreglo y agrega un string vacío
    if (!row.synonyms || !Array.isArray(row.synonyms)) {
      row.synonyms = [];
    }
    row.synonyms.push(''); // Agrega un nuevo sinónimo vacío, lo que generará un nuevo input
    this.keywordsUpdated = false;
  }

  preventSpecialChars(event: KeyboardEvent): void {
    // Definimos una expresión regular que permita solo letras y números.
    // La expresión /^[A-Za-z0-9]$/ verifica que la tecla sea una letra (mayúscula o minúscula) o un dígito.
    const allowedRegex = /^[A-Za-z0-9 ]$/;

    // Permitir teclas de control (backspace, arrow keys, etc.)
    if (event.key.length > 1) {
      return;
    }

    if (!allowedRegex.test(event.key)) {
      event.preventDefault();
    }
  }

  compareFn(o1: any, o2: any): boolean {
    return o1 && o2 ? o1.id === o2.id : o1 === o2;
  }

  onRelatedChange(selectedOption: any) {
    // selectedOption es el objeto completo, con id y nombre
    this.idmetodologiaSeleccionada = selectedOption.id;
    this.metodologiaNombreSeleccionada = selectedOption.nombre; // Si necesitas guardar el nombre
  }

  async updateSynonymAndKeyword(row: KeywordRow) {
    try {
      // Unir los sinónimos en una cadena separada por comas (descartando vacíos)
      const sinonimoToUpdate = row.synonyms
        .filter(s => s.trim() !== '')
        .join(', ');
      const palabraClaveToUpdate = row.keyword;
      const fechaIngreso = new Date().toISOString();

      // Usar el id del componente del objeto row.related
      const componenteId = row.related?.id;
      if (!componenteId) {
        Swal.fire({
          icon: 'error',
          title: 'Componente no seleccionado',
          text: 'Por favor, selecciona un componente antes de actualizar.'
        });
        return;
      }

      // Llamar al servicio para actualizar la palabra clave y el sinónimo,
      // enviando row.id_sinonimos como segundo parámetro.
      const { data, error } = await this.authService.updateSynonymThenKeyword(
        row.id_palabras_clave!,        // id de la palabra clave a actualizar
        row.id_sinonimos!,              // id_sinonimos para filtrar en la tabla sinonimos
        sinonimoToUpdate,              // sinónimos concatenados
        palabraClaveToUpdate,          // palabra clave
        this.reviewId,                 // id_detalles_revision
        componenteId.toString(),       // id_componente (tomado de row.related.id)
        fechaIngreso                   // fecha de ingreso
      );

      if (error) {
        console.error('Error al actualizar sinónimo y palabra clave:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar el sinónimo y la palabra clave.'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: '¡Actualizado!',
        text: 'Se actualizó la palabra clave y el sinónimo satisfactoriamente.',
        timer: 2500,
        showConfirmButton: false
      });

      // Salir del modo edición para que se muestre el botón "Editar"
      row.isEditing = false;
      this.keywordsUpdated = true;
    } catch (err) {
      console.error('Error inesperado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al actualizar el sinónimo y la palabra clave.'
      });
    }
  }

  async deleteRow(index: number) {
    try {
      const row = this.tableData[index];
      let confirmText = "";

      // Si no tiene id_palabras_clave, se asume que es un registro local.
      if (!row.id_palabras_clave) {
        confirmText = "¿Desea eliminar la palabra clave de forma local?";
      } else {
        confirmText = "Esta acción eliminará la palabra clave y sus sinónimos de forma permanente.";
      }

      // Mostrar confirmación
      const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: confirmText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        // Si es registro local (sin id), se elimina solo del array
        if (!row.id_palabras_clave) {
          this.tableData.splice(index, 1);
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'La palabra clave se eliminó localmente.',
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          // Llamar al servicio para eliminar la palabra clave y sus sinónimos (según la relación definida)
          const { data, error } = await this.authService.deleteKeyword(row.id_palabras_clave!, row.id_sinonimos!);
          if (error) {
            console.error('Error al eliminar la palabra clave:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar la palabra clave.'
            });
            return;
          }
          // Remover la fila del array
          this.tableData.splice(index, 1);
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'La palabra clave y sus sinónimos se eliminaron correctamente.',
            timer: 2000,
            showConfirmButton: false
          });
          this.keywordsUpdated = false;
        }
      }
    } catch (err) {
      console.error('Error inesperado al eliminar:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al eliminar la palabra clave.'
      });
    }
  }

  generateKeywords(): void {
    // Construir el objeto methodologyData según la metodología cargada
    let methodologyData: any = {};
    this.keywordsUpdated = false;
    const methodology = this.paginaSeleccionada ? this.paginaSeleccionada.toUpperCase() : '';

    if (methodology === 'PICO') {
      methodologyData = {
        methodology,
        P: this.picoP,
        I: this.picoI,
        C: this.picoC,
        O: this.picoO
      };
    } else if (methodology === 'PICOC') {
      methodologyData = {
        methodology,
        P: this.picocP,
        I: this.picocI,
        C: this.picocC,
        O: this.picocO,
        CONTEXT: this.picocContext
      };
    } else if (methodology === 'PICOTT') {
      methodologyData = {
        methodology,
        P: this.picottP,
        I: this.picottI,
        C: this.picottC,
        O: this.picottO,
        TIPO1: this.picottT,
        TIPO2: this.picottT2
      };
    } else if (methodology === 'SPICE') {
      methodologyData = {
        methodology,
        S: this.spiceS,
        P: this.spiceP,
        I: this.spiceI,
        C: this.spiceC,
        E: this.spiceE
      };
    } else {
      // En caso de que la metodología no sea una de las anteriores
      methodologyData = { methodology };
    }

    // Mostrar mensaje de carga con SweetAlert2
    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Llamada al servicio que genera las palabras clave
    this.openAiService.generateKeywords(methodologyData).subscribe(
      (response) => {

        if (response && response.keywords) {
          // Mapea cada elemento de la respuesta para generar una nueva fila
          const newRows: KeywordRow[] = response.keywords.map((item: any) => {
            // Procesar sinónimos: si viene como string, separar por coma
            let synonymsArray: string[] = [];
            if (typeof item.sinonimos === 'string') {
              synonymsArray = item.sinonimos
                .split(',')
                .map((s: string) => s.trim())
                .filter((s: string) => s !== '');
            } else if (Array.isArray(item.sinonimos)) {
              synonymsArray = item.sinonimos
                .map((s: string) => s.trim())
                .filter((s: string) => s !== '');
            }

            // Para el campo "related" se asigna un objeto por defecto basado en item.seccion_metodologia.
            // En este ejemplo, no se tiene id, por lo que se asigna null y el nombre se toma del item.
            const relatedOption = { id: item.siglas, nombre: item.metodologia || 'Elije un componente' };

            return {
              id_palabras_clave: null,  // Registro nuevo, por lo que aún no tiene ID asignado
              keyword: item.palabra_clave,
              related: relatedOption,
              synonyms: synonymsArray,
              id_sinonimos: null,       // Registro nuevo, sin id_sinonimos
              isEditing: true           // Se marca en modo edición para permitir guardar posteriormente
            } as KeywordRow;
          });

          // Si ya existen registros, se agregan los nuevos al final
          this.tableData = [...this.tableData, ...newRows];
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

  // ---------------- BASE BIBLIOGRAFICAS ----------------

  async loadBases() {
    this.bases = await this.authService.loadBasesBibliograficas(this.reviewId);
    this.basesGuardadas = (this.bases.length > 0);
  }

  async showSuggestions() {
    // Filtrar las sugerencias para eliminar aquellas cuyo nombre ya existe en this.bases
    const availableSuggestions = this.suggestions.filter(sug => {
      return !this.bases.some((base: any) => base.nombre === sug.nombre);
    });

    // Construir un objeto para el "inputOptions" de SweetAlert a partir de availableSuggestions
    const inputOptions = availableSuggestions.reduce((obj, sug, idx) => {
      obj[idx] = `${sug.nombre} - ${sug.url}`;
      return obj;
    }, {} as { [key: string]: string });

    const { value: idxSeleccionado } = await Swal.fire({
      title: 'Sugerencias de Bases Bibliográficas',
      input: 'select',
      inputOptions: inputOptions,
      inputPlaceholder: 'Selecciona una base',
      showCancelButton: true,
      confirmButtonText: 'Autorrellenar'
    });

    if (idxSeleccionado !== undefined && idxSeleccionado !== null) {
      const index = Number(idxSeleccionado);
      this.autofillNewBase(availableSuggestions[index].nombre, availableSuggestions[index].url);
    }
  }

  autofillNewBase(nombre: string, url: string): void {
    // Agregar una nueva base
    this.bases.push({
      id_base_bibliografica: 0, // Replace null with a default number value
      id_revision: this.reviewId, // Asumiendo que lo tienes
      nombre: nombre,
      url: url,
      isEditing: true
    });
    this.basesGuardadas = false;
  }

  addBase(): void {
    this.bases.push({
      id_base_bibliografica: 0,
      id_revision: this.reviewId,
      nombre: '',
      url: '',
      isEditing: true
    });

    this.basesGuardadas = false;
  }

  async saveBase(index: number) {
    const base = this.bases[index];
    // Validación básica
    if (!base.nombre.trim() || !base.url.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debes ingresar el nombre y la URL.'
      });
      return;
    }

    // Nuevo registro
    if (!base.id_base_bibliografica) {
      const result = await this.authService.createBaseBibliografica(base);
      if (result) {
        this.bases[index] = { ...result, isEditing: false };
        Swal.fire({
          icon: 'success',
          title: 'Base creada',
          text: 'Se ha guardado correctamente.'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al crear',
          text: 'No se pudo crear la base bibliográfica en la BD.'
        });
      }
    } else {
      // Actualizar registro existente
      const updated = await this.authService.updateBaseBibliografica(base);
      if (updated) {
        this.bases[index] = { ...updated, isEditing: false };
        Swal.fire({
          icon: 'success',
          title: 'Base actualizada',
          text: 'Los cambios se guardaron correctamente.'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: 'No se pudo actualizar la base.'
        });
      }
    }
    this.basesGuardadas = (this.bases.length > 0);
  }

  cancelEdit1(index: number): void {
    const base = this.bases[index];
    // Si es nueva y está vacía, la quitamos de la lista
    if (!base.id_base_bibliografica && !base.nombre.trim() && !base.url.trim()) {
      this.bases.splice(index, 1);
    } else {
      // Simplemente salir del modo edición
      base.isEditing = false;
      // Si deseas descartar cambios en un campo existente, podrías recargar con loadBases()
      // this.loadBases();
    }
    this.basesGuardadas = (this.bases.length > 0);
  }

  editBase(index: number): void {
    this.bases[index].isEditing = true;
  }

  async removeBase(index: number): Promise<void> {
    const base = this.bases[index];

    // Si no tiene ID, solo está local y no se guardó en BD
    if (!base.id_base_bibliografica) {
      this.bases.splice(index, 1);
      this.basesGuardadas = (this.bases.length > 0);
      return;
    }

    // Confirmar con SweetAlert2
    const confirmResult = await Swal.fire({
      title: '¿Eliminar base?',
      text: `Estás a punto de eliminar la base "${base.nombre}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    // Eliminar la base bibliográfica
    const baseDeleteSuccess = await this.authService.deleteBaseBibliografica(base.id_base_bibliografica);
    if (baseDeleteSuccess) {
      // Eliminar también la cadena de búsqueda asociada a esta base usando el nombre como fuente
      const cadenaDeleteSuccess = await this.authService.deleteCadenaBusqueda(this.reviewId, base.nombre);
      if (!cadenaDeleteSuccess) {
        Swal.fire({
          icon: 'warning',
          title: 'Advertencia',
          text: 'La base fue eliminada, pero no se pudo eliminar la cadena de búsqueda asociada.',
        });
      }
      this.bases.splice(index, 1);
      Swal.fire({
        icon: 'success',
        title: 'Base eliminada',
        text: 'La base ha sido eliminada correctamente.',
      });
      this.basesGuardadas = (this.bases.length > 0);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: 'No se pudo eliminar la base bibliográfica.',
      });
    }
  }


  // ---------------- CADENA DE BUSQUEDA ----------------

  clearCadena() {
    this.cadenaBusqueda = '';
    this.cadenaGuardada = false;
  }

  // Para la cadena global
  clearGlobalCadena() {
    this.globalCadena = '';
    this.globalCadenaGuardada = false;
  }

  // Para las cadenas de cada base
  clearCadenaForBase(base: BaseBibliografica) {
    base.cadenaBusqueda = '';
    base.cadenaGuardada = false;
  }


  async saveCadenaForBase(base: BaseBibliografica) {
    if (!base.cadenaBusqueda || !base.cadenaBusqueda.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cadena vacía',
        text: 'Por favor, ingresa una cadena de búsqueda antes de guardar.',
      });
      return;
    }
    try {
      // Aquí usamos el nombre de la base como fuente
      const fuente = base.nombre;
      const { data, error } = await this.authService.upsertCadenaBusqueda(base.cadenaBusqueda, this.reviewId, fuente);
      if (error) {
        console.error('Error al guardar la cadena para la base', fuente, error);
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
        timer: 1500,
        showConfirmButton: false
      });
      base.cadenaGuardada = true; // Se oculta el botón de guardar para este bloque
    } catch (err) {
      console.error('Error inesperado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al guardar la cadena de búsqueda.',
      });
    }
  }

  copyCadenaForBase(base: BaseBibliografica): void {
    const textToCopy = base.cadenaBusqueda || '';
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        base.isCadenaCopied = true;
        setTimeout(() => {
          base.isCadenaCopied = false;
        }, 2000);
      })
      .catch(err => {
        console.error('Error al copiar la cadena de búsqueda', err);
      });
  }

  onCadenaEdit() {
    this.cadenaGuardada = false;
  }

  async loadGlobalCadena() {
    try {

      const { data, error } = await this.authService.getCadenaBusqueda(this.reviewId, 'global');
      if (error) {
        console.error('Error al cargar la cadena global:', error);
        this.globalCadena = '';
        this.globalCadenaGuardada = false;
      } else if (data) {
        this.globalCadena = data.cadena_busqueda;
        this.globalCadenaGuardada = true;
      } else {
        this.globalCadena = '';
        this.globalCadenaGuardada = false;
      }

    } catch (err) {
      console.error('Error inesperado al cargar la cadena global:', err);
    }
  }

  async saveGlobalCadena() {
    if (!this.globalCadena.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Cadena vacía',
        text: 'Por favor, ingresa una cadena de búsqueda global antes de guardar.',
      });
      return;
    }
    try {
      const { data, error } = await this.authService.upsertCadenaBusqueda(this.globalCadena, this.reviewId, 'global');
      if (error) {
        console.error('Error al guardar la cadena global:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: error.message || 'No se pudo guardar la cadena global.',
        });
        return;
      }
      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'La cadena global se ha guardado correctamente.',
        timer: 1500,
        showConfirmButton: false
      });
      this.globalCadenaGuardada = true; // Se oculta el botón de guardar
    } catch (err) {
      console.error('Error inesperado al guardar la cadena global:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al guardar la cadena global.',
      });
    }
  }

  copyGlobalCadena(): void {
    const textToCopy = this.globalCadena || '';
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        this.isGlobalCadenaCopied = true;
        setTimeout(() => {
          this.isGlobalCadenaCopied = false;
        }, 2000);
      })
      .catch(err => {
        console.error('Error al copiar la cadena global', err);
      });
  }

  async generateSearchString() {
    try {
      // 1. Preguntar el idioma preferido
      const { value: idioma } = await Swal.fire({
        title: 'Ingresa el idioma',
        input: 'text',
        inputPlaceholder: 'Ej: Español, Inglés, etc.',
        showCancelButton: true,
        confirmButtonText: 'Continuar'
      });
      if (idioma === undefined || idioma === null) {
        return; // Usuario canceló
      }

      // 2. Mostrar alerta de carga
      Swal.fire({
        title: 'Generando cadena...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // 3. Transformar las keywords a enviar
      const transformedKeywords = this.tableData.map(item => {
        const metodologiaLimpia = item.related && item.related.nombre
          ? item.related.nombre.replace(/\s*\(.*?\)/, "").trim()
          : '';
        return {
          palabra_clave: item.keyword,
          metodologia: metodologiaLimpia,
          sinonimos: Array.isArray(item.synonyms) ? item.synonyms.map(s => s.trim()) : []
        };
      });

      // 4. Construir el payload sólo con keywords y idioma
      const searchPayload = {
        keywords: transformedKeywords,
        idioma: idioma
      };
      // 5. Llamar al servicio de OpenAI para generar la cadena de búsqueda
      this.openAiService.getSearchString(searchPayload).subscribe(

        (response) => {
          if (response && response.searchString) {
            // Actualizamos el input global (variable globalCadena)
            this.globalCadena = response.searchString;
          } else {
            this.globalCadena = '';
            console.warn('La respuesta de la API no contiene "searchString".');
          }
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: 'Cadena Generada',
            text: 'Se ha generado la cadena de búsqueda.',
            timer: 1500
          });
          // Si deseas, puedes indicar que aún no está guardada
          this.globalCadenaGuardada = false;
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
    } catch (err) {
      console.error('Error inesperado en generateSearchString:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al generar la cadena de búsqueda.'
      });
    }
  }

  async loadBasesCadenas() {
    try {
      for (let base of this.bases) {
        // Usamos el nombre de la base como fuente
        const fuente = base.nombre;
        const { data, error } = await this.authService.getCadenaBusqueda(this.reviewId, fuente);

        // Si data existe y hay una cadena_busqueda no vacía,
        // entonces asignamos base.cadenaGuardada = true
        if (data && data.cadena_busqueda) {
          base.cadenaBusqueda = data.cadena_busqueda;
          base.cadenaGuardada = true;  // Ya hay algo guardado, ocultamos el botón
        } else {
          // No hay cadena de búsqueda en la BD o no hay data
          base.cadenaBusqueda = '';
          base.cadenaGuardada = false; // Mostramos el botón de guardar
        }

        base.isCadenaCopied = false;
      }

      // Reasigna el array para forzar la detección de cambios en Angular
      this.bases = [...this.bases];
    } catch (err) {
      console.error('Error al cargar las cadenas de búsqueda para las bases:', err);
    }
  }


  // Getter que verifica si la cadena global y las cadenas de todas las bases están completas
  get allCadenasComplete(): boolean {
    // Se considera completa si el input global tiene contenido
    if (!this.globalCadena || !this.globalCadena.trim()) {
      return false;
    }
    // Y para cada base, su cadena debe tener contenido
    for (const base of this.bases) {
      if (!base.cadenaBusqueda || !base.cadenaBusqueda.trim()) {
        return false;
      }
    }
    return true;
  }

  // ---------------- CRITERIOS DE EXCLUSION Y INCLUSION ----------------

  guardarCriterios() {
    this.criteriosGuardados = true;
  }

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

    // Si la carga es exitosa, puedes activar el icono de check.
    // Por ejemplo, si se han cargado al menos un criterio de inclusión o exclusión.
    if (this.exclusions.length > 0 || this.inclusions.length > 0) {
      this.criteriosGuardados = true;
    }
  }

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
    this.criteriosGuardados = true;
    this.exclusionValue = '';
  }

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

    this.criteriosGuardados = true;
    this.inclusionValue = '';
  }

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
    this.criteriosGuardados = false;
    this.exclusions.splice(index, 1);
  }

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

    this.criteriosGuardados = false;
    this.inclusions.splice(index, 1);
  }

  editExclusion(index: number) {
    this.criteriosGuardados = false;
    this.exclusions[index].isEditing = true;
  }

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

        this.criteriosGuardados = true;
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
      this.criteriosGuardados = true;
    }

    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: 'El criterio se ha agregado a la base de datos.',
      timer: 1500
    });
  }

  editInclusion(index: number) {
    this.criteriosGuardados = false;
    this.inclusions[index].isEditing = true;
  }

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

        this.criteriosGuardados = true;
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

      this.criteriosGuardados = true;
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
        this.criteriosGuardados = false;
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

  // ---------------- SEGUNDA PAGINA ----------------

  // ---------------- PREGUNTAS ----------------
  async loadQuestions1() {
    const { data, error } = await this.authService.getPreguntasByRevision(this.reviewId);
    if (error) {
      console.error('Error al cargar preguntas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las preguntas.'
      });
      this.qualityQuestionsSaved = false;
    } else {
      this.questions1 = data || [];
      // Si se cargaron preguntas, activamos el check
      this.qualityQuestionsSaved = this.questions1.length > 0;
    }
  }

  addQuestion1(): void {
    // Agrega una nueva pregunta en modo edición (sin id aún)
    const nuevaPregunta = { descripcion: '', isEditing: true };
    this.questions1.push(nuevaPregunta);
    // Opcional: Si la lista ya tenía elementos guardados, puedes actualizar la bandera
    this.qualityQuestionsSaved = this.questions1.some(q => q.id_pregunta);
  }

  editQuestion1(index: number): void {
    this.questions1[index].isEditing = true;
  }

  async saveQuestion1(index: number): Promise<void> {
    const question = this.questions1[index];

    if (!question.descripcion || !question.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Pregunta vacía',
        text: 'La pregunta no puede estar vacía.'
      });
      return;
    }

    // Si ya tiene id, es una actualización
    if (question.id_pregunta) {
      const { error } = await this.authService.updatePregunta(question.id_pregunta, question.descripcion);
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar la pregunta.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Pregunta actualizada',
          text: 'La pregunta se actualizó correctamente.'
        });
        question.isEditing = false;
      }
    } else {
      // Si no tiene id, se inserta una nueva pregunta
      const { data, error } = await this.authService.insertPregunta(question.descripcion, this.reviewId);
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
        // Asigna el id de la pregunta devuelto por el backend
        if (data && data.length > 0) {
          question.id_pregunta = data[0].id_pregunta;
        }
        question.isEditing = false;
      }
    }
    // Actualiza la bandera si hay al menos una pregunta guardada
    this.qualityQuestionsSaved = this.questions1.some(q => q.id_pregunta);
  }

  async deleteQuestion1(index: number): Promise<void> {
    const current = this.questions1[index];

    // Si la pregunta no tiene id, significa que aún es local (no guardada en la BD)
    if (!current.id_pregunta) {
      const result = await Swal.fire({
        title: '¿Eliminar pregunta?',
        text: 'Esta pregunta aún no se ha guardado. ¿Desea eliminarla?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (result.isConfirmed) {
        this.questions1.splice(index, 1);
        Swal.fire({
          icon: 'success',
          title: 'Pregunta eliminada',
          text: 'La pregunta local se eliminó correctamente.'
        });
      }
      return;
    }

    // Si la pregunta ya está guardada en la BD (tiene id)
    const result = await Swal.fire({
      title: '¿Eliminar pregunta?',
      text: 'Esta pregunta ya está guardada en la base de datos. ¿Desea eliminarla?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) {
      return;
    }

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


  generateQualityQuestions(): void {
    if (!this.titulo_revision || !this.objetivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos faltantes',
        text: 'Por favor, ingresa el título y el objetivo del estudio.'
      });
      return;
    }

    Swal.fire({
      title: 'Generando preguntas con IA...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    this.openAiService.getQualityQuestions(this.titulo_revision, this.objetivo).subscribe(
      (response) => {
        Swal.close();
        if (response && Array.isArray(response.quality_questions)) {
          response.quality_questions.forEach((q: string) => {
            this.questions1.push({
              descripcion: q,
              isEditing: true
            });
          });
          Swal.fire({
            icon: 'success',
            title: 'Preguntas generadas',
            text: 'Las preguntas se han agregado correctamente.',
            timer: 1500
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Sin resultados',
            text: 'No se generaron preguntas válidas.'
          });
        }
        this.qualityQuestionsSaved = this.questions1.some(q => q.id_pregunta);
      },
      (error) => {
        Swal.close();
        console.error('Error al generar preguntas de calidad:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron generar las preguntas con IA.'
        });
      }
    );
  }

  // ---------------- RESPUESTAS ----------------

  async loadAnswers1() {
    const { data, error } = await this.authService.getRespuestasByRevision(this.reviewId);
    if (error) {
      console.error('Error al cargar respuestas:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las respuestas.'
      });
      this.respuestasGuardadas = false;
    } else {
      this.answers1 = data || [];
      this.respuestasGuardadas = this.answers1.length > 0;
    }
  }

  addLocalAnswer() {
    this.answers1.push({
      descripcion: '',
      peso: 0,
      isEditing: true,
      id_respuesta: 0//queda undefined => indica que aún no está guardado en la BD
    });
    this.respuestasGuardadas = false;
    this.puntuacionesGuardadas = false;
  }

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

      this.respuestasGuardadas = true;

      // data[0] => registro recién insertado (Supabase)
      if (data && data.length > 0) {
        this.answers1[index] = {
          ...data[0],
          isEditing: false
        };
      } else {
        // Si no se devolvieron datos, al menos quita modo edición
        this.answers1[index].isEditing = false;

        this.respuestasGuardadas = true;
      }
    }
  }

  editAnswer1(index: number) {
    this.answers1[index].isEditing = true;
    this.respuestasGuardadas = false;
  }

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
      this.respuestasGuardadas = true;
      this.puntuacionesGuardadas = false;
    }
  }

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
      this.respuestasGuardadas = true;
      this.puntuacionesGuardadas = false;
    }
  }

  // ---------------- PUNTUACIONES ----------------

  async loadPuntuacion() {
    try {
      const data = await this.authService.getScoreByRevision(this.reviewId);
      if (data && data.length > 0) {
        const row = data[0];
        // Cargo el valor que venga de la BD
        this.limitScore1 = row.puntuacion_limite;
  
        // Ya existe en BD => marco como guardada
        this.puntuacionesGuardadas = true;
      } else {
        this.puntuacionesGuardadas = false;
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
  

  async saveLimitScore() {
    try {
      const maxScore = this.getMaxScore(); // calculado a partir de tus questions1 / answers1
      const { data, error } = await this.authService.saveLimitScore(this.reviewId, this.limitScore1, maxScore);
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
        this.puntuacionesGuardadas = true;
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

  getMaxScore(): number {
    if (!this.answers1 || this.answers1.length === 0 || !this.questions1) {
      return 0;
    }
    // Encontrar el peso mayor entre las respuestas
    let maxWeight = 0;
    for (const ans of this.answers1) {
      const pesoNum = Number(ans.peso) || 0;
      if (pesoNum > maxWeight) {
        maxWeight = pesoNum;
      }
    }

    // Multiplicar por la cantidad de preguntas
    return maxWeight * this.questions1.length;
  }

  onLimitScoreChange(newValue: number): void {
    this.limitScore1 = newValue;
    this.puntuacionesGuardadas = false;
  }

  // ---------------- TERCERA PAGINA ----------------

  // ---------------- EXTRACCION DE DATOS ----------------

  addField(): void {
    this.fields.push({
      id_extraction_field: undefined,   // O undefined si aún no existe en la BD
      id_revision: this.reviewId, // Ajusta según tu lógica para obtener el ID de la revisión
      descripcion: '',
      tipo: 'Booleano',         // Valor por defecto, ajusta según tu preferencia
      orden: this.fields.length, // Ejemplo: lo situamos al final
      isEditing: true
    });
    this.fieldsSaved = false;
  }

  moveUp(index: number): void {
    if (index > 0) {
      // Intercambia el campo actual con el anterior
      [this.fields[index - 1], this.fields[index]] = [this.fields[index], this.fields[index - 1]];

      // Actualiza el orden de los elementos en el array
      this.fields.forEach((field, i) => {
        field.orden = i;
      });

      // Guarda en la base de datos
      this.saveOrderToDB();
    }
  }

  moveDown(index: number): void {
    if (index < this.fields.length - 1) {
      // Intercambia el campo actual con el siguiente
      [this.fields[index], this.fields[index + 1]] = [this.fields[index + 1], this.fields[index]];

      // Actualiza el orden de los elementos en el array
      this.fields.forEach((field, i) => {
        field.orden = i;
      });

      // Guarda en la base de datos
      this.saveOrderToDB();
    }
  }

  async saveOrderToDB(): Promise<void> {
    try {
      for (let i = 0; i < this.fields.length; i++) {
        const field = this.fields[i];
        field.orden = i; // Asignar el nuevo orden

        // Llamar al servicio que actualiza en la BD
        if (field.id_extraction_field !== undefined) {
          await this.authService.updateFieldOrder(field.id_extraction_field.toString(), i);
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Orden guardado',
        text: 'El orden de los campos se ha actualizado correctamente.',
        timer: 2000
      });
    } catch (err) {
      console.error('Error al actualizar el orden:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al actualizar el orden en la base de datos.'
      });
    }
  }

  async loadFields() {
    this.fields = await this.authService.loadExtractionFields(this.reviewId);
    this.fieldsSaved = this.fields && this.fields.length > 0;
  }

  async saveField(index: number) {
    const field = this.fields[index];
    // Validar descripción
    if (!field.descripcion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Descripción vacía',
        text: 'La descripción no puede estar vacía.'
      });
      return;
    }

    // Si no tiene ID, es un nuevo registro
    if (!field.id_extraction_field) {
      const result = await this.authService.createExtractionField(field);
      if (result) {
        // Asignar datos devueltos por la BD (ej. id_extraction_field)
        this.fields[index] = { ...result, isEditing: false };
        this.fieldsSaved = true; // Marcamos que está guardado
        // Notificar éxito
        Swal.fire({
          icon: 'success',
          title: 'Campo creado',
          text: 'El campo se guardó correctamente.'
        });
      } else {
        // Error al crear
        Swal.fire({
          icon: 'error',
          title: 'Error al guardar',
          text: 'No se pudo crear el campo en la base de datos.'
        });
      }
    } else {
      // Actualizar registro existente
      const result = await this.authService.updateExtractionField(field);
      if (result) {
        this.fields[index] = { ...result, isEditing: false };
        Swal.fire({
          icon: 'success',
          title: 'Campo actualizado',
          text: 'Los cambios se guardaron correctamente.'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: 'No se pudo actualizar el campo.'
        });
      }
    }
  }

  cancelEdit(index: number) {
    const field = this.fields[index];
    // Si es nuevo y no tiene descripción, se elimina del arreglo
    if (!field.id_extraction_field && !field.descripcion.trim()) {
      this.fields.splice(index, 1);
    } else {
      // Revertir la edición
      field.isEditing = false;
      // Opcional: recargar la lista desde BD para descartar cambios no guardados
      //this.loadFields();
    }
  }

  editField(index: number) {
    this.fields[index].isEditing = true;
    this.fieldsSaved = false;
  }

  async removeField(index: number) {
    const field = this.fields[index];

    // Si no existe en la BD, solo se quita localmente
    if (!field.id_extraction_field) {
      this.fields.splice(index, 1);
      return;
    }

    // Si existe en la BD, mostrar confirmación con SweetAlert2
    const confirmResult = await Swal.fire({
      title: '¿Eliminar campo?',
      text: `Estás a punto de eliminar el campo "${field.descripcion}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    // El usuario confirmó la eliminación
    const success = await this.authService.deleteExtractionField(field.id_extraction_field);
    if (success) {
      this.fields.splice(index, 1);
      Swal.fire({
        icon: 'success',
        title: 'Campo eliminado',
        text: 'El campo ha sido eliminado de la base de datos.'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el campo.'
      });
    }
  }

  onGenerateQuestions(): void {
    // Validar título y objetivo
    if (!this.titulo_revision.trim() || !this.objetivo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Ingrese un título y objetivo del estudio.'
      });
      return;
    }

    // Pedir la cantidad de preguntas mediante SweetAlert
    Swal.fire({
      title: 'Número de preguntas',
      text: '¿Cuántas preguntas deseas generar?',
      icon: 'question',
      input: 'number',
      inputLabel: 'Cantidad de preguntas',
      inputPlaceholder: 'Ej: 5',
      showCancelButton: true,
      confirmButtonText: 'Generar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          return 'Por favor, ingresa un número válido mayor que 0.';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const numberOfQuestions = Number(result.value);

        // Mostrar alerta de carga mientras se llama al servicio
        Swal.fire({
          title: 'Generando preguntas...',
          text: 'Por favor, espera un momento.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading(Swal.getConfirmButton());
          }
        });

        // Llamar al servicio de IA
        this.openAiService.generateDataExtractionQuestions(
          this.titulo_revision,
          this.objetivo,
          numberOfQuestions
        ).subscribe({
          next: (response) => {
            Swal.close();
            if (response && response.questions) {
              // Mapea cada pregunta del array a un objeto DataField
              const newQuestions = response.questions.map((item: any, index: number) => ({
                id_extraction_field: undefined,  // no existe en la BD
                id_revision: this.reviewId,
                descripcion: item.pregunta,        // "pregunta" viene de la IA
                tipo: item.tipo,                   // "tipo" viene de la IA
                orden: this.fields.length + index, // Asigna el orden basado en el tamaño actual del array
                isEditing: true                    // Si deseas que aparezca en modo edición
              }));

              // Agrega estos nuevos campos al final del array de campos
              this.fields = [...this.fields, ...newQuestions];

              Swal.fire({
                icon: 'success',
                title: 'Preguntas generadas',
                text: `Se han agregado ${response.questions.length} nuevas preguntas.`,
                timer: 2000
              });
              this.fieldsSaved = true;
            } else {
              Swal.fire({
                icon: 'info',
                title: 'Sin preguntas',
                text: 'No se recibió un arreglo de preguntas en la respuesta.'
              });
            }
          },
          error: (err) => {
            Swal.close();
            console.error('Error al generar preguntas:', err);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo generar las preguntas.'
            });
          }
        });
      }
    });
  }

}

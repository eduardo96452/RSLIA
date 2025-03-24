import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, Informe } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { jsPDF } from "jspdf";
import { SupabaseService } from '../../conexion/supabase.service';
import SignaturePad from 'signature_pad';
import QRCode from 'qrcode';

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.css'
})
export class InformesComponent implements OnInit {
  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  isLargeScreen: boolean = true;
  objetivo = '';

  introductionText = 'Contenido de la Introducción...';
  introductionSaved: boolean = false;

  trabajosText = 'Contenido de Trabajos relacionados...';
  trabajosSaved: boolean = false;

  metodologiaText = 'Contenido de la Metodología...';
  metodologiaSaved: boolean = false;

  resultadosText = 'Contenido de los Resultados...';
  resultadosSaved: boolean = false;

  discusionText = 'Contenido de la Discusión...';
  discusionSaved: boolean = false;

  limitacionesText = 'Contenido de las Limitaciones...';
  limitacionesSaved: boolean = false;

  conclusionText = 'Contenido de la Conclusión...';
  conclusionSaved: boolean = false;

  referenciasText = 'Contenido de las Referencias...';
  referencesSaved: boolean = false;

  informesGenerados: Informe[] = [];
  modoFirma: 'manual' | 'qr' | null = null;
  firmaQr: any;
  nombreUsuario: string = '';
  cargoUsuario: string = '';
  qrImageUrl: any;

  @ViewChild('nombreInput') nombreInput!: ElementRef;
  @ViewChild('cargoInput') cargoInput!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService
  ) { }

  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.checkScreenSize();

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });

    await Promise.all([
      this.loadReviewData(),
      this.loadUserData(),
      this.loadIntroductionDraft(),
      this.loadTrabajosDraft(),
      this.loadMetodologiaDraft(),
      this.loadResultadosDraft(),
      this.loadDiscusionDraft(),
      this.loadLimitacionesDraft(),
      this.loadConclusionDraft(),
      this.loadReferenciasDraft(),
    ]);


    this.loadInformesGenerados();
  }


  @HostListener('window:resize', ['$event'])
  onResize1(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
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
      }
    } catch (error) {
      console.error('Error al cargar la reseña:', error);
    }
  }

  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }

  async loadIntroductionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar la introducción:', error);
      } else if (data) {
        this.introductionText = data.introduccion || '';
        // Si la introducción no está vacía, introductionSaved es true; de lo contrario, false.
        this.introductionSaved = this.introductionText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar la introducción:', err);
    }
  }
  
  async loadTrabajosDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar trabajos relacionados:', error);
      } else if (data) {
        this.trabajosText = data.trabajos_relacionados || '';
        this.trabajosSaved = this.trabajosText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar trabajos relacionados:', err);
    }
  }
  
  async loadMetodologiaDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar metodología:', error);
      } else if (data) {
        this.metodologiaText = data.metodologia || '';
        this.metodologiaSaved = this.metodologiaText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar metodología:', err);
    }
  }
  
  async loadResultadosDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar resultados:', error);
      } else if (data) {
        this.resultadosText = data.resultados || '';
        this.resultadosSaved = this.resultadosText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar resultados:', err);
    }
  }
  
  async loadDiscusionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar discusión:', error);
      } else if (data) {
        this.discusionText = data.discusion || '';
        this.discusionSaved = this.discusionText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar discusión:', err);
    }
  }
  
  async loadLimitacionesDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar limitaciones:', error);
      } else if (data) {
        this.limitacionesText = data.limitaciones || '';
        this.limitacionesSaved = this.limitacionesText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar limitaciones:', err);
    }
  }
  
  async loadConclusionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar conclusión:', error);
      } else if (data) {
        this.conclusionText = data.conclusion || '';
        this.conclusionSaved = this.conclusionText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar conclusión:', err);
    }
  }
  
  async loadReferenciasDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar referencias:', error);
      } else if (data) {
        this.referenciasText = data.referencias || '';
        this.referencesSaved = this.referenciasText.trim().length > 0;
      }
    } catch (err) {
      console.error('Excepción al cargar referencias:', err);
    }
  }
  


  generateIntroductionWithIA(): void {
    // Muestra el mensaje de carga
    this.introductionSaved = false;
    Swal.fire({
      title: 'Generando sugerencia...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Prepara el payload con los datos necesarios
    const payload = {
      title: this.reviewData.titulo_revision || '',
      description: this.reviewData.descripcion || '',
      objective: this.reviewData.objetivo || '',
      area_conocimiento: this.reviewData.area_conocimiento || '',
      tipo_investigacion: this.reviewData.tipo_investigacion || ''
    };

    console.log('Payload para generar la Introducción:', payload
    );

    this.openAiService.generateIntroduction(payload).subscribe({
      next: (res) => {
        // Cierra el popup de carga y muestra la notificación de éxito
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Sugerencia generada',
          text: 'La IA ha generado una sugerencia para la Introducción.',
          timer: 2500,
          showConfirmButton: false
        });
        // Actualiza el área editable con el texto generado
        this.introductionText = res.introduction.replace(/\n\n/g, '<br><br>');

      },
      error: (err) => {
        // Cierra el popup y muestra un error
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un error generando la sugerencia con IA. Por favor, inténtalo de nuevo.',
          timer: 2500,
          showConfirmButton: false
        });
        console.error('Error generando la Introducción con IA:', err);
      }
    });
  }

  async saveIntroductionDraft(): Promise<void> {
    try {
      // Muestra un SweetAlert de carga
      Swal.fire({
        title: 'Guardando introducción...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        introduccion: this.introductionText
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un error al guardar la introducción. Por favor, inténtalo de nuevo.',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Introducción guardado con éxito.',
          timer: 2500,
          showConfirmButton: false
        });
        this.introductionSaved = true;
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Introducción:', err);
    }
  }

  async generateTrabajosRelacionadosWithData(): Promise<void> {
    try {
      // 1. Obtener título y descripción desde reviewData
      const title = this.reviewData.titulo_revision || '';
      const description = this.reviewData.descripcion || '';

      // 2. Obtener las palabras clave avanzadas para la revisión
      // Se asume que getKeywordsAndSynonymsAdvanced devuelve un array de objetos con la propiedad 'palabra_clave'
      const keywordsData = await this.authService.getKeywordsAndSynonymsAdvanced(this.reviewId);
      // Extraemos las palabras clave de cada registro y las unimos en una cadena separada por comas
      const keywordsArr = (keywordsData || []).map(item => item.palabra_clave);
      const keywords = keywordsArr.join(', ');

      // 3. Obtener los criterios para la revisión
      const { data: criteriosData, error: errorCriterios } = await this.authService.getCriterios(this.reviewId);
      if (errorCriterios) {
        console.error('Error al cargar criterios:', errorCriterios);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los criterios.'
        });
        return;
      }
      // Extraemos la descripción de cada criterio y las unimos en una cadena
      const criteriosArr = (criteriosData || []).map(c => c.descripcion);
      const criterios_seleccion = criteriosArr.join(', ');

      // 4. Construir el payload
      const payload = {
        title,
        keywords,
        criterios_seleccion,
        description
      };

      console.log('Payload para Trabajos Relacionados:', payload);

      // 5. Mostrar alerta de carga mientras se genera la sección
      Swal.fire({
        title: 'Generando trabajos relacionados...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // 6. Llamar al servicio de OpenAI para generar la sección de trabajos relacionados
      this.openAiService.generateTrabajosRelated(payload).subscribe({
        next: (res) => {
          Swal.close();
          Swal.fire({
            icon: 'success',
            title: 'Sugerencia generada',
            text: 'La IA ha generado la sección de trabajos relacionados.',
            timer: 2500,
            showConfirmButton: false
          });
          // Asignar el resultado al área editable (puedes ajustar el formato si lo deseas)
          this.trabajosText = res.trabajos_relacionados.replace(/\n\n/g, '<br><br>');
        },
        error: (err) => {
          Swal.close();
          console.error('Error generando trabajos relacionados:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un error al generar la sección de trabajos relacionados con IA.'
          });
        }
      });
    } catch (error) {
      console.error('Error en generateTrabajosRelacionadosWithData:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al generar la sección de trabajos relacionados.'
      });
    }
  }

  // Método para guardar el borrador de trabajos relacionados
  async saveTrabajosRelatedDraft(): Promise<void> {
    try {
      Swal.fire({
        title: 'Guardando trabajos relacionados...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // Se llama a saveSectionDraft del authService, enviando la propiedad "trabajos_relacionados"
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        // Se pueden enviar otros campos según corresponda
        trabajos_relacionados: this.trabajosText
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un error al guardar los trabajos relacionados. Por favor, inténtalo de nuevo.',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de trabajos relacionados guardado con éxito.',
          timer: 2500,
          showConfirmButton: false
        });
        this.trabajosSaved = true; // Se marca como guardado para ocultar el botón
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de trabajos relacionados:', err);
    }
  }

  // Generar metodología con IA
  generateMetodologiaWithIA(): void {
    // Al comenzar, se resetea el estado de guardado
    this.metodologiaSaved = false;
    Swal.fire({
      title: 'Generando metodología...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    // Construye el payload según necesites. Ejemplo:
    const payload = {
      title: this.reviewData.titulo_revision || '',
      description: this.reviewData.descripcion || '',
      objetivo: this.reviewData.objetivo || '',
      tipo_investigacion: this.reviewData.tipo_investigacion || ''
    };

    // Llamada a un método del openAiService, e.g. generateMetodologia()
    this.openAiService.generateMetodologia(payload).subscribe({
      next: (res) => {
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Sugerencia generada',
          text: 'La IA ha generado la sección de Metodología.',
          timer: 2000,
          showConfirmButton: false
        });
        // Asigna el texto al area editable
        this.metodologiaText = res.metodologia.replace(/\n\n/g, '<br><br>');
      },
      error: (err) => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un error generando la metodología con IA.'
        });
        console.error('Error generando metodología con IA:', err);
      }
    });
  }

  // Guardar el borrador de Metodología
  async saveMetodologiaDraft(): Promise<void> {
    try {
      Swal.fire({
        title: 'Guardando metodología...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // Llamamos al authService, enviando solo la Metodología
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        metodologia: this.metodologiaText
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la metodología. Intenta de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Metodología guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.metodologiaSaved = true;
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Metodología:', err);
    }
  }

  // 1. Método para generar resultados con IA
  async generateResultadosWithIA(): Promise<void> {
    this.resultadosSaved = false; // Indicamos que se está editando
    Swal.fire({
      title: 'Generando resultados...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // A) Obtener studies_data
      const { data: studiesData, error: studiesError } = await this.authService.getEstudiosByRevision(+this.reviewId);
      if (studiesError) {
        Swal.close();
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los estudios.' });
        return;
      }
      // Podrías mapearlos a un arreglo de {id_estudios, estado, titulo}, etc.
      const studiesArr = (studiesData || []).map(s => ({
        id_estudios: s.id_estudios,
        estado: s.estado,
        titulo: s.titulo
      }));
      const studies_data = JSON.stringify(studiesArr);

      // B) Obtener extraction_responses
      const studyIds = (studiesData || [])
        .map(s => s.id_estudios)
        .filter((id): id is number => id !== undefined);
      const { data: responsesData, error: responsesError } = await this.authService.getExtractionResponsesForStudies(studyIds);
      if (responsesError) {
        Swal.close();
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las respuestas de extracción.' });
        return;
      }
      const extraction_responses = JSON.stringify(responsesData || []);

      // C) Construir payload
      const payload = {
        studies_data,
        extraction_responses
      };

      // Llamar a openAiService.generateResultados(...)
      const result = await this.openAiService.generateResultados(payload).toPromise();

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencia generada',
        text: 'La IA ha generado la sección de resultados.',
        timer: 2000,
        showConfirmButton: false
      });

      // Asignamos el texto
      this.resultadosText = result.resultados.replace(/\n\n/g, '<br><br>');
    } catch (err) {
      Swal.close();
      console.error('Error generando resultados con IA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un error al generar la sección de resultados con IA.'
      });
    }
  }

  // 2. Guardar el borrador de resultados en la BD
  async saveResultadosDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando resultados...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Llamamos a saveSectionDraft, enviando sólo resultados
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        resultados: this.resultadosText
        // no mandamos los demás campos para no sobrescribirlos
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la sección de resultados. Intente de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Resultados guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.resultadosSaved = true;
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Resultados:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la sección de resultados.'
      });
    }
  }

  // Generar discusión con IA
  async generateDiscussionWithIA(): Promise<void> {
    // Limpiamos el estado de guardado si se va a generar algo nuevo
    this.discusionSaved = false;

    Swal.fire({
      title: 'Generando discusión...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Construir el payload con los datos que necesita el backend
      // * results_summary -> this.resultadosText
      // * literature_review -> this.trabajosText
      const payload = {
        results_summary: this.resultadosText || 'No hay resultados previos.',
        literature_review: this.trabajosText || 'No hay trabajos relacionados previos.'
      };

      console.log('Payload para generar Discusión:', payload);

      // Llamada al servicio de OpenAI
      const response = await this.openAiService.generateDiscussion(payload).toPromise();

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencia generada',
        text: 'La IA ha generado la sección de Discusión.',
        timer: 2000,
        showConfirmButton: false
      });

      // Asignamos la respuesta a discusionText
      this.discusionText = response.discusion.replace(/\n\n/g, '<br><br>');
    } catch (err) {
      Swal.close();
      console.error('Error generando Discusión con IA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar la discusión con IA.'
      });
    }
  }

  // Guardar el borrador de Discusión
  async saveDiscussionDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando discusión...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Llamamos a saveSectionDraft, enviando sólo la discusión
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        discusion: this.discusionText
        // No enviamos los demás campos para no sobreescribirlos
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la sección de discusión. Intente de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Discusión guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.discusionSaved = true; // Marcamos como guardado
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Discusión:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la sección de discusión.'
      });
    }
  }

  // Método para generar "Limitaciones" con IA
  async generateLimitacionesWithIA(): Promise<void> {
    this.limitacionesSaved = false; // Se resetea el guardado si se va a generar nuevo texto
    Swal.fire({
      title: 'Generando limitaciones...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Dado que el backend pide methodological_issues (metodologia) y search_limitations (resultados)
      const payload = {
        methodological_issues: this.metodologiaText || 'No hay metodología definida.',
        search_limitations: this.resultadosText || 'No hay resultados definidos.'
      };

      console.log('Payload para generar Limitaciones:', payload);

      // Llamada al openAiService, método generateLimitaciones
      const response = await this.openAiService.generateLimitaciones(payload).toPromise();

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencia generada',
        text: 'La IA ha generado la sección de limitaciones.',
        timer: 2000,
        showConfirmButton: false
      });

      // Asignamos el texto al área editable
      this.limitacionesText = response.limitaciones.replace(/\n\n/g, '<br><br>');

    } catch (err) {
      Swal.close();
      console.error('Error generando limitaciones con IA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar la sección de limitaciones con IA.'
      });
    }
  }

  // Método para guardar el borrador de "Limitaciones"
  async saveLimitacionesDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando limitaciones...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Llamamos a saveSectionDraft enviando únicamente la sección "limitaciones"
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        limitaciones: this.limitacionesText
        // No enviamos otros campos para no sobrescribirlos
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la sección de limitaciones. Intenta de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Limitaciones guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.limitacionesSaved = true; // Se marca como guardado
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de limitaciones:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la sección de limitaciones.'
      });
    }
  }

  // 1. Generar Conclusión con IA
  async generateConclusionWithIA(): Promise<void> {
    this.conclusionSaved = false;  // Se resetea el estado de guardado si se va a generar un nuevo borrador

    Swal.fire({
      title: 'Generando conclusión...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Construimos el payload requerido por el backend
      // summary_results proviene de this.resultadosText
      // future_research proviene de this.limitacionesText
      const payload = {
        summary_results: this.resultadosText || 'No se han definido resultados.',
        future_research: this.limitacionesText || 'No se han definido limitaciones.'
      };

      console.log('Payload para generar Conclusión:', payload);

      // Llamar a openAiService.generateConclusion(...)
      const response = await this.openAiService.generateConclusion(payload).toPromise();

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencia generada',
        text: 'La IA ha generado la sección de Conclusión.',
        timer: 2000,
        showConfirmButton: false
      });

      // Asignamos el texto generado al área editable
      this.conclusionText = response.conclusion.replace(/\n\n/g, '<br><br>');

    } catch (err) {
      Swal.close();
      console.error('Error generando Conclusión con IA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar la sección de conclusión con IA.'
      });
    }
  }

  // 2. Guardar borrador de Conclusión
  async saveConclusionDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando conclusión...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      // Llamamos a saveSectionDraft, enviando solo la sección de conclusión
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        conclusion: this.conclusionText
        // No enviamos el resto de secciones para no sobrescribir
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la sección de conclusión. Intente de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Conclusión guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.conclusionSaved = true;
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Conclusión:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la sección de conclusión.'
      });
    }
  }

  // 1. Generar Referencias con IA
  async generateReferencesWithIA(): Promise<void> {
    this.referencesSaved = false;  // reset del guardado si se va a regenerar
    Swal.fire({
      title: 'Generando referencias...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        // La firma de showLoading ahora requiere un argumento; si no deseas reemplazar un botón, pasa null:
        Swal.showLoading(null);
      }
    });

    try {
      // Construimos el payload según pide el backend
      // Pasamos introduction, trabajos_relacionados, metodologia, resultados, y un format (por defecto "IEEE")
      const payload = {
        introduction: this.introductionText || '',
        trabajos_relacionados: this.trabajosText || '',
        metodologia: this.metodologiaText || '',
        resultados: this.resultadosText || '',
        format: 'IEEE'
      };

      console.log('Payload para generar Referencias:', payload);

      // Llamada a openAiService para generar las referencias
      const response = await this.openAiService.generateReferencias(payload).toPromise();

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencia generada',
        text: 'La IA ha generado la sección de referencias.',
        timer: 2000,
        showConfirmButton: false
      });

      // Asignamos el texto recibido
      this.referenciasText = response.referencias.replace(/\n\n/g, '<br><br>');

    } catch (err) {
      Swal.close();
      console.error('Error generando Referencias con IA:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar la sección de referencias con IA.'
      });
    }
  }

  // 2. Guardar borrador de Referencias
  async saveReferencesDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando referencias...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(null);
      }
    });

    try {
      // Llamamos a saveSectionDraft, enviando solo las referencias
      const { data, error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId, // ajusta con tu variable (ej. this.reviewId)
        referencias: this.referenciasText
        // no enviamos otras secciones para no sobrescribir
      });

      Swal.close();
      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la sección de referencias. Intente de nuevo.'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Borrador de Referencias guardado con éxito.',
          timer: 2000,
          showConfirmButton: false
        });
        this.referencesSaved = true;
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Referencias:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la sección de referencias.'
      });
    }
  }








  // Función para generar y subir el DOCX
  async downloadDraftWord(): Promise<void> {
    try {
      // 1. Crear el documento DOCX
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                text: "Introducción",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.introductionText)] }),
              new Paragraph({
                text: "Trabajos relacionados",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.trabajosText)] }),
              new Paragraph({
                text: "Metodología",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.metodologiaText)] }),
              new Paragraph({
                text: "Resultados",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.resultadosText)] }),
              new Paragraph({
                text: "Discusión",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.discusionText)] }),
              new Paragraph({
                text: "Limitaciones",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.limitacionesText)] }),
              new Paragraph({
                text: "Conclusión",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.conclusionText)] }),
              new Paragraph({
                text: "Referencias",
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),
              new Paragraph({ children: [new TextRun(this.referenciasText)] })
            ]
          }
        ]
      });

      // 2. Generar el documento en un Blob
      const blob: Blob = await Packer.toBlob(doc);

      // 3. Subir el documento al bucket "documentos" en la carpeta "informes"
      const uploadResult = await this.authService.uploadInformeDocx(blob, this.reviewId);
      if (!uploadResult) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo subir el informe DOCX al storage.'
        });
        return;
      }

      const { publicUrl, fileName } = uploadResult;
      const fechaGeneracion = new Date().toISOString();

      // 4. Registrar el informe generado en la tabla "informes_generados"
      const { data: dbData, error: dbError } = await this.authService.insertInformeGenerado(
        this.reviewId,
        fileName,
        publicUrl,
        fechaGeneracion
      );
      if (dbError) {
        console.error('Error al insertar informe generado:', dbError);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo registrar el informe en la base de datos.'
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: '¡Subido!',
        text: 'El informe DOCX se ha subido y registrado correctamente.',
        timer: 2500,
        showConfirmButton: false
      });
      // 7. Actualizar la tabla de informes generados en la UI
      await this.loadInformesGenerados();
    } catch (err) {
      console.error('Error inesperado al generar el DOCX:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al generar el informe DOCX.'
      });
    }
  }

  // Método para descargar un informe (abre la URL en una nueva pestaña)
  downloadFile(informe: Informe): void {
    window.open(informe.ruta_archivo, '_blank');
  }

  // Método para eliminar un informe
  async deleteInforme(informe: Informe): Promise<void> {
    try {
      const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Esta acción eliminará el informe generado de forma permanente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed) {
        // Llamar al servicio para eliminar el informe de la base de datos
        const { data, error } = await this.authService.deleteInformeGenerado(informe.id_informes_generados);
        if (error) {
          console.error('Error al eliminar el informe:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo eliminar el informe.'
          });
          return;
        }
        // Eliminar el informe del array local
        this.informesGenerados = this.informesGenerados.filter(i => i.id_informes_generados !== informe.id_informes_generados);
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'El informe se eliminó correctamente.',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error('Error inesperado al eliminar el informe:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error inesperado',
        text: 'Ocurrió un problema al eliminar el informe.'
      });
    }
  }

  async loadInformesGenerados() {
    try {
      this.informesGenerados = await this.authService.getInformesGenerados(this.reviewId);
    } catch (err) {
      console.error('Error al cargar informes generados:', err);
    }
  }











  firmaBase64: string = '';

  async generateQRText(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      QRCode.toString(data, { type: "utf8" }, (err, qr) => {
        if (err) reject(err);
        else resolve(qr);
      });
    });
  }

  async downloadDraftPdf(): Promise<void> {
    try {
      // 1. Crear una instancia de jsPDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Uso de Inteligencia Artificial para Diagnóstico Médico Basado en Imágenes", pageWidth / 2, y, { align: "center" });
      y += 10;

      // Definir secciones y contenidos
      const sections = [
        { title: "Introducción", content: this.introductionText },
        { title: "Trabajos relacionados", content: this.trabajosText },
        { title: "Metodología", content: this.metodologiaText },
        { title: "Resultados", content: this.resultadosText },
        { title: "Discusión", content: this.discusionText },
        { title: "Limitaciones", content: this.limitacionesText },
        { title: "Conclusión", content: this.conclusionText },
        { title: "Referencias", content: this.referenciasText }
      ];

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");

      for (const section of sections) {
        y += 10;
        // Agregar título de la sección en negrita
        doc.setFont("helvetica", "bold");
        doc.text(section.title, 10, y);
        y += 6;
        // Agregar el contenido de la sección con ajuste de texto
        doc.setFont("helvetica", "normal");
        const textLines = doc.splitTextToSize(section.content || "", pageWidth - 20);
        doc.text(textLines, 10, y);
        y += textLines.length * 10 + 10;
        // Si nos acercamos al final de la página, agregar una nueva página
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
      }

      // 2. Generar el documento PDF en un Blob
      const qrData = `${this.nombreUsuario} - ${this.cargoUsuario}`;
      const qrText = await this.generateQRText(qrData);

      // 🔹 Agregar firma si está disponible
      if (this.firmaBase64) {
        y += 20;
        doc.setFontSize(14);
        doc.text("Firma:", 10, y);
        y += 10;
        doc.addImage(this.firmaBase64, 'PNG', 10, y, 50, 25);
      } else {
        if (qrData) {
          y += 10;
          const qrSize = 50; // Tamaño del QR
          doc.addImage(this.qrImageUrl, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize);
          y += qrSize + 10;

          // Agregar el nombre y cargo debajo del QR
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          // Línea divisoria
          doc.setLineWidth(0.5);
          doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
          y += 8;
          const textoUsuario = `${this.cargoUsuario.toUpperCase()} ${this.nombreUsuario.toUpperCase()}`;
          doc.text(textoUsuario, pageWidth / 2, y, { align: "center" });
          y += 8;
          doc.text("INVESTIGADOR", pageWidth / 2, y, { align: "center" });
        }
      }

      const pdfBlob: Blob = doc.output("blob");

      // 3. Crear un nombre único para el archivo PDF
      const fileName = `Borrador_de_Articulo_${Date.now()}.pdf`;

      // 4. Subir el archivo al bucket "documentos" en la carpeta "informes"
      const { data: uploadData, error: uploadError } = await this.authService.uploadInforme(fileName, pdfBlob, this.reviewId);
      if (uploadError) {
        console.error("Error al subir el informe PDF:", uploadError);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo subir el informe PDF al storage."
        });
        return;
      }

      // 5. Obtener la URL pública del archivo subido
      if (!uploadData) {
        throw new Error("Upload data is null");
      }
      const publicUrl = uploadData.publicUrl;
      const fechaGeneracion = new Date().toISOString();

      // 6. Registrar el informe generado en la tabla "informes_generados"
      const { data: dbData, error: dbError } = await this.authService.insertInformeGeneradopdf(
        this.reviewId,
        fileName,
        publicUrl,
        fechaGeneracion
      );
      if (dbError) {
        console.error("Error al insertar informe generado:", dbError);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo registrar el informe en la base de datos."
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "¡Subido!",
        text: "El informe PDF se ha subido y registrado correctamente.",
        timer: 2500,
        showConfirmButton: false
      });
      // 7. Actualizar la tabla de informes generados en la UI
      await this.loadInformesGenerados();
    } catch (err) {
      console.error("Error inesperado al generar el PDF:", err);
      Swal.fire({
        icon: "error",
        title: "Error inesperado",
        text: "Ocurrió un problema al generar el informe PDF."
      });
    }
  }


  @ViewChild('firmaCanvas', { static: false }) firmaCanvas!: ElementRef<HTMLCanvasElement>;
  private signaturePad!: SignaturePad;

  ngAfterViewInit() {
    const canvas = this.firmaCanvas.nativeElement;
    this.signaturePad = new SignaturePad(canvas);
  }

  generarQR() {

  }

  seleccionarModo(modo: 'manual' | 'qr') {
    this.modoFirma = modo;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.firmaQr = reader.result as string; // Convertir a Base64
      };
      reader.readAsDataURL(file);
    }
  }


  limpiarFirma() {
    this.signaturePad.clear();
  }

  guardarFirma() {
    if (!this.signaturePad.isEmpty()) {
      this.firmaBase64 = this.signaturePad.toDataURL('image/png');
      console.log('Firma guardada:', this.firmaBase64);
    } else {
      console.log('No hay firma para guardar.');
    }
  }

  qrData: string = ''; // Datos para el código QR 

  // Método para generar el código QR
  async generateQR(): Promise<void> {
    this.nombreUsuario = this.nombreInput.nativeElement.value.trim();
    this.cargoUsuario = this.cargoInput.nativeElement.value.trim();


    const qrData = `${this.nombreUsuario} - ${this.cargoUsuario}`;

    try {
      this.qrImageUrl = await QRCode.toDataURL(qrData);
    } catch (err) {
      console.error('Error generando el QR:', err);
    }
  }
}
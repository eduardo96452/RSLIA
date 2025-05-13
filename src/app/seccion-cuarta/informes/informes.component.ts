import { Component, ElementRef, HostListener, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService, Informe } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, TableLayoutType, BorderStyle, ShadingType, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { jsPDF } from "jspdf";
import { SupabaseService } from '../../conexion/supabase.service';
import SignaturePad from 'signature_pad';
import QRCode from 'qrcode';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ConclusionPayload {
  results_summary: string;       // this.reflexionInicial
  discussion_summary: string;    // this.discusionText
  objective: string;             // this.reviewData.objetivo
  research_questions: string[];  // this.questions.map(q => q.value)
}

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

  trabajosText = 'Contenido de Trabajos relacionados...';
  trabajosRefsText = 'Referencia de Trabajos relacionados...';
  trabajosSaved = false;
  trabajosRefsSaved = false;
  loadingTrabajos = false;
  isTrabajosCopied = false;
  isTrabajosRefsCopied = false;
  keywordsText = '';
  isKeywordsCopied = false;
  loadingKeywords = false;
  ratingTR: number | null = null;  // 1 = like, 0 = dislike

  metodologiaText = 'Contenido de la Metodología...';
  metodologiaSaved: boolean = false;
  iaContext: any = null;
  loadingContext = false;
  loadingMetodologia = false;
  metDirty = false;
  metEnfoque = '';
  metFases = '';
  metProcedimiento = '';
  metTablaPicos = '';
  metAnalisisCadena = '';
  metCadenaGlobal = '';
  metIntroBases = '';
  metTablaBases = '';
  metTablaCadenas = '';
  metProceso = '';
  metCriterios!: SafeHtml;
  metCriteriosRaw = '';
  metCriteriosHtml!: SafeHtml;
  isMetEnfoqueCopied = false;
  isMetFasesCopied = false;
  isMetProcedimientoCopied = false;
  isMetTablaPicosCopied = false;
  isMetAnalisisCadenaCopied = false;
  isMetCadenaGlobalCopied = false;
  isMetIntroBasesCopied = false;
  isMetTablaBasesCopied = false;
  isMetTablaCadenasCopied = false;
  isMetCriteriosCopied = false;
  isMetProcesoCopied = false;
  ratingMetodologia: number | null = null;  // 1=like, 0=dislike

  // Reflexión
  reflexionInicial = 'Contenido de la Reflexión...';
  reflexionSaved = false;
  resultadosSaved = false;
  // Preguntas y respuestas
  preguntasList: string[] = [];
  respuestasConcatenadas: { [pregunta: string]: string } = {};
  respuestasSaved: { [pregunta: string]: boolean } = {};
  // Referencias
  referenciasConcatenadas = '';
  referenciasSaved = false;
  // Control de carga/estado
  loadingResultados = false;
  respuestasPorPregunta: { [key: string]: string[] } = {};
  isReflexionCopied = false;
  isRespuestaCopied: Record<string, boolean> = {};
  isReferenciasResultadosCopied = false;
  ratingResultados: number | null = null;  // 1 = like, 0 = dislike

  // KEYWORDS Discusion
  keywordsDiscusionText = '';
  isKeywordsDiscusionCopied = false;
  loadingKeywordsDiscusion = false;
  // DISCUSIÓN
  discusionText = 'Contenido de la Discusión...';
  discusionReferencias: string[] = [];
  discusionSaved: boolean = false;
  referenciasDiscusionText: string = '';
  isDiscusionCopied = false;
  isReferenciasDiscusionCopied = false;
  loadingDiscusion = false;
  ratingDiscusion: number | null = null;  // 1=like, 0=dislike

  limitacionesText = 'Contenido de las Limitaciones...';
  limitacionesSaved = false;
  loadingLimitaciones = false;
  isLimitacionesCopied = false;
  ratingLimitaciones: number | null = null;  // 1=like, 0=dislike

  conclusionText = 'Contenido de las Conclusiones...';
  conclusionSaved = false;
  loadingConclusions = false;
  isConclusionCopied = false;
  ratingConclusion: number | null = null; // 1 = like, 0 = dislike

  // --- Estados para Keywords de Introducción ---
  keywordsIntroText = '';
  isKeywordsIntroCopied = false;
  loadingIntroKeywords = false;

  // --- Estados para la Introducción ---
  introText = 'Contenido de la Introducción...';
  introRefsText = 'Referencia de la Introducción...';
  introSaved = false;
  introRefsSaved = false;
  loadingIntro = false;
  isIntroCopied = false;
  isIntroRefsCopied = false;
  ratingIntroduction: number | null = null; // 1 = like, 0 = dislike

  resumenText = 'Contenido de las Referencias...';
  loadingResumen = false;
  resumenSaved = false;
  isResumenCopied = false;
  ratingResumen: number | null = null; // 1 = like, 0 = dislike

  informesGenerados: Informe[] = [];

  researchQuestionsList: string[] = [];
  researchQuestion = '';

  questions: { id: number; value: string; id_detalles_revision: string; isSaved: boolean }[] = [];
  questionsUpdated = false;

  @ViewChild('nombreInput') nombreInput!: ElementRef;
  @ViewChild('cargoInput') cargoInput!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private supabase: SupabaseService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer
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
      this.loadQuestions(),
      this.loadIntroductionDraft(),
      this.loadTrabajosDraft(),
      this.loadMetodologiaDraft(),
      this.loadResultadosDraft(),
      this.loadDiscusionDraft(),
      this.loadLimitacionesDraft(),
      this.loadConclusionDraft(),
      this.loadResumenDraft(),
      this.loadResearchQuestions(),
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

  //---------------------------------------- SECCION DE CARGA DE INFORMACIÓN

  private async loadResearchQuestions() {
    try {
      const { data, error } = await this.authService.getResearchQuestionsByRevision(this.reviewId);
      if (error) {
        console.error('Error al cargar preguntas de investigación:', error);
        return;
      }
      this.researchQuestionsList = (data || []).map((q: any) => q.descripcion);
      this.researchQuestion = this.researchQuestionsList[0] || '';
    } catch (err) {
      console.error('Excepción al cargar preguntas de investigación:', err);
    }
  }

  async loadQuestions() {
    if (!this.reviewId) return;
    const { data, error } = await this.authService.getResearchQuestionsByRevision(this.reviewId);
    if (error) {
      Swal.fire('Error al cargar preguntas', 'Intente nuevamente.', 'error');
      return;
    }
    this.questions = data.map((q: any) => ({
      id: q.id_preguntas_investigacion,
      value: q.pregunta,
      id_detalles_revision: q.id_detalles_revision,
      isSaved: true,
    }));
    this.questionsUpdated = this.questions.length > 0;
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

  // Cargar draft y parsear JSON
  async loadTrabajosDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error(error);
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(data?.trabajos_relacionados || '{}');
      } catch {
        parsed = { keywords: '', trabajos: data?.trabajos_relacionados || '', referencias: data?.referencias_trabajos || '' };
      }

      // Asignar valores
      this.keywordsText = parsed.keywords || '';
      this.trabajosText = parsed.trabajos || '';
      this.trabajosRefsText = parsed.referencias || '';

      // **Valoración**: lee calidadtrabajorelacionado
      const val = data.calidadtrabajorelacionado;
      this.ratingTR = val === '1' ? 1
        : val === '0' ? 0
          : null;

      this.trabajosSaved = this.trabajosText.trim().length > 0;
      this.trabajosRefsSaved = this.trabajosRefsText.trim().length > 0;
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  }

  async loadMetodologiaDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar metodología:', error);
        return;
      }
      if (!data?.metodologia) {
        return;
      }
      let obj: any;
      try {
        obj = JSON.parse(data.metodologia);
      } catch (e) {
        console.error('El campo metodología no es un JSON válido:', e);
        return;
      }
      this.metEnfoque = obj.enfoque_metodologico || '';
      this.metFases = obj.fases_prisma || '';
      this.metProcedimiento = obj.procedimiento_busqueda || '';
      this.metTablaPicos = obj.tabla_picos || '';
      this.metAnalisisCadena = obj.analisis_cadena_busqueda || '';
      this.metCadenaGlobal = obj.cadena_busqueda_global || '';
      this.metIntroBases = obj.introduccion_bases_datos || '';
      this.metTablaBases = obj.tabla_bases_datos || '';
      this.metTablaCadenas = obj.tabla_cadenas_busqueda || '';
      // Procesar criterios de selección con saltos de línea
      if (obj.criterios_seleccion) {
        const raw = (typeof obj.criterios_seleccion === 'string')
          ? obj.criterios_seleccion
          : (obj.criterios_seleccion.changingThisBreaksApplicationSecurity ?? '');
        const html = raw.replace(/\n/g, '<br/>');
        this.metCriterios = this.sanitizer.bypassSecurityTrustHtml(html);
      } else {
        this.metCriterios = this.sanitizer.bypassSecurityTrustHtml('');
      }
      this.metProceso = obj.proceso_cribado || '';


      this.metodologiaSaved = true;
      const val = data.calidadmetodologia;
      this.ratingMetodologia = val === '1' ? 1
        : val === '0' ? 0
          : null;

    } catch (err) {
      console.error('Excepción en loadMetodologiaDraft:', err);
    }
  }

  async loadResultadosDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar resultados:', error);
        return;
      }
      if (!data?.resultados) {
        // No hay borrador todavía
        return;
      }

      let obj: any;
      try {
        obj = JSON.parse(data.resultados);
      } catch {
        console.error('El campo resultados no es un JSON válido');
        return;
      }

      // 1) Reflexión inicial
      if (Array.isArray(obj.reflexion_inicial)) {
        this.reflexionInicial = obj.reflexion_inicial.join('\n\n');
      } else {
        this.reflexionInicial = '';
      }

      // 2) Preguntas dinámicas
      this.preguntasList = [];
      this.respuestasConcatenadas = {};
      for (const key of Object.keys(obj)) {
        if (key === 'reflexion_inicial' || key === 'referencias') continue;
        this.preguntasList.push(key);
        const arr = Array.isArray(obj[key]) ? obj[key] : [String(obj[key] || '')];
        this.respuestasConcatenadas[key] = arr.join('\n\n');
      }

      // 3) Referencias
      if (Array.isArray(obj.referencias)) {
        this.referenciasConcatenadas = obj.referencias.join('\n\n');
      } else {
        this.referenciasConcatenadas = '';
      }

      // marcamos como ya guardado
      this.resultadosSaved = true;

      const val = data.calidadresultados;
      this.ratingResultados = val === '1' ? 1
        : val === '0' ? 0
          : null;

    } catch (err) {
      console.error('Excepción en loadResultadosDraft:', err);
    }
  }

  async loadDiscusionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar discusión:', error);
        return;
      }

      if (data?.discusion) {
        // Parseamos el JSON guardado
        let obj: any;
        try {
          obj = JSON.parse(data.discusion);
        } catch {
          console.warn('Borrador de discusión mal formado, cargando como texto plano.');
          obj = {
            keywords: '',
            discusion: data.discusion,
            referencias: data?.referencias_discusion || ''
          };
        }

        // Asignamos las tres propiedades
        this.keywordsDiscusionText = obj.keywords || '';
        this.discusionText = obj.discusion || '';
        this.referenciasDiscusionText = Array.isArray(obj.referencias)
          ? obj.referencias.join('')   // si las guardaste como array con <br>, ya incluyen br
          : obj.referencias || '';

        // Marcar como guardado
        this.discusionSaved = true;

        const val = data.calidaddiscusion;
        this.ratingDiscusion = val === '1' ? 1
          : val === '0' ? 0
            : null;
      }
    } catch (err) {
      console.error('Excepción al cargar discusión:', err);
    }
  }

  async loadLimitacionesDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) return console.error(error);
      if (data?.limitaciones) {
        this.limitacionesText = data.limitaciones;
        this.limitacionesSaved = true;

        const val = data.calidadlimitaciones;
        this.ratingLimitaciones = val === '1' ? 1
          : val === '0' ? 0
            : null;
      }
    } catch (e) {
      console.error('Error al cargar limitaciones:', e);
    }
  }

  async loadConclusionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) { console.error(error); return; }
      if (data?.conclusion) {
        const obj = JSON.parse(data.conclusion);
        this.conclusionText = obj.conclusiones || '';
        this.conclusionSaved = true;

        const val = data.calidadconclusion;
        this.ratingConclusion = val === '1' ? 1
          : val === '0' ? 0
            : null;
      }
    } catch (e) {
      console.error('Error cargando conclusiones:', e);
    }
  }

  // Cargar borrador de introducción (parseando el JSON)
  async loadIntroductionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar la introducción:', error);
        return;
      }
      if (data?.introduccion) {
        // 1) Intentamos parsear el JSON guardado
        let obj: { keywords?: string; introText?: string; references?: string; };
        try {
          obj = JSON.parse(data.introduccion);
        } catch {
          console.warn('Borrador mal formado, cargando como texto simple.');
          obj = { keywords: '', introText: data.introduccion, references: '' };
        }

        // 2) Asignamos los tres valores
        this.keywordsIntroText = obj.keywords || '';
        this.introText = obj.introText || '';
        this.introRefsText = obj.references || '';

        // 3) Marcamos flags
        this.introSaved = this.introText.trim().length > 0;
        this.introRefsSaved = this.introRefsText.trim().length > 0;

        const val = data.calidadintroduccion;
        this.ratingIntroduction = val === '1' ? 1
          : val === '0' ? 0
            : null;
      }
    } catch (err) {
      console.error('Excepción al cargar la introducción:', err);
    }
  }

  async loadResumenDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar resumen:', error);
        return;
      }
      if (data?.resumen) {
        this.resumenText = data.resumen;
        this.resumenSaved = true;

        const val = data.calidadresumen;
        this.ratingResumen = val === '1' ? 1
          : val === '0' ? 0
            : null;
      }
    } catch (err) {
      console.error('Excepción en loadResumenDraft:', err);
    }
  }

  // ------------------------------------------------ SECCIÓN TRABAJOS RELACIONADOS

  generateKeywordsWithIA(): void {
    this.loadingKeywords = true;
    Swal.fire({ title: 'Generando keywords…', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });

    // Prepara el texto con título, descripción y criterios
    const title = this.reviewData.titulo_revision || '';
    const description = this.reviewData.descripcion || '';
    const criterios = ((this.reviewData.criterios || []) as string[]).join(', ');
    const text = `${title} ${description} ${criterios}`;

    this.openAiService.generatetrabaRelaKeywords({ text }).subscribe({
      next: res => {
        this.keywordsText = res.keywords;
        this.isKeywordsCopied = false;
        this.trabajosSaved = false;
        Swal.close();
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudieron generar palabras clave', 'error');
      },
      complete: () => this.loadingKeywords = false

    });
  }

  copyKeywords(): void {
    navigator.clipboard.writeText(this.keywordsText);
    this.isKeywordsCopied = true;
  }

  // 2) Generar trabajos relacionados usando keywordsText
  async generateTrabajosRelacionadosWithData(): Promise<void> {
    if (!this.keywordsText) {
      Swal.fire('Atención', 'Primero genera las keywords', 'warning');
      return;
    }

    this.loadingTrabajos = true;
    Swal.fire({
      title: 'Generando…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    const title = this.reviewData.titulo_revision || '';
    const description = this.reviewData.descripcion || '';

    // Obtener criterios (con manejo de fallo)
    let criteriosArr: string[] = [];
    try {
      const { data: criteriosApi } = await this.authService.getCriterios(this.reviewId);
      criteriosArr = (criteriosApi ?? []).map((c: any) => c.descripcion);
    } catch {
      criteriosArr = [];
      // aquí podrías avisar al usuario, pero no interrumpe el flujo
    }
    const criterios_seleccion = criteriosArr.join(', ');

    const payload = { title, description, criterios_seleccion, keywords: this.keywordsText };

    this.openAiService.generateTrabajosRelated(payload).subscribe({
      next: res => {
        this.trabajosText = res.trabajos_relacionados.replace(/\n\n/g, '<br><br>');
        this.trabajosRefsText = (res.references || []).join('<br>');
        Swal.close();
      },
      error: err => {
        Swal.close();
        Swal.fire(
          'Error',
          err.error?.error || 'No se pudo generar Trabajos relacionados',
          'error'
        );
        // **Re-habilitamos el botón al fallar**
        this.loadingTrabajos = false;
        this.trabajosSaved = false;
      },
      complete: () => {
        // En caso de éxito, también deshabilitamos el loading
        this.loadingTrabajos = false;
      }
    });
  }

  // Guardar borrador como JSON en trabajos_relacionados
  async saveTrabajosRelatedDraft(): Promise<void> {
    Swal.fire({ title: 'Guardando…', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });

    const payload = {
      id_detalles_revision: this.reviewId,
      trabajos_relacionados: JSON.stringify({
        keywords: this.keywordsText,
        trabajos: this.trabajosText,
        referencias: this.trabajosRefsText
      })
    };

    console.log('Payload para guardar trabajos relacionados:', payload);

    const { error } = await this.authService.saveSectionDraft(payload);

    Swal.close();
    if (error) {
      Swal.fire('Error', 'No se pudo guardar', 'error');
    } else {
      this.trabajosSaved = true;
      this.trabajosRefsSaved = true;
      Swal.fire('Guardado', 'Borrador almacenado', 'success');
    }
  }

  copyTrabajosText() {
    navigator.clipboard.writeText(this.stripHtml(this.trabajosText))
      .then(() => {
        this.isTrabajosCopied = true;
        setTimeout(() => this.isTrabajosCopied = false, 2000);
      });
  }

  copyTrabajosRefsText() {
    navigator.clipboard.writeText(this.stripHtml(this.trabajosRefsText))
      .then(() => {
        this.isTrabajosRefsCopied = true;
        setTimeout(() => this.isTrabajosRefsCopied = false, 2000);
      });
  }

  // 1) Función para valorar (like/dislike) trabajos relacionados
  async rateTrabajoRelated(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadtrabajorelacionado: value
      });
      this.ratingTR = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  // Handler para editar el cuerpo
  onTrabajosInput(event: Event): void {
    this.trabajosText = (event.target as HTMLElement).innerHTML;
    this.trabajosSaved = false;
  }
  // Handler para editar las referencias
  onTrabajosRefsInput(event: Event): void {
    this.trabajosRefsText = (event.target as HTMLElement).innerHTML;
    this.trabajosSaved = false;
  }

  /** Opcional: convierte HTML a texto plano para copiar */
  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // ------------------------------------------------ SECCIÓN METODOLOGÍA|

  // Guardar el borrador de Metodología
  async saveMetodologiaDraft(): Promise<void> {
    const json = {
      enfoque_metodologico: this.metEnfoque,
      fases_prisma: this.metFases,
      procedimiento_busqueda: this.metProcedimiento,
      tabla_picos: this.metTablaPicos,
      analisis_cadena_busqueda: this.metAnalisisCadena,
      cadena_busqueda_global: this.metCadenaGlobal,
      introduccion_bases_datos: this.metIntroBases,
      tabla_bases_datos: this.metTablaBases,
      tabla_cadenas_busqueda: this.metTablaCadenas,
      criterios_seleccion: this.metCriterios,
      proceso_cribado: this.metProceso
    };

    Swal.fire({ title: 'Guardando…', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });
    const { error } = await this.authService.saveSectionDraft({
      id_detalles_revision: this.reviewId,
      metodologia: JSON.stringify(json)
    });
    Swal.close();

    if (error) {
      Swal.fire('Error', 'No se pudo guardar la metodología.', 'error');
    } else {
      this.metodologiaSaved = true;
      this.metDirty = false;
      Swal.fire('Guardado', 'Borrador de metodología almacenado.', 'success');
    }
  }

  // Generar metodología con IA
  async generateMetodologiaWithIA(): Promise<void> {
    this.metDirty = false;
    this.loadingMetodologia = true;
    Swal.fire({
      title: 'Generando metodología...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    try {
      // 1) Traer el contexto desde tu función PL/pgSQL
      const { data: ctxArr, error: ctxErr } = await this.authService.getIAContext(+this.reviewId);
      if (ctxErr || !ctxArr?.length) {
        throw new Error('No se pudo cargar el contexto para IA');
      }
      const ctx = ctxArr[0];

      // 2) Construir el payload con TODO lo que tu controlador espera
      const payload = {
        titulo_revision: ctx.titulo_revision,
        objetivo: ctx.objetivo,
        tipo_revision: ctx.tipo_revision,
        frameworks: ctx.frameworks,
        keywords: ctx.keywords,
        global_search: ctx.global_search,
        per_base_search: ctx.per_base_search,
        bibliografias: ctx.bibliografias,
        inclusion_criteria: ctx.inclusion_criteria,
        exclusion_criteria: ctx.exclusion_criteria
      };

      // 3) Llamar a la API de Metodología
      this.openAiService.generateMetodologia(payload).subscribe({
        next: (met) => {
          Swal.close();
          // parsear el JSON que venga
          this.assignMetodologia(met);
          this.metDirty = true;
        },
        error: (err) => {
          Swal.close();
          console.error('Error IA metodología:', err);
          Swal.fire('Error', 'No se pudo generar la metodología con IA.', 'error');
        },
        complete: () => this.loadingMetodologia = false
      });

    } catch (err) {
      Swal.close();
      console.error(err);
      Swal.fire('Error', 'No se pudo preparar el contexto de IA.', 'error');
      this.loadingMetodologia = false;
    }
  }

  private assignMetodologia(obj: any) {
    this.metEnfoque = obj.enfoque_metodologico;
    this.metFases = obj.fases_prisma;
    this.metProcedimiento = obj.procedimiento_busqueda;
    this.metTablaPicos = obj.tabla_picos;
    this.metAnalisisCadena = obj.analisis_cadena_busqueda;
    this.metCadenaGlobal = obj.cadena_busqueda_global;
    this.metIntroBases = obj.introduccion_bases_datos;
    this.metTablaBases = obj.tabla_bases_datos;
    this.metTablaCadenas = obj.tabla_cadenas_busqueda;
    this.metCriterios = obj.criterios_seleccion;
    this.metProceso = obj.proceso_cribado;
    this.metodologiaSaved = false;

    const raw = obj.criterios_seleccion as string;
    const withBreaks = raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .join('<br/>');
    this.metCriterios = this.sanitizer.bypassSecurityTrustHtml(withBreaks);

    this.metodologiaSaved = false;
  }

  // 2) Valorar la sección de metodología
  async rateMetodologia(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadmetodologia: value
      });
      if (error) throw error;
      this.ratingMetodologia = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración metodología:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  // Métodos de copia
  copyMetEnfoque() {
    navigator.clipboard.writeText(this.stripHtml(this.metEnfoque)).then(() => {
      this.isMetEnfoqueCopied = true;
      setTimeout(() => this.isMetEnfoqueCopied = false, 2000);
    });
  }
  copyMetFases() {
    navigator.clipboard.writeText(this.stripHtml(this.metFases)).then(() => {
      this.isMetFasesCopied = true;
      setTimeout(() => this.isMetFasesCopied = false, 2000);
    });
  }
  copyMetProcedimiento() {
    navigator.clipboard.writeText(this.stripHtml(this.metProcedimiento)).then(() => {
      this.isMetProcedimientoCopied = true;
      setTimeout(() => this.isMetProcedimientoCopied = false, 2000);
    });
  }
  onMetEnfoqueInput(e: Event) {
    this.metEnfoque = (e.target as HTMLElement).innerText;
    this.metodologiaSaved = false;
  }
  onMetFasesInput(e: Event) {
    this.metFases = (e.target as HTMLElement).innerText;
    this.metodologiaSaved = false;
  }
  onMetProcedimientoInput(e: Event) {
    this.metProcedimiento = (e.target as HTMLElement).innerText;
    this.metodologiaSaved = false;
  }
  onMetProcesoInput(event: Event) {
    this.metProceso = (event.target as HTMLElement).innerText;
    this.metodologiaSaved = false;
  }
  copyMetTablaPicos() {
    navigator.clipboard.writeText(this.stripHtml(this.metTablaPicos)).then(() => {
      this.isMetTablaPicosCopied = true;
      setTimeout(() => this.isMetTablaPicosCopied = false, 2000);
    });
  }
  copyMetAnalisisCadena() {
    navigator.clipboard.writeText(this.stripHtml(this.metAnalisisCadena)).then(() => {
      this.isMetAnalisisCadenaCopied = true;
      setTimeout(() => this.isMetAnalisisCadenaCopied = false, 2000);
    });
  }
  copyMetCadenaGlobal() {
    navigator.clipboard.writeText(this.stripHtml(this.metCadenaGlobal)).then(() => {
      this.isMetCadenaGlobalCopied = true;
      setTimeout(() => this.isMetCadenaGlobalCopied = false, 2000);
    });
  }
  copyMetIntroBases() {
    navigator.clipboard.writeText(this.stripHtml(this.metIntroBases)).then(() => {
      this.isMetIntroBasesCopied = true;
      setTimeout(() => this.isMetIntroBasesCopied = false, 2000);
    });
  }
  copyMetTablaBases() {
    navigator.clipboard.writeText(this.stripHtml(this.metTablaBases)).then(() => {
      this.isMetTablaBasesCopied = true;
      setTimeout(() => this.isMetTablaBasesCopied = false, 2000);
    });
  }
  copyMetTablaCadenas() {
    navigator.clipboard.writeText(this.stripHtml(this.metTablaCadenas)).then(() => {
      this.isMetTablaCadenasCopied = true;
      setTimeout(() => this.isMetTablaCadenasCopied = false, 2000);
    });
  }
  copyMetCriterios() {
    navigator.clipboard.writeText(this.stripHtml(this.metCriterios.toString())).then(() => {
      this.isMetCriteriosCopied = true;
      setTimeout(() => this.isMetCriteriosCopied = false, 2000);
    });
  }
  copyMetProceso() {
    navigator.clipboard.writeText(this.stripHtml(this.metProceso)).then(() => {
      this.isMetProcesoCopied = true;
      setTimeout(() => this.isMetProcesoCopied = false, 2000);
    });
  }

  // ------------------------------------------------ SECCIÓN RESULTADOS

  // 1. Método para generar resultados con IA
  async generateResultadosWithIA(): Promise<void> {
    this.resultadosSaved = false;
    Swal.fire({
      title: 'Generando resultados...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    try {
      // A) Carga studies_data y extraction_data como ya tenías
      const { data: studiesData, error: studiesError } =
        await this.authService.getEstudiosByRevision(+this.reviewId);
      if (studiesError) throw new Error('No studies');
      const studiesArr = (studiesData || []).map(s => ({
        id_estudios: s.id_estudios,
        status: s.estado,
        titulo: s.titulo
      }));

      const { data: extractionData, error: extractionError } =
        await this.authService.getExtractionResponsesByRevision(+this.reviewId);
      if (extractionError) throw new Error('No responses');

      const payload = {
        studies_data: studiesArr,
        extraction_data: extractionData
      };

      console.log('Payload para generar Resultados:', payload);

      // B) Llamada IA
      const res = await this.openAiService.generateResultados(payload).toPromise();
      console.log('Respuesta IA:', res);

      // C) Reparte la respuesta
      this.assignResultados(res);

      Swal.close();
      this.resultadosSaved = false;
    } catch (err) {
      Swal.close();
      console.error('Error generando resultados con IA:', err);
      Swal.fire('Error', 'No se pudo generar la sección de resultados con IA.', 'error');
    }
  }

  private assignResultados(obj: any) {
    // 1) Reflexión
    if (Array.isArray(obj.reflexion_inicial)) {
      this.reflexionInicial = obj.reflexion_inicial.join('\n\n');
    } else if (typeof obj.reflexion_inicial === 'string') {
      // cuando venga como string, lo asignamos directamente
      this.reflexionInicial = obj.reflexion_inicial;
    }
    this.reflexionSaved = true;

    // 2) Preguntas únicas
    this.preguntasList = Object.keys(obj).filter(k => k !== 'reflexion_inicial' && k !== 'referencias');

    // 3) Rellenar bloques de respuestas
    for (const pregunta of this.preguntasList) {
      const arr = Array.isArray(obj[pregunta]) ? obj[pregunta] : [];
      this.respuestasConcatenadas[pregunta] = arr.join('\n\n');
      this.respuestasSaved[pregunta] = true;
    }

    // 4) Referencias
    this.referenciasConcatenadas = Array.isArray(obj.referencias)
      ? obj.referencias.join('\n\n')
      : '';
    this.referenciasSaved = true;

    this.resultadosSaved = true;
  }

  onReflexionInput(event: Event) {
    const text = (event.target as HTMLElement).innerText.trim();
    this.reflexionInicial = text;
    this.reflexionSaved = false;
    this.resultadosSaved = false;
  }

  onRespuestasInput(pregunta: string, event: Event) {
    const text = (event.target as HTMLElement).innerText.trim();
    this.respuestasConcatenadas[pregunta] = text;
    this.respuestasSaved[pregunta] = false;
    this.resultadosSaved = false;
  }

  onReferenciasInput(event: Event) {
    const text = (event.target as HTMLElement).innerText.trim();
    this.referenciasConcatenadas = text;
    this.referenciasSaved = false;
    this.resultadosSaved = false;
  }

  // Al guardar, reconstruyes el JSON usando split por doble salto de línea
  async saveResultadosDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando resultados...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    const obj: any = {};
    obj.reflexion_inicial = this.reflexionInicial.split('\n\n').map(s => s.trim()).filter(s => s);
    for (const pregunta of this.preguntasList) {
      obj[pregunta] = this.respuestasConcatenadas[pregunta]
        .split('\n\n')
        .map(s => s.trim())
        .filter(s => s);
    }
    obj.referencias = this.referenciasConcatenadas
      .split('\n\n')
      .map(s => s.trim())
      .filter(s => s);

    const { error } = await this.authService.saveSectionDraft({
      id_detalles_revision: this.reviewId,
      resultados: JSON.stringify(obj)
    });

    Swal.close();
    if (error) {
      Swal.fire('Error', 'No se pudo guardar la sección de resultados.', 'error');
    } else {
      this.resultadosSaved = true;
      Swal.fire('Guardado', 'Borrador de Resultados almacenado.', 'success');
    }
  }

  /** 3) Valorar like/dislike y guardar en BD **/
  async rateResultados(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadresultados: value
      });
      if (error) throw error;
      this.ratingResultados = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración resultados:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  // 1) Copiar reflexión inicial
  copyReflexionText(): void {
    const text = this.stripHtml(this.reflexionInicial);
    navigator.clipboard.writeText(text).then(() => {
      this.isReflexionCopied = true;
      setTimeout(() => this.isReflexionCopied = false, 2000);
    });
  }

  // 2) Copiar respuesta de pregunta
  copyRespuestaText(pregunta: string): void {
    const text = this.stripHtml(this.respuestasConcatenadas[pregunta] || '');
    navigator.clipboard.writeText(text).then(() => {
      this.isRespuestaCopied[pregunta] = true;
      setTimeout(() => this.isRespuestaCopied[pregunta] = false, 2000);
    });
  }

  // 3) Copiar referencias de resultados
  copyReferenciasResultados(): void {
    const text = this.stripHtml(this.referenciasConcatenadas);
    navigator.clipboard.writeText(text).then(() => {
      this.isReferenciasResultadosCopied = true;
      setTimeout(() => this.isReferenciasResultadosCopied = false, 2000);
    });
  }

  // ------------------------------------------------ SECCIÓN DISCUSIÓN

  // 1) Construye el payload y llama al endpoint de keywords de discusión
  generateDiscussionKeywordsWithIA(): void {
    this.loadingKeywordsDiscusion = true;
    this.discusionSaved = false;   // invalidamos guardado anterior
    Swal.fire({
      title: 'Generando keywords…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    // Preparamos tu payload:
    const reflexionArr = this.reflexionInicial
      .split('\n\n').map(p => p.trim()).filter(p => p);
    const referenciasArr = this.referenciasDiscusionText
      .split('\n\n').map(r => r.trim()).filter(r => r);

    const payload: any = {
      reflexion_inicial: reflexionArr,
      referencias: referenciasArr
    };
    for (const pregunta of this.preguntasList) {
      payload[pregunta] = (this.respuestasConcatenadas[pregunta] || '')
        .split('\n\n').map(r => r.trim()).filter(r => r);
    }

    // Llamada al servicio
    this.openAiService.generatediscussionKeywords(payload).subscribe({
      next: ({ keywords }) => {
        this.keywordsDiscusionText = keywords;
        this.isKeywordsDiscusionCopied = false;
        Swal.close();
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudieron generar palabras clave', 'error');
      },
      complete: () => {
        this.loadingKeywordsDiscusion = false;
      }
    });
  }

  // Handler de edición inline
  onKeywordsDiscusionInput(event: Event): void {
    this.keywordsDiscusionText = (event.target as HTMLElement).textContent?.trim() || '';
    this.discusionSaved = false;
  }

  // Copiar al portapapeles
  copyKeywordsDiscusion(): void {
    navigator.clipboard
      .writeText(this.keywordsDiscusionText)
      .then(() => {
        this.isKeywordsDiscusionCopied = true;
        setTimeout(() => this.isKeywordsDiscusionCopied = false, 2000);
      });
  }

  // 2) Generar DISCUSIÓN
  async generateDiscussionWithIA(): Promise<void> {
    this.loadingDiscusion = true;
    this.discusionSaved = false;
    Swal.fire({
      title: 'Generando discusión…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null)
    });

    try {
      // 1) Preparar arrays a partir del HTML editado
      const reflexionArr = this.reflexionInicial
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p);
      const referenciasArr = this.referenciasDiscusionText
        .split('<br><br>')
        .map(r => r.trim())
        .filter(r => r);

      // 2) Construir payload
      const payload: any = {
        reflexion_inicial: reflexionArr,
        referencias: referenciasArr,
        keywords: this.keywordsDiscusionText
      };
      for (const pregunta of this.preguntasList) {
        payload[pregunta] = (this.respuestasConcatenadas[pregunta] || '')
          .split('\n\n')
          .map(r => r.trim())
          .filter(r => r);
      }

      // 3) Llamar al backend
      const res: any = await this.openAiService.generateDiscussion(payload).toPromise();

      // 4) Inyectar HTML con <br><br> y referencias concatenadas
      this.discusionText = res.discusion;  // ya viene con <br><br>
      this.referenciasDiscusionText = Array.isArray(res.referencias)
        ? res.referencias.join('')        // cada elemento incluye su <br>
        : '';

      // 5) Reset flags
      this.isDiscusionCopied = false;
      this.isReferenciasDiscusionCopied = false;
      this.discusionSaved = false;
      Swal.close();

    } catch {
      Swal.close();
      Swal.fire('Error', 'No se pudo generar discusión', 'error');
    } finally {
      this.loadingDiscusion = false;
    }
  }

  onDiscusionInput(event: Event): void {
    this.discusionText = (event.target as HTMLElement).innerText.trim();
    this.discusionSaved = false;
  }

  onReferenciasdiscusionInput(event: Event): void {
    this.referenciasDiscusionText = (event.target as HTMLElement).innerText;
    this.discusionSaved = false;
  }

  copyDiscusionText(): void {
    const text = this.stripHtml(this.discusionText);
    navigator.clipboard.writeText(text).then(() => this.isDiscusionCopied = true);
  }

  copyReferenciasDiscusionText(): void {
    const text = this.stripHtml(this.referenciasDiscusionText);
    navigator.clipboard.writeText(text).then(() => this.isReferenciasDiscusionCopied = true);
  }

  // 3) Guardar discusión (simétrico a trabajos relacionados)
  async saveDiscussionDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando discusión…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    // Preparamos el objeto completo
    const jsonData = {
      keywords: this.keywordsDiscusionText,
      discusion: this.discusionText,
      referencias: this.referenciasDiscusionText
    };

    const payload = {
      id_detalles_revision: this.reviewId,
      discusion: JSON.stringify(jsonData)
    };

    const { error } = await this.authService.saveSectionDraft(payload);

    Swal.close();

    if (error) {
      Swal.fire('Error', 'No se pudo guardar discusión', 'error');
    } else {
      this.discusionSaved = true;
      Swal.fire('Guardado', 'Discusión almacenada', 'success');
    }
  }

  /** 3) Valorar like/dislike y guardar en BD **/
  async rateDiscusion(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidaddiscusion: value
      });
      if (error) throw error;
      this.ratingDiscusion = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración discusión:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  // ------------------------------------------------ SECCIÓN LIMITACIONES

  /** Genera la sección de Limitaciones llamando a tu backend */
  async generateLimitacionesWithIA(): Promise<void> {
    this.limitacionesSaved = false;
    this.loadingLimitaciones = true;
    Swal.fire({
      title: 'Generando limitaciones…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null)
    });

    try {
      // 1) Armar el objeto de "methodological_issues" con los campos ya separados
      const methodological_issues = {
        enfoque_metodologico: this.metEnfoque,
        fases_prisma: this.metFases,
        procedimiento_busqueda: this.metProcedimiento,
        tabla_picos: this.metTablaPicos,
        analisis_cadena_busqueda: this.metAnalisisCadena,
        cadena_busqueda_global: this.metCadenaGlobal,
        introduccion_bases_datos: this.metIntroBases,
        tabla_bases_datos: this.metTablaBases,
        tabla_cadenas_busqueda: this.metTablaCadenas,
        criterios_seleccion: this.metCriterios,
        proceso_cribado: this.metProceso
      };

      // 2) Armar "search_limitations" basado en tus resultados cargados
      const search_limitations = {
        reflexion_inicial: this.reflexionInicial.split('\n\n'),
        preguntas: this.preguntasList.reduce((acc, pregunta) => {
          acc[pregunta] = this.respuestasConcatenadas[pregunta].split('\n\n');
          return acc;
        }, {} as Record<string, string[]>),
        referencias: this.referenciasConcatenadas.split('\n\n')
      };

      const payload = { methodological_issues, search_limitations };
      console.log('Payload para Limitaciones:', payload);

      // 3) Llamada al servicio
      const res = await this.openAiService.generateLimitaciones(payload).toPromise();

      // 4) Renderizamos el HTML (convertimos dobles saltos en <br><br>)
      this.limitacionesText = res.limitaciones.replace(/\n\n/g, '<br><br>');
      this.limitacionesSaved = false;  // Acaba de generarse, aún no guardado

      Swal.close();
    } catch (err) {
      Swal.close();
      console.error('Error generando limitaciones:', err);
      Swal.fire('Error', 'No se pudo generar la sección de limitaciones.', 'error');
    } finally {
      this.loadingLimitaciones = false;
    }
  }

  /** Guarda el borrador de Limitaciones */
  async saveLimitacionesDraft(): Promise<void> {
    Swal.fire({ title: 'Guardando limitaciones…', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        limitaciones: this.limitacionesText
      });
      Swal.close();
      if (error) throw error;
      this.limitacionesSaved = true;
      Swal.fire('Guardado', 'Borrador de Limitaciones almacenado.', 'success');
    } catch {
      Swal.fire('Error', 'No se pudo guardar la sección de limitaciones.', 'error');
    }
  }

  /** Valorar like/dislike y guardar calidadlimitaciones **/
  async rateLimitaciones(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadlimitaciones: value
      });
      if (error) throw error;
      this.ratingLimitaciones = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración limitaciones:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  copyLimitacionesText(): void {
    const text = this.stripHtml(this.limitacionesText);
    navigator.clipboard.writeText(text)
      .then(() => {
        this.isLimitacionesCopied = true;
        setTimeout(() => this.isLimitacionesCopied = false, 2000);
      });
  }

  // ------------------------------------------------ SECCIÓN CONCLUSIONES

  // 1. Generar Conclusión con IA
  async generateConclusionsWithIA(): Promise<void> {
    this.conclusionSaved = false;
    this.loadingConclusions = true;
    Swal.fire({ title: 'Generando conclusiones...', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });

    try {
      // Arreglo de resultados
      const resultsArr = {
        reflexion_inicial: this.reflexionInicial.split('\n\n').filter(r => r.trim()),
        preguntas: this.preguntasList.reduce((acc, pregunta) => {
          acc[pregunta] = (this.respuestasConcatenadas[pregunta] || '')
            .split('\n\n')
            .filter(r => r.trim());
          return acc;
        }, {} as Record<string, string[]>),
        referencias: this.referenciasConcatenadas.split('\n\n').filter(r => r.trim())
      };

      // Arreglo de discusión
      const discussionArr = this.discusionText
        .replace(/<br><br>/g, '\n\n')
        .split('\n\n')
        .filter(r => r.trim());

      // Payload final
      const payload = {
        results_summary: resultsArr,
        discussion_summary: discussionArr,
        objective: this.reviewData.objetivo || 'No hay objetivo definido.',
        research_questions: this.questions.map(q => q.value)
      };

      console.log('Payload Conclusiones:', payload);

      const res = await this.openAiService.generateConclusion(payload).toPromise();

      this.conclusionText = res.conclusiones.replace(/\n\n/g, '<br><br>');
      Swal.fire({ icon: 'success', title: 'Conclusiones generadas', timer: 2000, showConfirmButton: false });
    } catch (err) {
      console.error('Error generando conclusiones con IA:', err);
      Swal.fire('Error', 'No se pudieron generar las conclusiones.', 'error');
    } finally {
      this.loadingConclusions = false;
      this.conclusionSaved = false;
    }
  }

  // 2. Guardar borrador de Conclusión
  async saveConclusionDraft(): Promise<void> {
    Swal.fire({ title: 'Guardando conclusiones...', allowOutsideClick: false, didOpen: () => Swal.showLoading(Swal.getConfirmButton()) });
    const payload = {
      id_detalles_revision: this.reviewId,
      conclusion: JSON.stringify({
        conclusiones: this.conclusionText.split('<br><br>').join('\n\n')
      })
    };
    const { error } = await this.authService.saveSectionDraft(payload);
    Swal.close();
    if (error) {
      Swal.fire('Error', 'No se pudo guardar las conclusiones.', 'error');
    } else {
      this.conclusionSaved = true;
      Swal.fire('Guardado', 'Conclusiones almacenadas.', 'success');
    }
  }

  async rateConclusion(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadconclusion: value
      });
      if (error) throw error;
      this.ratingConclusion = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración conclusiones:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  onConclusionInput(event: Event): void {
    this.conclusionText = (event.target as HTMLElement).innerHTML;
    this.conclusionSaved = false;
  }

  copyConclusionText(): void {
    const text = this.stripHtml(this.conclusionText);
    navigator.clipboard.writeText(text).then(() => {
      this.isConclusionCopied = true;
      setTimeout(() => this.isConclusionCopied = false, 2000);
    });
  }

  // ------------------------------------------------ SECCIÓN INTRODUCCIÓN

  // 1) Generar keywords de introducción con payload extendido
  generateIntroKeywordsWithIA(): void {
    this.loadingIntroKeywords = true;
    this.introSaved = false;

    Swal.fire({
      title: 'Generando keywords de introducción…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    // 1. Preparar sections
    const methodological_issues = {
      enfoque_metodologico: this.metEnfoque,
      fases_prisma: this.metFases,
      procedimiento_busqueda: this.metProcedimiento,
      tabla_picos: this.metTablaPicos,
      analisis_cadena_busqueda: this.metAnalisisCadena,
      cadena_busqueda_global: this.metCadenaGlobal,
      introduccion_bases_datos: this.metIntroBases,
      tabla_bases_datos: this.metTablaBases,
      tabla_cadenas_busqueda: this.metTablaCadenas,
      criterios_seleccion: this.metCriterios,
      proceso_cribado: this.metProceso
    };

    const resultsArr: any = {
      reflexion_inicial: this.reflexionInicial
        .split('\n\n').filter(r => r.trim()),
      preguntas: this.preguntasList.reduce((acc, pregunta) => {
        acc[pregunta] = (this.respuestasConcatenadas[pregunta] || '')
          .split('\n\n').filter(r => r.trim());
        return acc;
      }, {} as Record<string, string[]>),
      referencias: this.referenciasConcatenadas
        .split('\n\n').filter(r => r.trim())
    };

    const discussionArr = this.discusionText
      .replace(/<br><br>/g, '\n\n')
      .split('\n\n')
      .filter(r => r.trim());

    const researchQuestions = this.questions.map(q => q.value);

    const payload = {
      title: this.reviewData.titulo_revision,
      description: this.reviewData.descripcion || '',
      objective: this.reviewData.objetivo,
      methodology: methodological_issues,
      results_summary: resultsArr,
      discussion_summary: discussionArr,
      conclusions: this.conclusionText.replace(/<br><br>/g, '\n\n'),
      research_questions: researchQuestions
    };

    // Llamada al nuevo endpoint
    this.openAiService.generateIntroductionKeywords(payload).subscribe({
      next: ({ keywords }) => {
        this.keywordsIntroText = keywords;
        this.isKeywordsIntroCopied = false;
        Swal.close();
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudieron generar keywords', 'error');
      },
      complete: () => this.loadingIntroKeywords = false
    });
  }

  // 2) Handler de input para las keywords
  onKeywordsIntroInput(event: Event): void {
    this.keywordsIntroText = (event.target as HTMLElement).textContent?.trim() || '';
    this.introSaved = false;
  }

  // 3) Copiar keywords al portapapeles
  copyKeywordsIntro(): void {
    navigator.clipboard.writeText(this.keywordsIntroText)
      .then(() => {
        this.isKeywordsIntroCopied = true;
        setTimeout(() => this.isKeywordsIntroCopied = false, 2000);
      });
  }

  // 2) Generar introducción con IA usando payload completo
  async generateIntroductionWithIA(): Promise<void> {
    if (!this.keywordsIntroText) {
      Swal.fire('Atención', 'Primero genera las keywords', 'warning');
      return;
    }

    this.loadingIntro = true;
    this.introSaved = false;
    this.introRefsSaved = false;

    Swal.fire({
      title: 'Generando introducción...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    const methodological_issues = {
      enfoque_metodologico: this.metEnfoque,
      fases_prisma: this.metFases,
      procedimiento_busqueda: this.metProcedimiento,
      tabla_picos: this.metTablaPicos,
      analisis_cadena_busqueda: this.metAnalisisCadena,
      cadena_busqueda_global: this.metCadenaGlobal,
      introduccion_bases_datos: this.metIntroBases,
      tabla_bases_datos: this.metTablaBases,
      tabla_cadenas_busqueda: this.metTablaCadenas,
      criterios_seleccion: this.metCriterios,
      proceso_cribado: this.metProceso
    };

    const resultsArr = {
      reflexion_inicial: this.reflexionInicial
        .split('<br><br>').map(p => p.trim()).filter(p => p),
      preguntas: this.preguntasList.reduce((acc, pregunta) => {
        acc[pregunta] = this.respuestasConcatenadas[pregunta]
          .split('<br><br>').map(r => r.trim()).filter(r => r);
        return acc;
      }, {} as Record<string, string[]>),
      referencias: this.referenciasConcatenadas
        .split('<br><br>').map(r => r.trim()).filter(r => r)
    };

    const discussionArr = this.discusionText
      .split('<br><br>').map(r => r.trim()).filter(r => r);

    const researchQuestions = this.questions.map(q => q.value);

    const payload = {
      title: this.reviewData.titulo_revision || '',
      description: this.reviewData.descripcion || '',  // <-- añadido
      objective: this.reviewData.objetivo || '',
      methodology: methodological_issues,
      results_summary: resultsArr,
      discussion_summary: discussionArr,
      conclusions: this.conclusionText.replace(/<br><br>/g, '<br><br>'),
      research_questions: researchQuestions,
      keywords: this.keywordsIntroText
    };

    this.openAiService.generateIntroduction(payload).subscribe({
      next: res => {
        Swal.close();
        this.introText = res.introduction.replace(/\n\n/g, '<br><br>');
        this.introRefsText = Array.isArray(res.references)
          ? res.references.map((r: string) => `<p>${r}</p>`).join('')
          : (res.references as string).replace(/\n\n/g, '<br><br>');
      },
      error: () => {
        Swal.close();
        Swal.fire('Error', 'No se pudo generar la introducción', 'error');
      },
      complete: () => this.loadingIntro = false
    });
  }

  // 5) Handler de edición de la introducción
  onIntroInput(event: Event): void {
    this.introText = (event.target as HTMLElement).innerHTML;
    this.introSaved = false;
  }

  // 6) Handler de edición de las referencias de introducción
  onIntroRefsInput(event: Event): void {
    this.introRefsText = (event.target as HTMLElement).innerHTML;
    this.introRefsSaved = false;
  }

  // 7) Copiar cuerpo de introducción
  copyIntroText(): void {
    const text = this.stripHtml(this.introText);
    navigator.clipboard.writeText(text).then(() => this.isIntroCopied = true);
  }

  // 8) Copiar referencias de introducción
  copyIntroRefsText(): void {
    const text = this.stripHtml(this.introRefsText);
    navigator.clipboard.writeText(text).then(() => this.isIntroRefsCopied = true);
  }

  // 9) Guardar borrador de introducción (todo en un JSON)
  async saveIntroductionDraft(): Promise<void> {
    Swal.fire({
      title: 'Guardando introducción…',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(Swal.getConfirmButton())
    });

    // 1) Empaquetamos las tres partes en un objeto
    const jsonData = {
      keywords: this.keywordsIntroText,
      introText: this.introText,
      references: this.introRefsText
    };

    // 2) Lo stringifyamos y enviamos como un solo campo
    const payload = {
      id_detalles_revision: this.reviewId,
      introduccion: JSON.stringify(jsonData)
    };

    const { error } = await this.authService.saveSectionDraft(payload);

    Swal.close();
    if (error) {
      Swal.fire('Error', 'No se pudo guardar', 'error');
    } else {
      this.introSaved = true;
      this.introRefsSaved = true;
      Swal.fire('Guardado', 'Borrador almacenado', 'success');
    }
  }

  async rateIntroduction(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadintroduccion: value
      });
      if (error) throw error;
      this.ratingIntroduction = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración introducción:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  // ------------------------------------------------ SECCIÓN RESUMEN

  // 1. Generar Resumen con IA
  async generateResumenWithIA(): Promise<void> {
    // 1. Pedimos al usuario la cantidad de palabras
    const { value: wordCount } = await Swal.fire<number>({
      title: '¿Cuántas palabras debe tener el resumen?',
      input: 'number',
      inputLabel: 'Número de palabras',
      inputAttributes: {
        min: '50',
        step: '1'
      },
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || Number(value) < 1) {
          return 'Por favor ingresa un número válido de palabras.';
        }
        return null;
      }
    });

    if (!wordCount) {
      return; // el usuario canceló o no ingresó nada válido
    }

    this.resumenSaved = false;
    this.loadingResumen = true;
    Swal.fire({
      title: `Generando resumen (${wordCount} palabras)...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(null)
    });

    try {
      const methodological_issues = {
        enfoque_metodologico: this.metEnfoque,
        fases_prisma: this.metFases,
        procedimiento_busqueda: this.metProcedimiento,
        tabla_picos: this.metTablaPicos,
        analisis_cadena_busqueda: this.metAnalisisCadena,
        cadena_busqueda_global: this.metCadenaGlobal,
        introduccion_bases_datos: this.metIntroBases,
        tabla_bases_datos: this.metTablaBases,
        tabla_cadenas_busqueda: this.metTablaCadenas,
        criterios_seleccion: this.metCriterios,
        proceso_cribado: this.metProceso
      };

      const resultsArr = {
        reflexion_inicial: this.reflexionInicial
          .split('\n\n').filter(r => r.trim()),
        preguntas: this.preguntasList.reduce((acc, pregunta) => {
          acc[pregunta] = (this.respuestasConcatenadas[pregunta] || '')
            .split('\n\n').filter(r => r.trim());
          return acc;
        }, {} as Record<string, string[]>),
        referencias: this.referenciasConcatenadas
          .split('\n\n').filter(r => r.trim())
      };

      const discussionArr = this.discusionText
        .replace(/<br><br>/g, '\n\n')
        .split('\n\n')
        .filter(r => r.trim());

      const payload = {
        title: this.reviewData.titulo_revision,
        objective: this.reviewData.objetivo,
        methodology: methodological_issues,
        results_summary: resultsArr,
        discussion_summary: discussionArr,
        conclusions: this.conclusionText.replace(/<br><br>/g, '\n\n'),
        word_count: wordCount  // <-- aquí el número ingresado
      };

      console.log('Payload Resumen:', payload);

      const res = await this.openAiService.generateResumen(payload).toPromise();

      this.resumenText = res.resumen.replace(/\n\n/g, '<br><br>');
      this.resumenSaved = false;
      Swal.close();
      Swal.fire({ icon: 'success', title: 'Resumen generado', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.close();
      console.error('Error generando resumen:', err);
      Swal.fire('Error', 'No se pudo generar el resumen.', 'error');
    } finally {
      this.loadingResumen = false;
    }
  }

  // 2. Guardar borrador de Referencias
  async saveResumenDraft(): Promise<void> {
    this.loadingResumen = true;
    Swal.fire({ title: 'Guardando resumen…', allowOutsideClick: false, didOpen: () => Swal.showLoading(null) });
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        resumen: this.resumenText
      });
      if (error) throw error;
      this.resumenSaved = true;
      Swal.fire({ icon: 'success', title: 'Resumen guardado', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error('Error guardando resumen:', err);
      Swal.fire('Error', 'No se pudo guardar el resumen.', 'error');
    } finally {
      Swal.close();
      this.loadingResumen = false;
    }
  }

  onResumenInput(evt: Event) {
    const el = evt.target as HTMLElement;
    this.resumenText = el.innerHTML || '';
    this.resumenSaved = false;
  }

  async rateResumen(like: boolean): Promise<void> {
    const value = like ? '1' : '0';
    try {
      const { error } = await this.authService.saveSectionDraft({
        id_detalles_revision: this.reviewId,
        calidadresumen: value
      });
      if (error) throw error;
      this.ratingResumen = like ? 1 : 0;
    } catch (err) {
      console.error('Error guardando valoración resumen:', err);
      Swal.fire('Error', 'No se pudo guardar tu valoración', 'error');
    }
  }

  copyResumenText(): void {
    const text = this.stripHtml(this.resumenText);
    navigator.clipboard.writeText(text).then(() => {
      this.isResumenCopied = true;
      setTimeout(() => this.isResumenCopied = false, 2000);
    });
  }

  // ------------------------------------------------ SECCIÓN DOCX

  // Función para generar y subir el DOCX
  async downloadDraftWord(): Promise<void> {
    try {
      // 0) Confirmación
      const { isConfirmed } = await Swal.fire({
        title: '¿Descargo la imagen del diagrama de flujo de Prisma de la sección siguiente?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
      });

      let diagramData: ArrayBuffer | null = null;

      if (isConfirmed) {
        // 1) Pedir fichero de imagen
        const { value: file } = await Swal.fire({
          title: 'Selecciona la imagen del Diagrama de Flujo Prisma',
          input: 'file',
          inputAttributes: { accept: 'image/*' }
        });

        if ((file as File)?.size) {
          diagramData = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file as File);
          });
        }
      }

      // 3) Construcción del documento
      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              run: { font: "Times New Roman", size: 24, bold: true },
              paragraph: { spacing: { line: 480 } },
            },
            {
              id: "NormalBody",
              name: "Body Text",
              run: { font: "Times New Roman", size: 24 },
              paragraph: { spacing: { line: 480 } },
            },
            {
              id: "SubHeading",
              name: "Subheading",
              run: { font: "Times New Roman", size: 24, bold: true },
              paragraph: { spacing: { line: 480 } },
            },
          ],
        },
        sections: [
          {
            properties: {
              page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
            },
            children: [
              // === METADATOS DEL ARTÍCULO ===
              new Paragraph({
                text: this.reviewData.titulo_revision,
                style: "Heading1"
              }),
              new Paragraph({
                text: `Autor: ${this.userData.nombre} ${this.userData.apellido}`,
                style: "NormalBody"
              }),
              new Paragraph({
                text: `Email: ${this.userData.correo_electronico}`,
                style: "NormalBody"
              }),
              new Paragraph({
                text: `ORCID: ${this.userData.orcid}`,
                style: "NormalBody"
              }),
              new Paragraph({
                text: `Institución: ${this.userData.institucion}`,
                style: "NormalBody"
              }),
              new Paragraph({
                text: `País: ${this.userData.pais}`,
                style: "NormalBody"
              }),
              // un pequeño espacio antes del contenido
              new Paragraph({ text: "" }),

              // — Resumen —
              new Paragraph({ text: "Resumen", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.resumenText),

              // --- Introducción (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Introducción", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.introText),
              new Paragraph({ text: "Referencias Introducción", style: "SubHeading" }),
              ...this.parseHtmlToNodes(this.introRefsText),

              // --- Trabajos Relacionados (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Trabajos Relacionados", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.trabajosText),
              new Paragraph({ text: "Referencias Trabajos Relacionados", style: "SubHeading" }),
              ...this.parseHtmlToNodes(this.trabajosRefsText),

              // --- Metodología (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Metodología", style: "Heading1" }),

              // 1) Enfoque metodológico
              ...this.parseHtmlToNodes(this.metEnfoque),
              ...this.parseHtmlToNodes(this.metFases),
              ...this.parseHtmlToNodes(this.metProcedimiento),
              ...this.parseHtmlToNodes("Tabla del Framework Utilizado"),
              ...this.parseHtmlToNodes(this.metTablaPicos),
              ...this.parseHtmlToNodes(this.metAnalisisCadena),
              ...this.parseHtmlToNodes(this.metCadenaGlobal),
              ...this.parseHtmlToNodes(this.metIntroBases),
              ...this.parseHtmlToNodes("Tabla de bases de datos"),
              ...this.parseHtmlToNodes(this.metTablaBases),
              ...this.parseHtmlToNodes("Tabla de cadenas por base"),
              ...this.parseHtmlToNodes(this.metTablaCadenas),
              ...this.parseHtmlToNodes(this.metCriterios.toString()),
              ...this.parseHtmlToNodes(this.metProceso),

              // --- Diagrama de Flujo Prisma ---
              ...(diagramData
                ? [
                  new Paragraph({ text: "Diagrama de Flujo Prisma", style: "SubHeading" }),
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: diagramData,
                        transformation: { width: 600, height: 400 },
                        type: 'png'
                      })
                    ]
                  })
                ]
                : this.parseHtmlToNodes(
                  "Añada el Diagrama de Flujo Prisma que esta en la aplicación"
                )
              ),

              // --- Resultados (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Resultados", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.reflexionInicial),
              // cada pregunta como subtítulo
              ...this.preguntasList.flatMap((preg) => [
                new Paragraph({ text: preg, style: "SubHeading" }),
                ...this.parseHtmlToNodes(this.respuestasConcatenadas[preg] || ""),
              ]),
              new Paragraph({ text: "Referencias Resultados", style: "SubHeading" }),
              ...this.parseHtmlToNodes(this.referenciasConcatenadas),

              // --- Discusión (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Discusión", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.discusionText),
              new Paragraph({ text: "Referencias Discusión", style: "SubHeading" }),
              ...this.parseHtmlToNodes(this.referenciasDiscusionText),

              // --- Limitaciones (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Limitaciones", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.limitacionesText),

              // --- Conclusión (nueva página) ---
              new Paragraph({ text: "", pageBreakBefore: true }),
              new Paragraph({ text: "Conclusión", style: "Heading1" }),
              ...this.parseHtmlToNodes(this.conclusionText),
            ],
          },
        ],
      });

      // 4) Generar blob y subir
      const blob = await Packer.toBlob(doc);
      const uploadResult = await this.authService.uploadInformeDocx(blob, this.reviewId);
      if (!uploadResult) throw new Error("No se pudo subir DOCX");
      const { publicUrl, fileName } = uploadResult;
      const fecha = new Date().toISOString();
      const { error: dbErr } = await this.authService.insertInformeGenerado(
        this.reviewId,
        fileName,
        publicUrl,
        fecha
      );
      if (dbErr) throw dbErr;

      Swal.fire({
        icon: "success",
        title: "Informe generado",
        text: "Referencias agrupadas por sección y al final.",
        timer: 2000,
        showConfirmButton: false,
      });

      await this.loadInformesGenerados();

    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo generar el DOCX.", "error");
    }
  }

  /**
   * Helper que parsea tu HTML con <br><br> y <table> a nodos de docx.
   */
  private parseHtmlToNodes(html: string): (Paragraph | Table)[] {
    const container = document.createElement("div");
    container.innerHTML = html;
    const out: (Paragraph | Table)[] = [];

    for (const node of Array.from(container.childNodes)) {
      if (node.nodeName === "TABLE") {
        const tbl = node as HTMLTableElement;

        // Crear filas y celdas con diseño
        const rows = Array.from(tbl.rows).map((row, rowIndex) =>
          new TableRow({
            children: Array.from(row.cells).map(cell =>
              new TableCell({
                width: {
                  size: 100 / row.cells.length,
                  type: WidthType.PERCENTAGE,
                },
                shading: {
                  type: ShadingType.CLEAR,
                  color: "auto",
                  fill: rowIndex === 0 ? "D3D3D3" : "FFFFFF",  // gris claro para encabezado
                },
                children: this.parseHtmlToNodes(cell.innerHTML) as Paragraph[],
              })
            ),
          })
        );

        out.push(
          new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.AUTOFIT,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
          })
        );
      } else {
        const text = node.textContent?.trim() || "";
        text
          .split(/\n{2,}|<br\s*\/?>\s*<br\s*\/?>/)
          .map(l => l.trim())
          .filter(l => l)
          .forEach(line =>
            out.push(
              new Paragraph({
                text: line,
                style: "NormalBody",
              })
            )
          );
      }
    }

    return out;
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
}
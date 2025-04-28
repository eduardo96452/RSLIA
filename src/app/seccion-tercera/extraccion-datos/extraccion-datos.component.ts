// extraccion-datos.component.ts
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import Swal from 'sweetalert2';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-extraccion-datos',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ScrollingModule],
  templateUrl: './extraccion-datos.component.html',
  styleUrls: ['./extraccion-datos.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtraccionDatosComponent implements OnInit {
  /* ──────────────────── propiedades de UI ─────────────────── */
  isLargeScreen = true;
  filter: 'all' | 'done' | 'pending' = 'all';
  qualityFilter = '';

  /* ──────────────────── datos de la revisión ───────────────── */
  reviewId!: string;
  reviewData: any = {};
  userData: any = null;

  /* ──────────────────── puntuaciones / filtros ─────────────── */
  puntuacionLimite = 0;

  /* ──────────────────── estudios y extracción ──────────────── */
  acceptedStudiesThreshold: any[] = [];
  extractionFields: any[] = [];
  extractionData: { [studyId: string]: { [fieldId: string]: any } } = {};

  /* ──────────────────── loaders ─────────────────────────────── */
  studiesReady = false; // estudios + campos
  dataLoaded = false;   // respuestas

  /* ──────────────────── tooltip ─────────────────────────────── */
  showScoresHelp = false;

  /* ──────────────────── control de scroll virtual ──────────── */
  trackByStudy = (_: number, s: any) => s.id_estudios;
  trackByField = (_: number, f: any) => f.id_campo_extraccion;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private openAiService: OpenAiService,
    private cd: ChangeDetectorRef
  ) {}

  /* ──────────────────── ciclo de vida ───────────────────────── */
  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];

    // Carga ligera en segundo plano
    this.loadReviewData();
    this.loadUserData();

    // ── PAR 1: estudios y campos en paralelo ──
    const [studiesRes, fieldsRes] = await Promise.all([
      this.authService.getAcceptedStudie(this.reviewId),
      this.authService.getExtractionFields(this.reviewId),
    ]);

    this.acceptedStudiesThreshold = studiesRes.data || [];
    this.extractionFields = fieldsRes.data || [];

    // Límite (viene repetido en cada fila, así que tomo el primero)
    if (this.acceptedStudiesThreshold.length > 0) {
      this.puntuacionLimite = this.acceptedStudiesThreshold[0].limite;
    }

    // Inicializa mapa de respuestas
    this.acceptedStudiesThreshold.forEach((s) => {
      this.extractionData[s.id_estudios] = {};
      this.extractionFields.forEach((f) => {
        this.extractionData[s.id_estudios][f.id_campo_extraccion] = '';
      });
    });

    this.studiesReady = true;
    this.cd.markForCheck(); // dispara render temprano

    // ── PAR 2: respuestas guardadas ──
    await this.loadExistingExtractionData();
    this.dataLoaded = true;
    this.cd.markForCheck();
  }

  /* ──────────────────── responsive ─────────────────────────── */
  @HostListener('window:resize')
  onResize(): void {
    this.isLargeScreen = window.innerWidth >= 768;
    this.cd.markForCheck();
  }

  /* ──────────────────── helpers de carga ───────────────────── */
  private async loadReviewData() {
    try {
      this.reviewData = await this.authService.getReviewById(this.reviewId);
      this.cd.markForCheck();
    } catch (e) {
      console.error('Error review', e);
    }
  }

  private async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
      this.cd.markForCheck();
    } catch (e) {
      console.error('Error user', e);
    }
  }

  /* ──────────────────── filtros en tabla ───────────────────── */
  setFilter(f: 'all' | 'done' | 'pending') {
    this.filter = f;
  }

  getFilteredStudies() {
    let studies = this.acceptedStudiesThreshold;

    if (this.filter === 'done') studies = studies.filter((s) => s.done);
    else if (this.filter === 'pending')
      studies = studies.filter((s) => !s.done);

    if (this.qualityFilter === 'superior') {
      studies = studies.filter((s) => s.total_peso > this.puntuacionLimite);
    } else if (this.qualityFilter === 'menorIgual') {
      studies = studies.filter((s) => s.total_peso <= this.puntuacionLimite);
    }
    return studies;
  }

  /* ──────────────────── estado done ────────────────────────── */
  toggleStudyDone(study: any) {
    const newDone = !study.done;
    this.authService
      .updateExtractionStatusForStudy(study.id_estudios, newDone)
      .then(() => {
        study.done = newDone;
        this.cd.markForCheck();
      })
      .catch((err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
      });
  }

  /* ──────────────────── respuestas existentes ─────────────── */
  private async loadExistingExtractionData() {
    const ids = this.acceptedStudiesThreshold.map((s) => s.id_estudios);
    const { data, error } =
      await this.authService.getExtractionResponsesForStudies(ids);
    if (error) return console.error(error);

    data.forEach((resp: any) => {
      const val =
        resp.valor?.toString().toLowerCase() === 'true'
          ? true
          : resp.valor?.toString().toLowerCase() === 'false'
          ? false
          : resp.valor;
      this.extractionData[resp.id_estudios][resp.id_campo_extraccion] = val;
      const st = this.acceptedStudiesThreshold.find(
        (s) => s.id_estudios === resp.id_estudios
      );
      if (st) 
        {
          st.hasSaved        = true;
          st.extractionSaved = true;

      }
    });

    
    this.cd.markForCheck();
  }

  /* ──────────────────── guardado de extracción ─────────────── */
  private prepareExtractionResponses(study: any) {
    return this.extractionFields.map((f) => ({
      id_estudios: study.id_estudios,
      id_campo_extraccion: f.id_campo_extraccion,
      valor: this.extractionData[study.id_estudios][f.id_campo_extraccion],
      done: study.done,
    }));
  }

  async saveExtractionData(study: any): Promise<void> {
    const { error } = await this.authService.saveExtractionResponses(
      this.prepareExtractionResponses(study)
    );
  
    if (error) {
      console.error('Error al guardar respuestas de extracción:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un error al guardar las respuestas. Vuelve a intentarlo.',
      });
      return;                     // ← devuelve void; todas las rutas devuelven
    }
  
    await Swal.fire({
      icon: 'success',
      title: '¡Guardado!',
      text: 'Datos de extracción guardados con éxito.',
      timer: 2000,
      showConfirmButton: false,
    });
  
    study.hasSaved        = true;
    study.extractionSaved = true;
    this.cd.markForCheck();
  }

  async updateExtractionData(study: any): Promise<void> {
    const { error } = await this.authService.saveExtractionResponses(
      this.prepareExtractionResponses(study)
    );
  
    if (error) {
      console.error('Error al actualizar respuestas de extracción:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un error al actualizar las respuestas.',
      });
      return;
    }
  
    await Swal.fire({
      icon: 'success',
      title: '¡Actualizado!',
      text: 'Datos de extracción actualizados.',
      timer: 2000,
      showConfirmButton: false,
    });
  
    study.hasSaved       = true;
    study.extractionSaved = true;
    this.cd.markForCheck();
  }

  updateBooleanField(
    val: boolean,
    studyId: number,
    fieldId: number,
    study: any
  ) {
    this.extractionData[studyId][fieldId] = val;
    study.extractionSaved = false;
  }



  // Exportar datos a Excel
  exportToExcel(): void {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Extracción');

    const columns = ['Articulo', ...this.extractionFields.map(f => f.descripcion)];

    // Título unificado
    const titleRow = worksheet.addRow(['Uso de Inteligencia Artificial para Diagnóstico Médico Basado en Imágenes']);
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Fila en blanco
    worksheet.addRow([]);

    // Encabezados
    const headerRow = worksheet.addRow(columns);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Datos de cada estudio
    this.getFilteredStudies().forEach(study => {
      const rowValues: any[] = [study.titulo];
      this.extractionFields.forEach(field => {
        let answer = this.extractionData[study.id_estudios][field.id_campo_extraccion] || '';
        if (typeof answer === 'boolean') {
          answer = answer ? 'Sí' : 'No';
        }
        rowValues.push(answer);
      });
      worksheet.addRow(rowValues);
    });

    // Ajustar ancho de columnas y habilitar wrapText
    worksheet.columns?.forEach((col, index) => {
      col.width = index === 0 ? 40 : 30;
    });
    worksheet.eachRow(row => {
      row.eachCell(cell => {
        cell.alignment = { ...cell.alignment, wrapText: true };
      });
    });

    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Mi_Revision_Extraccion.xlsx');
    }).catch(err => console.error('Error al generar Excel:', err));
  }

  // Generar sugerencias de IA para un solo estudio
  async generateAISuggestionsForStudy(study: any) {
    if (!study.url_pdf_articulo) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin URL',
        text: 'El estudio no tiene una URL de PDF asociada.'
      });
      return;
    }

    const questionsPayload = this.extractionFields.map(field => ({
      pregunta: field.descripcion,
      tipoRespuesta: field.tipo
    }));

    const payload = { url: study.url_pdf_articulo, questions: questionsPayload };

    Swal.fire({
      title: 'Generando sugerencias de IA...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      const response = await this.openAiService.generateExtractionSuggestions(payload).toPromise();
      Swal.close();

      if (response && Array.isArray(response.suggestions)) {
        response.suggestions.forEach((suggestion: any, index: number) => {
          this.extractionData[study.id_estudios][this.extractionFields[index].id_campo_extraccion] = suggestion.answer;
        });
        Swal.fire({
          icon: 'success',
          title: 'Sugerencias generadas',
          text: 'Las respuestas sugeridas se han asignado a las preguntas correspondientes.',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Sin sugerencias',
          text: 'No se generaron sugerencias de IA para este estudio.'
        });
      }
    } catch (error) {
      console.error('Error al generar sugerencias de IA:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al generar las sugerencias de IA.'
      });
    }
  }

  // Generar sugerencias de IA para todos los estudios
  async generateAISuggestions() {
    // Filtrar estudios que estén sin responder (no marcados como 'done')
    const studiesSinResponder = this.acceptedStudiesThreshold.filter(
      study => !study.done
    );
  
    // Verificar que todos los estudios sin responder tengan un PDF
    const studiesMissingPDF = studiesSinResponder.filter(
      study => !study.url_pdf_articulo || !study.url_pdf_articulo.trim()
    );
    if (studiesMissingPDF.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Artículos incompletos',
        text: 'Debe subir el PDF de todos los artículos sin responder antes de generar las sugerencias de IA.'
      });
      return;
    }
  
    Swal.fire({
      title: 'Generando sugerencias para estudios sin responder...',
      text: 'Por favor, espere un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });
  
    try {
      const suggestionsPromises = studiesSinResponder.map(study => {
        const questionsPayload = this.extractionFields.map(field => ({
          pregunta: field.descripcion,
          tipoRespuesta: field.tipo
        }));
        const payload = { url: study.url_pdf_articulo, questions: questionsPayload };
        return this.openAiService.generateExtractionSuggestions(payload).toPromise()
          .then(response => ({
            studyId: study.id_estudios,
            suggestions: response.suggestions
          }))
          .catch(err => {
            console.error('Error generando sugerencias para estudio:', study.id_estudios, err);
            return { studyId: study.id_estudios, suggestions: [] };
          });
      });
  
      const results = await Promise.all(suggestionsPromises);
      results.forEach(result => {
        if (this.extractionData[result.studyId]) {
          // Asegurarse de que suggestions es un arreglo
          const suggestionsArray = Array.isArray(result.suggestions)
            ? result.suggestions
            : result.suggestions ? [result.suggestions] : [];
            
          suggestionsArray.forEach((suggestion: any, index: number) => {
            const fieldId = this.extractionFields[index].id_campo_extraccion;
            this.extractionData[result.studyId][fieldId] = suggestion.answer;
          });
        }
      });
      
  
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencias generadas',
        text: 'Se han generado las sugerencias de IA para todos los estudios sin responder.',
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error en generación de sugerencias de IA:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al generar las sugerencias de IA.'
      });
    }
  }
  

  get allStudiesHavePdf(): boolean {
    return this.acceptedStudiesThreshold?.every(study =>
      study.url_pdf_articulo && study.url_pdf_articulo.trim().length > 0
    );
  }

  /* ========================================================================
   *  UTILIDADES
   * ====================================================================== */
  isGenerateAISuggestionsDisabled(): boolean {
    return !this.acceptedStudiesThreshold.some(
      (s) => s.url_pdf_articulo?.trim() && !s.done
    );
  }

}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import Swal from 'sweetalert2';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-extraccion-datos',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './extraccion-datos.component.html',
  styleUrls: ['./extraccion-datos.component.css']
})
export class ExtraccionDatosComponent implements OnInit {
  reviewId!: string;
  reviewData: any = {};
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  userData: any = null;
  isLargeScreen: boolean = true;
  acceptedStudiesThreshold: any[] = [];
  extractionFields: any[] = [];
  extractionData: { [studyId: string]: { [fieldId: string]: any } } = {};
  // Variable de filtro: 'all' | 'done' | 'pending'
  filter: 'all' | 'done' | 'pending' = 'all';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService
  ) {}

  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    await Promise.all([
      this.loadReviewData(),
      this.loadUserData()
    ]);

    // Obtener estudios aceptados
    const { data: studiesData, error: studiesError } =
      await this.authService.getAcceptedStudiesAboveLimit(this.reviewId);
    if (studiesError) {
      console.error('Error:', studiesError);
      return;
    }
    this.acceptedStudiesThreshold = studiesData || [];

    // Obtener campos de extracción
    const { data: fieldsData, error: fieldsError } =
      await this.authService.getExtractionFields(this.reviewId);
    if (fieldsError) {
      console.error('Error:', fieldsError);
      return;
    }
    this.extractionFields = fieldsData || [];

    // Inicializar extractionData para cada estudio y campo
    this.acceptedStudiesThreshold.forEach(study => {
      this.extractionData[study.id_estudios] = {};
      this.extractionFields.forEach(field => {
        this.extractionData[study.id_estudios][field.id_campo_extraccion] = '';
      });
    });

    // Obtener estado 'done' para cada estudio
    const studyIds = this.acceptedStudiesThreshold.map(s => s.id_estudios);
    const statusMap = await this.authService.getExtractionStatusForStudies(studyIds);
    this.acceptedStudiesThreshold.forEach(study => {
      study.done = !!statusMap[study.id_estudios];
    });

    // Cargar datos de extracción ya guardados
    await this.loadExistingExtractionData();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768;
  }

  // Cargar datos de la reseña
  async loadReviewData() {
    try {
      const reviewData = await this.authService.getReviewById(this.reviewId);
      if (reviewData) {
        this.reviewData = reviewData;
        this.titulo_revision = reviewData.titulo_revision || '';
        this.tipo_revision = reviewData.tipo_revision || '';
        this.descripcion = reviewData.descripcion || '';
      }
    } catch (error) {
      console.error('Error al cargar la reseña:', error);
    }
  }

  // Cargar datos del usuario
  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }

  // Establecer filtro
  setFilter(newFilter: 'all' | 'done' | 'pending'): void {
    this.filter = newFilter;
  }

  // Retorna estudios filtrados
  getFilteredStudies(): any[] {
    if (this.filter === 'done') {
      return this.acceptedStudiesThreshold.filter(study => study.done);
    } else if (this.filter === 'pending') {
      return this.acceptedStudiesThreshold.filter(study => !study.done);
    }
    return this.acceptedStudiesThreshold;
  }

  toggleStudyDone(study: any): void {
    study.done = !study.done;
    console.log('Estado de "hecho" actualizado:', study.done);
  }

  // Cargar respuestas de extracción ya guardadas
  async loadExistingExtractionData() {
    const studyIds = this.acceptedStudiesThreshold.map(s => s.id_estudios);
    const { data, error } = await this.authService.getExtractionResponsesForStudies(studyIds);
    if (error) {
      console.error('Error al obtener respuestas de extracción:', error);
      return;
    }
    data.forEach((response: any) => {
      if (this.extractionData[response.id_estudios]) {
        let valor: any = response.valor;
        if (typeof valor === 'string') {
          if (valor.toUpperCase() === 'TRUE') {
            valor = true;
          } else if (valor.toUpperCase() === 'FALSE') {
            valor = false;
          }
        }
        this.extractionData[response.id_estudios][response.id_campo_extraccion] = valor;
        const study = this.acceptedStudiesThreshold.find(s => s.id_estudios === response.id_estudios);
        if (study) {
          study.extractionSaved = true;
        }
      }
    });
  }

  // Función para preparar respuestas de extracción
  private prepareExtractionResponses(study: any): any[] {
    return this.extractionFields.map(field => ({
      id_estudios: study.id_estudios,
      id_campo_extraccion: field.id_campo_extraccion,
      valor: this.extractionData[study.id_estudios][field.id_campo_extraccion],
      done: study.done
    }));
  }

  // Guardar datos de extracción para un estudio
  async saveExtractionData(study: any) {
    const responsesToSave = this.prepareExtractionResponses(study);
    const { data, error } = await this.authService.saveExtractionResponses(responsesToSave);
    if (error) {
      console.error('Error al guardar respuestas de extracción:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un error al guardar las respuestas de extracción. Por favor, inténtalo de nuevo.'
      });
    } else {
      console.log('Respuestas de extracción guardadas:', data);
      Swal.fire({
        icon: 'success',
        title: '¡Guardado!',
        text: 'Datos de extracción guardados con éxito para: ' + study.titulo,
        timer: 3000,
        showConfirmButton: false
      });
      study.extractionSaved = true;
      study.done = false;
    }
  }

  // Actualizar datos de extracción para un estudio
  async updateExtractionData(study: any) {
    const responsesToSave = this.prepareExtractionResponses(study);
    const { data, error } = await this.authService.saveExtractionResponses(responsesToSave);
    if (error) {
      console.error('Error al actualizar respuestas de extracción:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un error al actualizar las respuestas de extracción. Por favor, inténtalo de nuevo.'
      });
    } else {
      console.log('Respuestas de extracción actualizadas:', data);
      Swal.fire({
        icon: 'success',
        title: '¡Actualizado!',
        text: 'Datos de extracción actualizados para: ' + study.titulo,
        timer: 3000,
        showConfirmButton: false
      });
      study.done = false;
    }
  }

  // Actualizar campo booleano
  updateBooleanField(value: boolean, studyId: string | number, fieldId: string | number, study: any): void {
    if (!this.extractionData[studyId]) {
      this.extractionData[studyId] = {};
    }
    this.extractionData[studyId][fieldId] = value;
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
    const studiesMissingPDF = this.acceptedStudiesThreshold.filter(
      study => !study.url_pdf_articulo || !study.url_pdf_articulo.trim()
    );
    if (studiesMissingPDF.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Artículos incompletos',
        text: 'Debe subir el PDF de todos los artículos antes de generar las sugerencias de IA.'
      });
      return;
    }

    Swal.fire({
      title: 'Generando sugerencias para todos los estudios...',
      text: 'Por favor, espere un momento.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading(Swal.getConfirmButton());
      }
    });

    try {
      const suggestionsPromises = this.acceptedStudiesThreshold.map(study => {
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
          result.suggestions.forEach((suggestion: any, index: number) => {
            const fieldId = this.extractionFields[index].id_campo_extraccion;
            this.extractionData[result.studyId][fieldId] = suggestion.answer;
          });
        }
      });

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Sugerencias generadas',
        text: 'Se han generado las sugerencias de IA para todos los estudios.',
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

  isGenerateAISuggestionsDisabled(): boolean {
    return this.acceptedStudiesThreshold.some(study => !study.url_pdf_articulo || !study.url_pdf_articulo.trim());
  }
}

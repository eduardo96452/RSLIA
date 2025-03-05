import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
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
  styleUrl: './extraccion-datos.component.css'
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
  ) { }


  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.loadReviewData();
    this.loadUserData();
    const { data: studiesData, error: studiesError } =
      await this.authService.getAcceptedStudiesAboveLimit(this.reviewId);
    if (studiesError) {
      console.error('Error:', studiesError);
      return;
    }
    this.acceptedStudiesThreshold = studiesData || [];

    // 2. Obtener campos de extracción
    const { data: fieldsData, error: fieldsError } =
      await this.authService.getExtractionFields(this.reviewId);
    if (fieldsError) {
      console.error('Error:', fieldsError);
      return;
    }
    this.extractionFields = fieldsData || [];

    // 3. Inicializar extractionData
    this.acceptedStudiesThreshold.forEach(study => {
      this.extractionData[study.id_estudios] = {};
      this.extractionFields.forEach(field => {
        this.extractionData[study.id_estudios][field.id_campo_extraccion] = '';
      });
    });

    // 4. Obtener el estado 'done' para cada estudio
    const studyIds = this.acceptedStudiesThreshold.map(s => s.id_estudios);
    const statusMap = await this.authService.getExtractionStatusForStudies(studyIds);
    this.acceptedStudiesThreshold.forEach(study => {
      // Si no hay registro en el statusMap, se considera false
      study.done = !!statusMap[study.id_estudios];
    });

    // 5. Cargar los valores guardados en la base de datos y rellenar los inputs
    await this.loadExistingExtractionData();
  }


  @HostListener('window:resize', ['$event'])
  onResize(): void {
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

  // Método para establecer el filtro
  setFilter(newFilter: 'all' | 'done' | 'pending'): void {
    this.filter = newFilter;
  }

  // Método que devuelve los estudios filtrados según la opción elegida
  getFilteredStudies(): any[] {
    if (this.filter === 'done') {
      return this.acceptedStudiesThreshold.filter(study => study.done);
    } else if (this.filter === 'pending') {
      return this.acceptedStudiesThreshold.filter(study => !study.done);
    } else {
      return this.acceptedStudiesThreshold;
    }
  }

  toggleStudyDone(study: any): void {
    // Alterna el estado "done" del estudio
    study.done = !study.done;
    // Aquí puedes agregar lógica adicional, como actualizar el backend o emitir algún evento
    console.log('Estado de "hecho" actualizado:', study.done);
  }

  // Método para obtener y asignar los valores guardados en la BD
  async loadExistingExtractionData() {
    const studyIds = this.acceptedStudiesThreshold.map(s => s.id_estudios);
    const { data, error } = await this.authService.getExtractionResponsesForStudies(studyIds);
    if (error) {
      console.error('Error al obtener respuestas de extracción:', error);
      return;
    }
    // Para cada respuesta, asignamos el valor correspondiente en extractionData
    data.forEach((response: any) => {
      if (this.extractionData[response.id_estudios]) {
        // Convertir "TRUE" y "FALSE" (cadenas) a booleanos
        let valor: any = response.valor;
        if (typeof valor === 'string') {
          if (valor.toUpperCase() === 'TRUE') {
            valor = true;
          } else if (valor.toUpperCase() === 'FALSE') {
            valor = false;
          }
        }
        this.extractionData[response.id_estudios][response.id_campo_extraccion] = valor;

        // Marcar que este estudio ya tiene respuestas guardadas
        const study = this.acceptedStudiesThreshold.find(s => s.id_estudios === response.id_estudios);
        if (study) {
          study.extractionSaved = true;
        }
      }
    });
  }

  // Guardar la extracción para un estudio en particular
  async saveExtractionData(study: any) {
    // Preparar el array de respuestas para guardar en la base de datos
    const responsesToSave = [];
    for (const field of this.extractionFields) {
      const valor = this.extractionData[study.id_estudios][field.id_campo_extraccion];
      responsesToSave.push({
        id_estudios: study.id_estudios,
        id_campo_extraccion: field.id_campo_extraccion,
        valor: valor,
        done: study.done  // Guardamos el estado (true si marcado, false si no)
      });
    }

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
      // Una vez guardados, marcamos que se han guardado y restablecemos el estado done a false
      study.extractionSaved = true;
      study.done = false;
    }
  }

  async updateExtractionData(study: any) {
    // Similar a saveExtractionData, pero para actualizar los registros existentes
    // Aquí puedes utilizar la misma función de guardado si tu API utiliza upsert
    const responsesToSave = [];
    for (const field of this.extractionFields) {
      const valor = this.extractionData[study.id_estudios][field.id_campo_extraccion];
      responsesToSave.push({
        id_estudios: study.id_estudios,
        id_campo_extraccion: field.id_campo_extraccion,
        valor: valor,
        done: study.done
      });
    }

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
      // Opcional: aquí podrías reiniciar extractionSaved a false si se quiere reiniciar el proceso,
      // o mantenerlo true para que se muestre el botón de "Actualizar"
      // En este ejemplo, dejamos extractionSaved como true.
      study.done = false;
    }
  }

  updateBooleanField(
    value: boolean,
    studyId: string | number,
    fieldId: string | number,
    study: any
  ): void {
    // Actualiza la respuesta para el estudio y campo indicados
    if (!this.extractionData[studyId]) {
      this.extractionData[studyId] = {};
    }
    this.extractionData[studyId][fieldId] = value;
    // Marca que la extracción ya no está guardada
    study.extractionSaved = false;
  }

  // Función para exportar la información a Excel
  exportToExcel(): void {
    // 1. Crear un nuevo libro de trabajo
    const workbook = new Workbook();
    // 2. Agregar una hoja llamada "Extracción"
    const worksheet = workbook.addWorksheet('Extracción');

    // 3. Construir la lista de columnas (encabezados) para la tabla
    //    La primera columna será "Articulo" (o "Título del Estudio"),
    //    y las siguientes serán cada pregunta de extracción.
    const columns = ['Articulo', ...this.extractionFields.map(f => f.descripcion)];

    // 4. Agregar la primera fila con un TÍTULO unificado
    const titleRow = worksheet.addRow(['Uso de Inteligencia Artificial para Diagnóstico Médico Basado en Imágenes']);
    // Combinar celdas desde la A1 hasta la última columna
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // 5. Fila en blanco (fila 2 en Excel)
    worksheet.addRow([]);

    // 6. Fila de encabezados (fila 3 en Excel)
    const headerRow = worksheet.addRow(columns);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // 7. Agregar filas de datos para cada estudio
    this.getFilteredStudies().forEach(study => {
      const rowValues: any[] = [study.titulo];
      this.extractionFields.forEach(field => {
        let answer = this.extractionData[study.id_estudios][field.id_campo_extraccion] || '';
        // Si la respuesta es booleana, convertirla a texto
        if (typeof answer === 'boolean') {
          answer = answer ? 'Sí' : 'No';
        }
        rowValues.push(answer);
      });
      worksheet.addRow(rowValues);
    });

    // 8. Ajustar ancho de columnas (opcional)
    worksheet.columns?.forEach((col, index) => {
      col.width = index === 0 ? 40 : 30;
    });

    // 8.5. Configurar todas las celdas para que ajusten el texto (wrapText = true)
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { ...cell.alignment, wrapText: true };
      });
    });

    // 9. Generar el archivo Excel y descargarlo
    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Mi_Revision_Extraccion.xlsx'); // Nombre personalizado
    }).catch(err => console.error('Error al generar Excel:', err));
  }


  async generateAISuggestionsForStudy(study: any) {
    try {
      // Verifica que el estudio tenga URL de PDF
      if (!study.url_pdf_articulo) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin URL',
          text: 'El estudio no tiene una URL de PDF asociada.'
        });
        return;
      }

      // Construir el payload para la IA:
      // Se recorre el arreglo de extractionFields para obtener la descripción y el tipo de respuesta esperado.
      const questionsPayload = this.extractionFields.map(field => ({
        pregunta: field.descripcion,
        tipoRespuesta: field.tipo  // Ej.: "Texto", "Decimal", etc.
      }));

      const payload = {
        url: study.url_pdf_articulo,
        questions: questionsPayload
      };

      // Mostrar alerta de carga mientras se generan las sugerencias
      Swal.fire({
        title: 'Generando sugerencias de IA...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // Llamar al servicio para obtener las sugerencias
      const response = await this.openAiService.generateExtractionSuggestions(payload).toPromise();

      // Cerrar alerta de carga
      Swal.close();

      // Si se generaron sugerencias, se espera que el response contenga un arreglo "suggestions"
      if (response && response.suggestions && Array.isArray(response.suggestions)) {
        // Asigna cada sugerencia a la respuesta correspondiente en extractionData para ese estudio.
        response.suggestions.forEach((suggestion: any, index: number) => {
          // Suponemos que cada suggestion tiene una propiedad "answer"
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

  async generateAISuggestions() {
    try {
      // Verificar que TODOS los estudios tengan la URL de PDF
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

      // Mostrar alerta de carga mientras se generan las sugerencias
      Swal.fire({
        title: 'Generando sugerencias para todos los estudios...',
        text: 'Por favor, espere un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // Preparar y ejecutar las peticiones para cada estudio
      const suggestionsPromises = this.acceptedStudiesThreshold.map(study => {
        // Construir el payload para el estudio
        const questionsPayload = this.extractionFields.map(field => ({
          pregunta: field.descripcion,
          tipoRespuesta: field.tipo  // Por ejemplo: "Texto", "Decimal", etc.
        }));

        const payload = {
          url: study.url_pdf_articulo,
          questions: questionsPayload
        };

        // Llamar al servicio que genera sugerencias para ese estudio.
        return this.openAiService.generateExtractionSuggestions(payload).toPromise()
          .then(response => ({
            studyId: study.id_estudios,
            suggestions: response.suggestions  // Se espera que sea un arreglo
          }))
          .catch(err => {
            console.error('Error generando sugerencias para estudio:', study.id_estudios, err);
            return { studyId: study.id_estudios, suggestions: [] };
          });
      });

      // Esperar que se completen todas las peticiones
      const results = await Promise.all(suggestionsPromises);

      // Actualizar la variable de respuestas de extracción para cada estudio
      results.forEach(result => {
        if (this.extractionData[result.studyId]) {
          // Se asume que la cantidad y orden de las sugerencias corresponden a extractionFields
          result.suggestions.forEach((suggestion: any, index: number) => {
            // Actualiza la respuesta para el campo correspondiente en el estudio
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
    return this.acceptedStudiesThreshold && this.acceptedStudiesThreshold.every(study =>
      study.url_pdf_articulo && study.url_pdf_articulo.trim().length > 0
    );
  }

  isGenerateAISuggestionsDisabled(): boolean {
    return this.acceptedStudiesThreshold.some(study => !study.url_pdf_articulo || !study.url_pdf_articulo.trim());
  }

}

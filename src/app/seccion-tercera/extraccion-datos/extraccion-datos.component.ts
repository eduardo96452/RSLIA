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

  // Función para exportar la información a Excel
  exportToExcel(): void {
    // 1. Crear un nuevo libro de trabajo
    const workbook = new Workbook();
    // 2. Agregar una hoja llamada "Extracción"
    const worksheet = workbook.addWorksheet('Extracción');

    // 3. Construir la lista de columnas (encabezados) para la tabla
    //    La primera columna será "article" (o "Título del Estudio"),
    //    y las siguientes serán cada pregunta de extracción.
    const columns = ['Articulo', ...this.extractionFields.map(f => f.descripcion)];

    // 4. Agregar la primera fila con un TÍTULO unificado
    //    (fila 1 en Excel, índice 0 internamente)
    const titleRow = worksheet.addRow(['Uso de Inteligencia Artificial para Diagnóstico Médico Basado en Imágenes']);
    // Combinar celdas desde la A1 hasta la última columna
    worksheet.mergeCells(1, 1, 1, columns.length);
    // Estilos para la celda combinada
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // 5. Fila en blanco (fila 2 en Excel)
    worksheet.addRow([]);

    // 6. Fila de encabezados (fila 3 en Excel)
    const headerRow = worksheet.addRow(columns);
    // Estilos en negrita para cada celda de la fila de encabezados
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // 7. Agregar filas de datos para cada estudio
    //    Cada fila tiene:
    //      - Columna 1: study.titulo
    //      - Las siguientes columnas: 1..n => respuesta al campo i
    this.getFilteredStudies().forEach(study => {
      // Construimos un array con la primera posición = título
      const rowValues: any[] = [study.titulo];

      // Para cada pregunta, añadimos la respuesta
      this.extractionFields.forEach(field => {
        const answer = this.extractionData[study.id_estudios][field.id_campo_extraccion] || '';
        rowValues.push(answer);
      });

      // Agregamos la fila al worksheet
      worksheet.addRow(rowValues);
    });

    // 8. Ajustar ancho de columnas (opcional)
    //    Por ejemplo, ancho automático para cada columna
    worksheet.columns?.forEach((col, index) => {
      if (index === 0) {
        // Primera columna (article)
        col.width = 40;
      } else {
        col.width = 30;
      }
    });

    // 9. Generar el archivo Excel y descargarlo
    workbook.xlsx.writeBuffer().then((data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Mi_Revision_Extraccion.xlsx'); // Nombre personalizado
    }).catch(err => console.error('Error al generar Excel:', err));
  }

  generateAISuggestions(): void {
    // Aquí implementa la lógica para generar sugerencias de IA para cada estudio
    // Por ejemplo, podrías iterar sobre this.acceptedStudiesThreshold y enviar los títulos a un servicio de IA
    console.log("Generar sugerencia de IA para todos los artículos.");
    // Implementa la llamada a tu servicio de IA, muestra un SweetAlert o actualiza la interfaz según necesites.
  }
}

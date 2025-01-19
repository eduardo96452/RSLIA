import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { OpenAiService } from '../../../conexion/openAi.service';
import { Study } from '../../../auth/data-access/auth.service';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './estudios.component.html',
  styleUrl: './estudios.component.css'
})
export class EstudiosComponent implements OnInit {
  libraryName: string = '';
  importedData: { field: string; value: string }[] = [];
  tabs: string[] = ['Selección de estudios'];
  fileContent: string = '';
  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  importedStudies: Study[] = [];
  sortColumn: string = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  selectedStudy: Study | null = null;
  showEditModal = false;
  selectedStudiesCount = 0;
  allSelected = false;
  

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private openAiService: OpenAiService
  ) { }
  

  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.loadReviewData();
    this.loadUserData();
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

  scrollToTop() {
    // Desplazamiento suave hacia la parte superior
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Inicia el flujo para seleccionar .bib o .ris
   */
  async selectFileType() {
    try {
      const result = await Swal.fire({
        title: 'Seleccionar tipo de archivo',
        icon: 'info',
        input: 'radio',
        inputOptions: {
          'bib': '.bib',
          'ris': '.ris'
        },
        inputValidator: (value) => {
          if (!value) {
            return 'Por favor, selecciona el tipo de archivo.';
          }
          return null;
        },
        showCancelButton: true,
        confirmButtonText: 'Siguiente',
        cancelButtonText: 'Cancelar'
      });

      if (result.isConfirmed && result.value) {
        const fileType = result.value; // 'bib' o 'ris'
        this.askForDatabaseName(fileType);
      }
    } catch (err) {
      console.error('Error al seleccionar tipo de archivo:', err);
    }
  }

  /**
   * Pide el nombre de la base bibliográfica y luego el archivo
   */
  async askForDatabaseName(fileType: string) {
    try {
      const result = await Swal.fire({
        title: `Archivo ${fileType.toUpperCase()}`,
        text: '¿De qué base bibliográfica procede?',
        icon: 'question',
        input: 'text',
        inputPlaceholder: 'Ej. Scopus, Web of Science...',
        showCancelButton: true,
        confirmButtonText: 'Siguiente',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return '¡El nombre de la base no puede estar vacío!';
          }
          return null;
        }
      });

      if (result.isConfirmed && result.value) {
        const dbName = result.value.trim();
        this.uploadFile(fileType, dbName);
      }
    } catch (err) {
      console.error('Error al obtener nombre de la base:', err);
    }
  }

  /**
   * Solicita el archivo a cargar (según el tipo) y parsea su contenido
   */
  async uploadFile(fileType: string, dbName: string) {
    try {
      const result = await Swal.fire({
        title: `Cargar archivo ${fileType.toUpperCase()}`,
        html: `
          <input id="file-upload" type="file" class="form-control" accept=".${fileType}"/>
        `,
        showCancelButton: true,
        confirmButtonText: 'Importar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
          // Obtener la referencia al input de archivo
          const input: HTMLInputElement | null = document.querySelector('#file-upload');
          if (input && input.files && input.files.length > 0) {
            return input.files[0];
          } else {
            Swal.showValidationMessage('Por favor selecciona un archivo');
            return null;
          }
        }
      });

      if (result.isConfirmed && result.value) {
        const file = result.value as File;
        // Lógica para parsear el archivo
        this.parseFile(file, fileType, dbName);
      }
    } catch (err) {
      console.error('Error al cargar archivo:', err);
    }
  }

  /**
   * Paso 4: Parsear el archivo y agregar los estudios a la tabla
   */
  parseFile(file: File, fileType: string, dbName: string) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const fileContent = e.target.result as string;

      let newStudies: Study[] = [];
      if (fileType === 'bib') {
        newStudies = this.parseBib(fileContent, dbName);
      } else {
        newStudies = this.parseRis(fileContent, dbName);
      }

      // Agregar a la lista principal
      this.importedStudies.push(...newStudies);

      Swal.fire({
        icon: 'success',
        title: 'Importación exitosa',
        text: `Se han importado ${newStudies.length} estudios de ${dbName}.`
      });
    };

    reader.onerror = (err) => {
      console.error('Error al leer el archivo:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo leer el archivo.'
      });
    };

    reader.readAsText(file);
  }

  /**
   * Ejemplo simple de parseo para .bib
   * 
   * Supón que .bib está compuesto por entradas del estilo:
   * 
   * @article{example,
   *  author = {John Doe},
   *  title = {Sample Title},
   *  booktitle = {Sample Book},
   *  year = {2021},
   *  volume = {10},
   *  number = {2},
   *  pages = {100-110},
   *  keywords = {Bibtex, Example},
   *  doi = {10.1234/abc}
   * }
   */
  parseBib(content: string, dbName: string): Study[] {
    const entries: Study[] = [];
    // Dividir por cada entrada @article, @book, etc.
    const bibItems = content.split('@').slice(1); // elimina lo anterior al primer @

    for (const item of bibItems) {
      // Buscar campos por regex o line-by-line
      const lines = item.split('\n');

      // Crea un objeto Study (inicializado)
      const study: Study = {
        database: dbName,
        author: '',
        booktitle: '',
        title: '',
        year: '',
        volume: '',
        number: '',
        pages: '',
        keywords: '',
        doi: '',
        status: 'Sin clasificar'
      };

      for (let line of lines) {
        line = line.trim();
        if (line.startsWith('author')) {
          study.author = this.extractBibValue(line);
        } else if (line.startsWith('booktitle')) {
          study.booktitle = this.extractBibValue(line);
        } else if (line.startsWith('title')) {
          study.title = this.extractBibValue(line);
        } else if (line.startsWith('year')) {
          study.year = this.extractBibValue(line);
        } else if (line.startsWith('volume')) {
          study.volume = this.extractBibValue(line);
        } else if (line.startsWith('number')) {
          study.number = this.extractBibValue(line);
        } else if (line.startsWith('pages')) {
          study.pages = this.extractBibValue(line);
        } else if (line.startsWith('keywords')) {
          study.keywords = this.extractBibValue(line);
        } else if (line.startsWith('doi')) {
          study.doi = this.extractBibValue(line);
        }
      }
      entries.push(study);
    }
    return entries;
  }

  // Función auxiliar para extraer valores en .bib
  extractBibValue(line: string): string {
    // Por ejemplo: author = {John Doe},
    // Eliminamos "author" y "=", tomamos lo que está entre llaves
    // Este método es muy básico y no cubre todos los casos reales de .bib
    // Se puede refinar o usar librerías especializadas
    const regex = /=(.*)/;
    const match = line.match(regex);
    if (match && match[1]) {
      let val = match[1].trim();
      // Remover llaves y comas
      val = val.replace(/[{},]/g, '').trim();
      return val;
    }
    return '';
  }





  /**
   * Ejemplo simple de parseo para .ris
   *
   * Un .ris suele contener líneas de formato:
   * TY  - JOUR
   * AU  - Doe, John
   * TI  - Title
   * PY  - 2022
   * KW  - Example
   * ...
   * ER  - 
   *
   */
  parseRis(content: string, dbName: string): Study[] {
    const entries: Study[] = [];
    const lines = content.split('\n');

    // Objeto temporal para acumular datos
    let currentStudy: Study = this.emptyStudy(dbName);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('ER  -')) {
        // Fin de un registro
        entries.push({ ...currentStudy }); // push clon
        // Reiniciar
        currentStudy = this.emptyStudy(dbName);
      } else if (line.startsWith('AU  -')) {
        currentStudy.author += (currentStudy.author ? '; ' : '') + this.extractRisValue(line);
      } else if (line.startsWith('T1  -') || line.startsWith('TI  -')) {
        currentStudy.title = this.extractRisValue(line);
      } else if (line.startsWith('PY  -')) {
        currentStudy.year = this.extractRisValue(line);
      } else if (line.startsWith('KW  -')) {
        // keywords van creciendo (separadas por ;)
        currentStudy.keywords += (currentStudy.keywords ? '; ' : '') + this.extractRisValue(line);
      } else if (line.startsWith('JF  -') || line.startsWith('BT  -')) {
        // Se asume JF o BT como booktitle
        currentStudy.booktitle = this.extractRisValue(line);
      } else if (line.startsWith('VL  -')) {
        currentStudy.volume = this.extractRisValue(line);
      } else if (line.startsWith('IS  -')) {
        currentStudy.number = this.extractRisValue(line);
      } else if (line.startsWith('SP  -')) {
        // Páginas: asume que SP es Start Page
        currentStudy.pages = this.extractRisValue(line);
      } else if (line.startsWith('EP  -')) {
        // EP es End Page => concatenar
        const endPage = this.extractRisValue(line);
        if (currentStudy.pages) {
          currentStudy.pages += '-' + endPage;
        }
      } else if (line.startsWith('DO  -')) {
        currentStudy.doi = this.extractRisValue(line);
      }
    }

    // Por si el archivo no termina con "ER  -", no es estándar, pero se maneja
    if (this.hasData(currentStudy)) {
      entries.push({ ...currentStudy });
    }

    return entries;
  }

  // Crea un Study vacío con la base dada
  emptyStudy(dbName: string): Study {
    return {
      database: dbName,
      author: '',
      booktitle: '',
      title: '',
      year: '',
      volume: '',
      number: '',
      pages: '',
      keywords: '',
      doi: '',
      status: 'Sin clasificar'
    };
  }

  // Extraer el valor de una línea .ris del tipo "AU  - Doe, John"
  extractRisValue(line: string): string {
    // Split en '-' y tomar la parte derecha
    const parts = line.split('-');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return '';
  }

  // Chequea si un Study está vacío
  hasData(study: Study): boolean {
    return (
      study.author ||
      study.booktitle ||
      study.title ||
      study.year ||
      study.volume ||
      study.number ||
      study.pages ||
      study.keywords ||
      study.doi
    ) !== '';
  }

  sortStudies(column: string) {
    // 1. Si la columna que el usuario clicó es diferente a la actual, se setea esa columna y orden "asc".
    if (this.sortColumn !== column) {
      this.sortColumn = column;
      this.sortOrder = 'asc';
    } else {
      // 2. Si es la misma columna, alternamos el orden
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    }
  
    // 3. Aplicar el orden en this.importedStudies
    this.importedStudies.sort((a, b) => this.compareValues(a, b, this.sortColumn, this.sortOrder));
  }
  
  /**
   * compareValues: Método auxiliar para comparar dos estudios según la columna y el orden.
   */
  compareValues(a: any, b: any, column: string, order: 'asc' | 'desc'): number {
    const valueA = a[column] ?? '';
    const valueB = b[column] ?? '';
  
    // Asumimos que todos son strings, excepto 'year', 'volume', 'number', etc., 
    // si son numéricos, haz la conversión
    // Ejemplo: si la columna es 'year', parseamos a int:
    if (['year', 'volume', 'number'].includes(column)) {
      // Conviértelo a número
      const numA = parseFloat(valueA) || 0;
      const numB = parseFloat(valueB) || 0;
      if (numA < numB) return order === 'asc' ? -1 : 1;
      if (numA > numB) return order === 'asc' ? 1 : -1;
      return 0;
    } else {
      // Comparación como strings
      const strA = valueA.toLowerCase();
      const strB = valueB.toLowerCase();
  
      if (strA < strB) return order === 'asc' ? -1 : 1;
      if (strA > strB) return order === 'asc' ? 1 : -1;
      return 0;
    }
  }


  // (1) Abrir el modal (solo si no es la col. acción ni check)
  openEditModal(study: Study, event: MouseEvent) {
    // Chequear si target es un button o input => no abrir
    const targetElement = event.target as HTMLElement;
    // Podrías identificar la col. de acción por clase "btn" o "form-check-input"
    if (
      targetElement.tagName === 'BUTTON' ||
      targetElement.tagName === 'INPUT' ||
      targetElement.classList.contains('form-select') // si quisieras excluir el select
    ) {
      return; // no abrir modal
    }

    // Abrimos modal
    this.selectedStudy = { ...study }; 
    this.showEditModal = true;
  }

  // (2) Cerrar modal
  closeEditModal() {
    this.showEditModal = false;
    this.selectedStudy = null;
  }

  // (3) Guardar cambios => actualiza la fila en importedStudies
  saveStudyEdits() {
    if (!this.selectedStudy) return;

    // Busca la fila en importedStudies
    const index = this.importedStudies.findIndex(
      (s) => s.author === this.selectedStudy?.author && s.title === this.selectedStudy?.title
    );

    if (index !== -1) {
      this.importedStudies[index] = this.selectedStudy;
    }

    // Cerrar el modal
    this.showEditModal = false;
    this.selectedStudy = null;
  }

  // (4) Cerrar el modal si hace clic en el backdrop
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      // clic en el backdrop, cierra
      this.closeEditModal();
    }
  }

  // (5) Seleccionar/deseleccionar un estudio
  toggleSelection(study: Study, event: MouseEvent) {
    // No propaga click a la fila
    event.stopPropagation();

    // Cambia isSelected
    study.isSelected = !study.isSelected;

    // Actualiza el contador
    this.updateSelectedCount();
  }

  // (6) Seleccionar/deseleccionar todos
  toggleSelectAll(event: MouseEvent) {
    this.allSelected = !this.allSelected;

    this.importedStudies.forEach(s => s.isSelected = this.allSelected);
    this.updateSelectedCount();

    event.stopPropagation(); // Evita abrir modal
  }

  // Actualiza el conteo
  updateSelectedCount() {
    this.selectedStudiesCount = this.importedStudies.filter(s => s.isSelected).length;
  }
}
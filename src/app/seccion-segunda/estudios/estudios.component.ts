import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { format } from 'date-fns';
import { filter } from 'rxjs';
import { AuthService, BaseBibliografica, Estudio, Study } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import { DoiApiService } from '../../conexion/doiApi.service';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

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
  allDisplayedSelected = false;
  showEditModal = false;
  selectedStudiesCount = 0;
  allSelected = false;
  duplicatedCount: number = 0;
  filterStatus: string = 'all';
  filterDatabase: string = 'allDb';
  pdfFile: File | null = null; // variable para almacenar el archivo seleccionado
  originalStudy: any = null;
  showAddStudyModal = false; // Control del modal 2
  newStudy: any = {}; // Datos del nuevo estudio
  isLargeScreen: boolean = true;
  acceptedStudies: Estudio[] = [];
  qualityQuestions: any[] = [];
  qualityAnswers: any[] = [];
  openedStudy: Estudio | null = null;
  selectedAnswers: { [key: number]: number } = {};
  currentEvaluationSaved: boolean = false;

  criterios: any[] = [];
  inclusionCriterios: any[] = [];
  exclusionCriterios: any[] = [];
  selectedCriterioId: number | null = null;
  selectedCriterio: string = 'Seleccione un criterio';




  selectedEstudioId: number | null = null;


  basesList: BaseBibliografica[] = [];


  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private doiApiService: DoiApiService
  ) { }


  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.loadReviewData();
    this.loadUserData();
    await this.loadEstudiosForRevision();
    this.checkScreenSize();
    await this.loadAcceptedStudies();
    await this.loadPreguntas();
    await this.loadRespuestas();

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });
    await this.loadCriterios();

    this.basesList = await this.authService.loadBasesBibliograficas(this.reviewId);

    // Para cada estudio aceptado, cargamos la evaluación guardada (si existe)
    for (const study of this.acceptedStudies) {
      await this.loadEvaluationForStudy(study);
    }
  }

  ngAfterViewInit() {
    const headers = document.querySelectorAll('th');
    headers.forEach(header => {
      const resizer = header.querySelector('.resizer');
      if (!resizer) return;

      let startX: number;
      let startWidth: number;

      const onMouseMove = (e: Event) => {
        const mouseEvent = e as MouseEvent; // Convertir a MouseEvent
        const newWidth = startWidth + (mouseEvent.pageX - startX);
        header.style.width = newWidth + 'px';

        // Actualizar el <col> correspondiente en el <colgroup>
        const colIndex = Array.from(header.parentElement!.children).indexOf(header);
        const colGroup = header.closest('table')!.querySelector('colgroup');
        if (colGroup && colGroup.children[colIndex]) {
          (colGroup.children[colIndex] as HTMLElement).style.width = newWidth + 'px';
        }
      };

      const onMouseUp = (e: Event) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      resizer.addEventListener('mousedown', (e: Event) => {
        const mouseEvent = e as MouseEvent; // Convertir a MouseEvent
        startX = mouseEvent.pageX;
        startWidth = header.offsetWidth;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });
    });
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
      // 1) Asegúrate de tener la lista de bases
      // Si no la tienes, podrías cargarla aquí:
      // this.basesList = await this.authService.loadBasesBibliograficas(this.reviewId);

      // 2) Construir el objeto inputOptions para el select
      const inputOptions = this.basesList.reduce((obj, base) => {
        // la clave (key) será el id_base_bibliografica
        // el valor (value) será el nombre
        obj[base.id_base_bibliografica!] = base.nombre;
        return obj;
      }, {} as any);

      // 3) Mostrar SweetAlert2 con input tipo select
      const result = await Swal.fire({
        title: `Archivo ${fileType.toUpperCase()}`,
        text: '¿De qué base bibliográfica procede?',
        icon: 'question',
        input: 'select',
        inputOptions: inputOptions,
        inputPlaceholder: 'Seleccionar base bibliográfica',
        showCancelButton: true,
        confirmButtonText: 'Siguiente',
        cancelButtonText: 'Cancelar',
        // Aquí aplicamos una clase personalizada al input (tu select)
        customClass: {
          input: 'my-custom-select'
        },
        inputValidator: (value) => {
          // value es la key del objeto inputOptions: id_base_bibliografica
          if (!value) {
            return 'Debes seleccionar una opción.';
          }
          return null;
        }
      });

      // 4) Si el usuario confirma y elige una base
      if (result.isConfirmed && result.value) {
        const selectedId = Number(result.value);
        // Buscar la base seleccionada en el arreglo
        const selectedBase = this.basesList.find(b => b.id_base_bibliografica === selectedId);

        if (selectedBase) {
          // Puedes pasar el nombre (o la id, o ambos) a tu método uploadFile
          this.uploadFile(fileType, selectedBase.nombre);
          // O si prefieres: this.uploadFile(fileType, selectedBase.id_base_bibliografica + '');
        }
      }
    } catch (err) {
      console.error('Error al obtener base bibliográfica:', err);
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

      // Agregar los estudios parseados a la lista principal de importados
      this.importedStudies.push(...newStudies);

      // Guardar todos los estudios importados de una vez
      this.saveAllImportedStudies(newStudies);

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

  // Guarda en lote los estudios importados
  async saveAllImportedStudies(studies: Study[]) {
    this.duplicatedCount = 0; // Reinicia el conteo de duplicados

    for (const study of studies) {
      await this.saveImportedStudy(study);
    }

    if (this.duplicatedCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Artículos Duplicados',
        text: `${this.duplicatedCount} estudio(s) ya estaban en la BD y fueron marcados como "Duplicado".`
      }).then(() => {
        this.loadEstudiosForRevision();
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Importación exitosa',
        text: `Se han importado ${studies.length} estudios.`
      }).then(() => {
        this.loadEstudiosForRevision();
      });
    }
  }

  /**
 * Ejemplo de parseo para archivos .bib
 * Se asume que cada entrada en el .bib tiene un formato similar a:
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
 *  doi = {10.1234/abc},
 *  abstract = {This is an abstract.},
 *  ISSN = {1234-5678},
 *  month = {Jan}
 * }
 */
  parseBib(content: string, dbName: string): Study[] {
    const entries: Study[] = [];
    // Dividir el contenido en entradas; elimina lo anterior al primer '@'
    const bibItems = content.split('@').slice(1);

    for (const item of bibItems) {
      // Dividir cada entrada en líneas
      const lines = item.split('\n');

      // Crear objeto Study inicializado, incluyendo la propiedad "month"
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
        status: 'Sin clasificar',
        revista: '',
        author_keywords: '',
        bibtex_key: '',
        document_type: '',
        url: '',
        afiliacion: '',
        publisher: '',
        issn: '',
        language: '',
        comentario: '',
        resumen: ''
      };

      for (let line of lines) {
        line = line.trim();
        const lineLower = line.toLowerCase();
        if (lineLower.startsWith('author')) {
          study.author = this.extractBibValue(line);
        } else if (lineLower.startsWith('booktitle')) {
          study.booktitle = this.extractBibValue(line);
        } else if (lineLower.startsWith('title')) {
          study.title = this.extractBibValue(line);
        } else if (lineLower.startsWith('year')) {
          study.year = this.extractBibValue(line);
        } else if (lineLower.startsWith('volume')) {
          study.volume = this.extractBibValue(line);
        } else if (lineLower.startsWith('number')) {
          study.number = this.extractBibValue(line);
        } else if (lineLower.startsWith('pages')) {
          study.pages = this.extractBibValue(line);
        } else if (lineLower.startsWith('keywords')) {
          study.keywords = this.extractBibValue(line);
        } else if (lineLower.startsWith('doi')) {
          study.doi = this.extractBibValue(line);
        } else if (lineLower.startsWith('abstract')) {
          study.resumen = this.extractBibValue(line);
        } else if (lineLower.startsWith('issn')) {
          study.issn = this.extractBibValue(line);
        }
      }
      entries.push(study);
    }
    return entries;
  }

  // Función auxiliar para extraer el valor entre llaves o comillas
  extractBibValue(line: string): string {
    // Ejemplo: author = {John Doe},
    const regex = /=(.*)/;
    const match = line.match(regex);
    if (match && match[1]) {
      let val = match[1].trim();
      // Remover llaves, comillas y comas
      val = val.replace(/[{}"]/g, '').replace(/,$/, '').trim();
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
    // Separamos las líneas
    const lines = content.split('\n');

    // Objeto temporal para acumular datos de un estudio
    let currentStudy: Study = this.emptyStudy(dbName);
    // Variable para guardar el tag actual (por ejemplo, 'AB' para abstract)
    let currentTag: string | null = null;

    // Regex para detectar líneas de tag (dos letras/números seguidos de "  - ")
    const tagRegex = /^([A-Z0-9]{2})\s+-\s+(.*)/;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Si la línea está vacía, la saltamos
      if (!line) continue;

      // Verificamos si la línea coincide con el formato de un tag
      const match = line.match(tagRegex);
      if (match) {
        // Es una nueva línea de campo
        currentTag = match[1]; // por ejemplo, "AB", "AU", "TI", etc.
        const value = match[2];

        // Procesamos según el tag
        switch (currentTag) {
          case 'TY':
            currentStudy.document_type = value;
            break;
          case 'AU':
            currentStudy.author += (currentStudy.author ? '; ' : '') + value;
            break;
          case 'T1':
          case 'TI':
            currentStudy.title = value;
            break;
          case 'T2':
            // T2 se usa para título secundario, usualmente para conferencias
            if (!currentStudy.booktitle) {
              currentStudy.booktitle = value;
            } else {
              currentStudy.booktitle += ' ' + value;
            }
            break;
          case 'PY':
            currentStudy.year = value;
            break;
          case 'Y1':
            if (!currentStudy.year) {
              currentStudy.year = value;
            }
            break;
          case 'KW':
            currentStudy.keywords += (currentStudy.keywords ? '; ' : '') + value;
            break;
          case 'JF':
          case 'BT':
            currentStudy.booktitle = value;
            break;
          case 'JO':
            currentStudy.revista = value;
            break;
          case 'JA':
            if (!currentStudy.revista) {
              currentStudy.revista = value;
            }
            break;
          case 'VL':
            currentStudy.volume = value;
            break;
          case 'IS':
            currentStudy.number = value;
            break;
          case 'SP':
            currentStudy.pages = value;
            break;
          case 'EP':
            if (currentStudy.pages) {
              currentStudy.pages += '-' + value;
            }
            break;
          case 'DO':
            currentStudy.doi = value;
            break;
          case 'AB':
            // Iniciar el abstract
            currentStudy.resumen = value;
            break;
          case 'SN':
            currentStudy.issn = value;
            break;
          case 'MO':
          case 'MT':
            // Puedes asignar otros campos si lo requieres
            break;
          case 'Y1':
            if (!currentStudy.year) {
              currentStudy.year = value;
            }
            break;
          default:
            // Si se necesita procesar otros campos, se agregan aquí
            break;
        }
      } else {
        // La línea no coincide con un nuevo tag: es una continuación del valor del campo actual
        if (currentTag) {
          // Para ciertos campos multilinea (por ejemplo, abstract), concatenamos la línea
          switch (currentTag) {
            case 'AB':
              currentStudy.resumen += ' ' + line;
              break;
            // Si deseas acumular también KW u otros campos, añádelos aquí
            default:
              // Para otros campos podrías decidir si acumular o no
              break;
          }
        }
      }

      // Si la línea indica el final de un registro
      if (line.startsWith('ER  -')) {
        entries.push({ ...currentStudy });
        // Reiniciar estudio y tag actual para el siguiente registro
        currentStudy = this.emptyStudy(dbName);
        currentTag = null;
      }
    }

    // En caso de que el archivo no termine con ER  -, agregamos el último estudio si tiene datos
    if (this.hasData(currentStudy)) {
      entries.push({ ...currentStudy });
    }
    return entries;
  }

  // Función auxiliar para extraer el valor de una línea RIS, por ejemplo: "AU  - Doe, John"
  extractRisValue(line: string): string {
    const parts = line.split('-');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return '';
  }

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
      status: 'Sin clasificar',
      revista: '',
      author_keywords: '',
      bibtex_key: '',
      document_type: '',
      url: '',
      afiliacion: '',
      publisher: '',
      issn: '',
      language: '',
      comentario: '',
      resumen: '',
    };
  }

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

  toggleSelection(study: Study, event: MouseEvent) {
    // No propaga click a la fila
    event.stopPropagation();

    // Cambia isSelected
    study.isSelected = !study.isSelected;

    // Actualiza el contador
    this.updateSelectedCount();
  }

  toggleSelectAll(event: MouseEvent) {
    this.allDisplayedSelected = !this.allDisplayedSelected; // Cambia el estado de selección de los estudios visibles

    // Solo se afecta a los estudios que están actualmente visibles en la tabla
    this.displayedStudies.forEach(study => study.isSelected = this.allDisplayedSelected);

    // Se actualiza el contador de seleccionados
    this.updateSelectedCount();

    event.stopPropagation(); // Evita que el evento afecte a otros elementos como modales
  }

  updateSelectedCount() {
    this.selectedStudiesCount = this.importedStudies.filter(s => s.isSelected).length;
  }




  

  exportStudies(format: 'ris' | 'bib'): void {
    // Utilizamos el arreglo filtrado, por ejemplo, displayedStudies
    const estudios = this.displayedStudies; 
  
    let exportContent = '';
  
    if (format === 'ris') {
      estudios.forEach(study => {
        exportContent += `TY  - ${study.document_type || 'JOUR'}\n`;
        exportContent += `AU  - ${study.author}\n`;
        exportContent += `TI  - ${study.title}\n`;
        exportContent += `T2  - ${study.booktitle}\n`;
        exportContent += `PY  - ${study.year}\n`;
        exportContent += `IS  - ${study.document_type || ''}\n`;
        exportContent += `SP  - ${study.pages.split('-')[0] || ''}\n`;
        if (study.pages && study.pages.includes('-')) {
          exportContent += `EP  - ${study.pages.split('-')[1] || ''}\n`;
        }
        exportContent += `KW  - ${study.keywords}\n`;
        exportContent += `DO  - ${study.doi}\n`;
        exportContent += `AB  - ${study.resumen}\n`;
        exportContent += `SN  - ${study.issn}\n`;
        exportContent += `ER  - \n\n`;
      });
    } else if (format === 'bib') {
      estudios.forEach(study => {
        exportContent += `@article{${study.bibtex_key || 'key_' + study.id_estudios},\n`;
        exportContent += `  author = {${study.author}},\n`;
        exportContent += `  title = {${study.title}},\n`;
        exportContent += `  journal = {${study.booktitle}},\n`;
        exportContent += `  year = {${study.year}},\n`;
        exportContent += `  number = {${study.document_type || ''}},\n`;
        exportContent += `  pages = {${study.pages}},\n`;
        exportContent += `  keywords = {${study.keywords}},\n`;
        exportContent += `  doi = {${study.doi}},\n`;
        exportContent += `  abstract = {${study.resumen}},\n`;
        exportContent += `}\n\n`;
      });
    }
  
    // Crear un Blob y disparar la descarga
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudios_export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
  
  exportStudiesWithOption(): void {
    Swal.fire({
      title: 'Exportar estudios',
      text: 'Seleccione el formato de exportación:',
      input: 'radio',
      inputOptions: {
        ris: 'Formato RIS',
        bib: 'Formato BibTeX',
        excel: 'Formato Excel'
      },
      inputValidator: (value) => {
        if (!value) {
          return 'Seleccione una opción';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Exportar'
    }).then(result => {
      if (result.isConfirmed && result.value) {
        const format = result.value;
        if (format === 'excel') {
          this.exportStudiesExcel();
        } else {
          this.exportStudies(format as 'ris' | 'bib');
        }
      }
    });
  }
  
  async exportStudiesExcel(): Promise<void> {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Estudios');
  
    // Definir columnas con header, key y ancho
    worksheet.columns = [
      { header: 'ID Estudios', key: 'id_estudios', width: 10 },
      { header: 'Título', key: 'titulo', width: 30 },
      { header: 'Resumen', key: 'resumen', width: 40 },
      { header: 'Autores', key: 'autores', width: 30 },
      { header: 'Año', key: 'anio', width: 10 },
      { header: 'Revista', key: 'revista', width: 20 },
      { header: 'DOI', key: 'doi', width: 20 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'ID Criterio', key: 'id_criterio', width: 15 },
      { header: 'Keywords', key: 'keywords', width: 30 },
      { header: 'Author Keywords', key: 'author_keywords', width: 30 },
      { header: 'Bibtex Key', key: 'bibtex_key', width: 20 },
      { header: 'Document Type', key: 'document_type', width: 20 },
      { header: 'Páginas', key: 'paginas', width: 15 },
      { header: 'Volumen', key: 'volumen', width: 15 },
      { header: 'URL', key: 'url', width: 30 },
      { header: 'Afiliación', key: 'afiliacion', width: 30 },
      { header: 'Publisher', key: 'publisher', width: 20 },
      { header: 'ISSN', key: 'issn', width: 15 },
      { header: 'Lenguaje', key: 'language', width: 15 },
      { header: 'Comentario', key: 'comentario', width: 30 },
      { header: 'Fuente Bibliográfica', key: 'fuente_bibliografica', width: 20 },
      { header: 'URL PDF Artículo', key: 'url_pdf_articulo', width: 30 }
    ];
  
    // Ajustar que el texto se ajuste en cada columna
    worksheet.columns.forEach(column => {
      column.alignment = { wrapText: true };
    });
  
    // Usamos el arreglo filtrado, por ejemplo, displayedStudies
    const estudios = this.displayedStudies;
    estudios.forEach(study => {
      worksheet.addRow({
        id_estudios: study.id_estudios,
        titulo: study.title,
        resumen: study.resumen,
        autores: study.author,
        anio: study.year,
        revista: study.revista,
        doi: study.doi,
        estado: study.status,
        id_criterio: study.id_criterio,
        keywords: study.keywords,
        author_keywords: study.author_keywords,
        bibtex_key: study.bibtex_key,
        document_type: study.document_type,
        paginas: study.pages,
        volumen: study.volume,
        url: study.url,
        afiliacion: study.afiliacion,
        publisher: study.publisher,
        issn: study.issn,
        language: study.language,
        comentario: study.comentario,
        fuente_bibliografica: study.database,
        url_pdf_articulo: study.url_pdf_articulo,
      });
    });
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, 'estudios_export.xlsx');
  }
  
  






  //primer modal

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
    this.originalStudy = { ...study };
    this.pdfFile = null;
    this.showEditModal = true;
  }

  // (2) Cerrar modal
  closeEditModal() {
    this.showEditModal = false;
    this.selectedStudy = null;
    this.originalStudy = null;
    this.pdfFile = null;
    // Recarga la página

    this.selectedCriterio = 'Seleccione un criterio';
  }

  // (4) Cerrar el modal si hace clic en el backdrop
  onBackdropClick(event: MouseEvent) {
    /*if (event.target === event.currentTarget) {
      // clic en el backdrop, cierra
      this.closeEditModal();
    }*/
  }

  async saveImportedStudy(study: Study) {
    // Verifica si el estudio con el mismo título ya existe
    const { data: existingStudies, error: findError } = await this.authService.findStudyByTitleInRevision(
      study.title,
      this.reviewId
    );

    if (findError) {
      console.error('Error al buscar estudio duplicado:', findError);
      // Puedes continuar o mostrar advertencia
    }

    let statusToInsert = study.status; // Estado predeterminado

    if (existingStudies && existingStudies.length > 0) {
      // Significa que ya existe un estudio con el mismo título en esta revisión
      this.duplicatedCount++;
      statusToInsert = 'Duplicado'; // Marcar automáticamente como duplicado
    }
    // Mapea Study (de tu parse) a Estudio (para la tabla "estudios")
    const nuevoEstudio: Estudio = {
      titulo: study.title,
      resumen: study.resumen || '', // Valor por defecto
      autores: study.author,
      anio: parseInt(study.year) || 0,
      revista: study.booktitle || '',
      doi: study.doi,
      id_detalles_revision: this.reviewId,
      estado: statusToInsert,
      keywords: study.keywords || '',
      fuente_bibliografica: study.database,
      // Propiedades opcionales o no usadas, con valores por defecto
      author_keywords: '',
      bibtex_key: '',
      document_type: '',
      paginas: '',
      volumen: '',
      url: '',
      afiliacion: '',
      publisher: '',
      issn: study.issn || '',
      language: '',
      comentario: ''
    };

    const { data, error } = await this.authService.createEstudio(nuevoEstudio);

    if (error) {
      // Manejo de error
      console.error('Error al insertar estudio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo insertar el estudio en la BD.'
      });
    } else {
      // Estudio insertado
      console.log('Estudio insertado:', data && data[0]);
    }
  }

  async loadEstudiosForRevision() {
    // Convierte a número si 'this.reviewId' es string
    const idRevision = +this.reviewId;
  
    const { data, error } = await this.authService.getEstudiosByRevision(idRevision);
    if (error) {
      console.error('Error al obtener estudios por revisión:', error);
      // Puedes mostrar un SweetAlert2 aquí si deseas
    } else if (data) {
      // data es un arreglo de Estudio
      // Mapea cada estudio a tu interfaz Study, incluyendo el id_criterio
      this.importedStudies = data.map((estudio) => {
        return {
          // Propiedades obligatorias
          database: estudio.fuente_bibliografica || '',
          id_estudios: estudio.id_estudios,
          author: estudio.autores,
          booktitle: estudio.revista || '', // o 'journal' si lo guardas así
          title: estudio.titulo,
          year: estudio.anio?.toString() || '',
          volume: estudio.volumen || '',
          number: estudio.document_type || '', // Ajusta si 'document_type' es otra cosa
          pages: estudio.paginas || '',
          keywords: estudio.keywords || '',
          doi: estudio.doi,
          status: estudio.estado || 'Sin clasificar',
          // Propiedades opcionales con valores por defecto
          revista: estudio.revista || '',
          author_keywords: estudio.author_keywords || '',
          bibtex_key: estudio.bibtex_key || '',
          document_type: estudio.document_type || '',
          url: estudio.url || '',
          afiliacion: estudio.afiliacion || '',
          publisher: estudio.publisher || '',
          issn: estudio.issn || '',
          language: estudio.language || '',
          comentario: estudio.comentario || '',
          resumen: estudio.resumen || '',
          url_pdf_articulo: estudio.url_pdf_articulo || '',
          id_criterio: estudio.id_criterio // Se asigna el criterio (puede ser null o un número)
        };
      });
    }
  }
  
  onEstadoChange(newStatus: string): void {
    if (this.selectedStudy) {
      if (newStatus !== 'Aceptado' && newStatus !== 'Rechazado') {
        this.selectedStudy.id_criterio = 0;
      }
    } else {
      console.warn('No hay un estudio seleccionado.');
    }
  }
  
  

  async loadEstudioById(id: number) {
    const { data, error } = await this.authService.getEstudioById(id);
    if (error) {
      console.error('Error al obtener estudio ID:', error);
    } else if (data) {
      console.log('Estudio con ID:', id, data);
    }
  }

  async updateStudyStatus(study: Study) {
    // Verifica que el estudio tenga un id_estudios para actualizar en BD
    if (!study.id_estudios) {
      console.warn('No existe ID del estudio para actualizar.');
      return;
    }

    // Construir el objeto de cambios (solo el estado)
    const changes = { estado: study.status };

    const { data, error } = await this.authService.updateEstudio(study.id_estudios, changes);
    // Para cada estudio aceptado, cargamos la evaluación guardada (si existe)

    if (error) {
      console.error('Error al actualizar el estado:', error);
      // Podrías mostrar un SweetAlert2 o manejar el error como quieras
    } else {
      // data contiene la fila o filas actualizadas
      console.log('Estado actualizado correctamente:', data);
    }

    // Actualiza la lista de estudios aceptados para la segunda página
    this.refreshAcceptedStudies();
  }

  refreshAcceptedStudies() {
    // Suponiendo que 'importedStudies' es la lista completa de estudios,
    // y que 'acceptedStudies' es la lista que se utiliza en la segunda página.
    this.acceptedStudies = this.importedStudies
      .filter(study => study.status === 'Aceptado')
      .map(study => ({
        titulo: study.title,
        autores: study.author,
        anio: parseInt(study.year) || 0,
        revista: study.booktitle,
        doi: study.doi,
        id_detalles_revision: this.reviewId,
        estado: study.status,
        keywords: study.keywords,
        fuente_bibliografica: study.database,
        author_keywords: study.author_keywords,
        bibtex_key: study.bibtex_key,
        document_type: study.document_type,
        paginas: study.pages,
        volumen: study.volume,
        url: study.url,
        afiliacion: study.afiliacion,
        publisher: study.publisher,
        issn: study.issn,
        language: study.language,
        comentario: study.comentario,
        resumen: study.resumen,
        id_estudios: study.id_estudios,
        url_pdf_articulo: study.url_pdf_articulo
      }));
  }

  async deleteEstudio(id: number) {
    const { data, error } = await this.authService.deleteEstudio(id);
    if (error) {
      console.error('Error al eliminar estudio:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el estudio de la BD.'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Estudio eliminado',
        text: 'Se ha eliminado correctamente.'
      });
      console.log('Estudio eliminado:', data[0]);
    }
  }

  // Este getter devuelve la lista de estudios según el filtro
  get displayedStudies(): Study[] {
    // Paso 1: Filtrar por estado
    let filtered = (this.filterStatus === 'all')
      ? this.importedStudies
      : this.importedStudies.filter(study => study.status === this.filterStatus);

    // Paso 2: Filtrar por base bibliográfica
    if (this.filterDatabase !== 'allDb') {
      filtered = filtered.filter(study => study.database === this.filterDatabase);
    }

    return filtered;
  }

  applyFilter() {
    // Podrías hacer lógica adicional

    // pero con el getter, no necesitas nada aquí realmente.
    console.log('Filtro aplicado:', this.filterStatus);
  }

  /**
   * Se dispara cuando seleccionamos un archivo en el <input type="file">
   */
  onFileSelected(event: Event, study: Study) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const pdfFile = input.files[0];
    if (!pdfFile) return;

    // Subir de inmediato
    this.authService.uploadPDF(pdfFile, study.id_estudios!)
      .then(async (publicUrl) => {
        // Guardar la URL en la DB
        // Mapeo rápido de Study -> Estudio (ajusta campos según tu modelo)
        const estudioToUpdate = {
          id_estudios: study.id_estudios,
          url_pdf_articulo: publicUrl,
          // ... si necesitas actualizar más campos, agrégalos
        };

        await this.authService.updateStudy(estudioToUpdate);
        // Actualiza en local para que se refresque la interfaz
        study.url_pdf_articulo = publicUrl;

        Swal.fire({
          icon: 'success',
          title: 'PDF subido',
          text: 'Se ha subido el PDF y actualizado el estudio correctamente.'
        });
      })
      .catch((error) => {
        console.error('Error subiendo PDF:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al subir PDF',
          text: 'No se pudo subir el archivo. Intente de nuevo.'
        });
      });
  }

  async deletePDF(study: Study): Promise<void> {
    if (!study?.url_pdf_articulo) return;

    const filePath = this.authService.getFilePathFromPublicURL(study.url_pdf_articulo);

    const result = await Swal.fire({
      title: '¿Eliminar PDF?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      // 1) Eliminar del bucket "documentos"
      await this.authService.removePDF(filePath);

      // 2) Actualizar la base de datos
      await this.authService.updateStudy({
        id_estudios: study.id_estudios,
        url_pdf_articulo: null
      });

      // 3) Borrar localmente para refrescar la tabla
      study.url_pdf_articulo = '';

      Swal.fire({
        icon: 'success',
        title: 'Eliminado',
        text: 'El PDF se ha eliminado correctamente.'
      });
    } catch (error) {
      console.error('Error al eliminar PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: 'Ocurrió un problema al eliminar el PDF.'
      });
    }
  }



  // busqueda automatica con OpenAlex y la cadena de busqueda
  async searchWithOpenAlex() {
    try {
      // Mostrar alerta de carga mientras se realiza la búsqueda
      Swal.fire({
        title: 'Buscando estudios...',
        text: 'Por favor, espera un momento.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading(Swal.getConfirmButton());
        }
      });

      // Primero obtenemos la cadena de búsqueda desde el backend
      const { data: cadenaData, error: cadenaError } = await this.authService.getCadenaBusqueda(this.reviewId);
      if (cadenaError || !cadenaData) {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo obtener la cadena de búsqueda.'
        });
        return;
      }

      // Se asume que el registro tiene el campo "cadena_busqueda"
      const cadena = cadenaData[0]?.cadena_busqueda;
      if (!cadena || !cadena.trim()) {
        Swal.close();
        Swal.fire({
          icon: 'warning',
          title: 'Cadena vacía',
          text: 'La cadena de búsqueda está vacía.'
        });
        return;
      }

      // Construir la URL para llamar a OpenAlex, codificando la cadena
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(cadena)}&filter=type:article`;

      // Llamada a la API de OpenAlex
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const openAlexData = await response.json();

      // Cerrar la alerta de carga
      Swal.close();

      // Obtener la cantidad de estudios encontrados (generalmente en meta.count)
      const count = openAlexData.meta?.count || 0;

      // Mostrar el resultado mediante SweetAlert
      Swal.fire({
        icon: 'success',
        title: 'Resultados encontrados',
        text: `Se encontraron ${count} estudios con la cadena de búsqueda.`,
        //timer: 2500,
        showConfirmButton: true
      });
    } catch (err) {
      console.error('Error en búsqueda automática con OpenAlex:', err);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al realizar la búsqueda en OpenAlex.'
      });
    }
  }







  /**
   * Guarda los cambios del modal (actualización del estudio).
   * Si el estado es "Aceptado" y se sube un archivo, se hace la subida
   * y luego la actualización de la BD con la URL del PDF.
   */
  async saveStudyEdits(): Promise<void> {
    if (!this.selectedStudy) return;
    console.log(this.selectedStudy.id_criterio)
    try {
      // Mapeo de Study => Estudio, incluyendo el id_criterio directamente de selectedStudy
      const estudioToUpdate: Estudio = {
        id_estudios: this.selectedStudy.id_estudios,
        titulo: this.selectedStudy.title ?? '',
        resumen: this.selectedStudy.resumen ?? '',
        autores: this.selectedStudy.author ?? '',
        anio: Number(this.selectedStudy.year) || 0,
        revista: this.selectedStudy.revista ?? '',
        doi: this.selectedStudy.doi ?? '',
        id_detalles_revision: this.reviewId,
        estado: this.selectedStudy.status,

        id_criterio: this.selectedStudy.id_criterio,  // Se envía el criterio seleccionado
        
        keywords: this.selectedStudy.keywords ?? '',
        author_keywords: this.selectedStudy.author_keywords ?? '',
        bibtex_key: this.selectedStudy.bibtex_key ?? '',
        document_type: this.selectedStudy.document_type ?? '',
        paginas: this.selectedStudy.pages ?? '',
        volumen: this.selectedStudy.volume ?? '',
        url: this.selectedStudy.url ?? '',
        afiliacion: this.selectedStudy.afiliacion ?? '',
        publisher: this.selectedStudy.publisher ?? '',
        issn: this.selectedStudy.issn ?? '',
        language: this.selectedStudy.language ?? '',
        comentario: this.selectedStudy.comentario ?? '',
        fuente_bibliografica: this.selectedStudy.database ?? ''
      };
  
      // Si el estado es "Aceptado" y hay PDF pendiente de subir, súbelo
      if (this.selectedStudy.status === 'Aceptado' && this.pdfFile) {
        const pdfUrl = await this.authService.uploadPDF(this.pdfFile, this.selectedStudy.id_estudios!);
        estudioToUpdate.url_pdf_articulo = pdfUrl;
      }
  
      // Actualiza el estudio en la BD
      await this.authService.updateStudy(estudioToUpdate);
  
      // Recargar la lista de estudios
      this.loadEstudiosForRevision();
  
      Swal.fire({
        icon: 'success',
        title: 'Datos guardados',
        text: 'El estudio ha sido actualizado correctamente.'
      });
  
      this.closeEditModal();
  
    } catch (error) {
      console.error('Error guardando cambios:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: 'Ocurrió un problema al guardar los datos.'
      });
    }
  }

  openPDF(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  isFormValid(): boolean {
    return (
      this.newStudy.doi &&
      this.newStudy.title &&
      this.newStudy.publisher &&
      this.newStudy.documentType &&
      this.newStudy.author &&
      this.newStudy.year &&
      this.newStudy.revista &&
      this.newStudy.url &&
      this.newStudy.status &&
      this.newStudy.database
    );
  }

  async loadCriterios() {
    try {
      const todos = await this.authService.getCriteriosByRevision(this.reviewId);
      this.inclusionCriterios = todos.filter(c => c.tipo === 'inclusion');
      this.exclusionCriterios = todos.filter(c => c.tipo === 'exclusion');
    } catch (err) {
      console.error('Error al cargar criterios:', err);
    }
  }

  // Al cargar el estudio para edición, si no existe criterio, se asigna 0
async autoSelectCriterio() {
  if (!this.selectedStudy || !this.selectedStudy.id_estudios) {
    if (this.selectedStudy) {
      this.selectedStudy.id_criterio = 0;
    }
    return;
  }
  try {
    const idCriterio = await this.authService.getIdCriterioDeEstudio(this.selectedStudy.id_estudios);
    if (!idCriterio) {
      this.selectedStudy.id_criterio = 0;
      return;
    }
    const found = this.inclusionCriterios.find(c => c.id_criterios === idCriterio)
      || this.exclusionCriterios.find(c => c.id_criterios === idCriterio);
    if (found) {
      this.selectedStudy.id_criterio = found.id_criterios;
    } else {
      this.selectedStudy.id_criterio = 0;
    }
  } catch (error) {
    console.error('Error al obtener/seleccionar criterio:', error);
    this.selectedStudy.id_criterio = 0;
  }
}



  /**
   * Abre el modal para añadir un nuevo estudio.
   */
  openAddStudyModal(): void {
    this.showAddStudyModal = true;
    this.newStudy = {
      status: 'Sin clasificar',
    }; // Reinicia el formulario
    this.showEditModal = true;
  }

  /**
   * Cierra el modal de añadir estudio.
   */
  closeAddStudyModal(): void {
    this.showAddStudyModal = false;
    this.showEditModal = false;
    // Recarga la página
    //window.location.reload();
  }

  /**
 * Llama a la API de CrossRef para buscar los datos del DOI.
 */
  fetchCrossRefData(): void {
    if (!this.newStudy.doi) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor, ingrese un DOI válido.'
      });
      return;
    }

    this.doiApiService.fetchDoiData(this.newStudy.doi).subscribe({
      next: (data) => {
        // Llena los campos del modal con los datos recibidos
        this.newStudy.title = data.title?.[0] || 'Título no disponible';
        this.newStudy.publisher = data.publisher || 'No disponible';
        this.newStudy.documentType = data.type || 'No disponible';
        this.newStudy.author = data.author
          ? data.author.map((a: any) => `${a.given} ${a.family}`).join(', ')
          : 'No disponible';
        this.newStudy.year = data.created?.['date-parts']?.[0]?.[0] || 'No disponible';
        this.newStudy.revista = data['container-title']?.[0] || 'No disponible';
        this.newStudy.url = data.URL || 'No disponible';

        Swal.fire({
          icon: 'success',
          title: 'Datos recuperados',
          text: 'Los datos del DOI han sido completados correctamente.'
        });
      },
      error: (err) => {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron recuperar los datos del DOI proporcionado.'
        });
      }
    });
  }

  /**
     * Guarda el nuevo estudio en la base de datos.
     */
  async saveNewStudy(): Promise<void> {
    // Verifica si el título está definido
    if (!this.newStudy.title || !this.newStudy.doi) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Debe completar al menos el Título y el DOI.'
      });
      return;
    }

    try {
      // Busca estudios existentes con el mismo título
      const { data: existingStudies, error: findError } = await this.authService.findStudyByTitleInRevision(
        this.newStudy.title,
        this.reviewId
      );

      if (findError) {
        console.error('Error al buscar estudios duplicados:', findError);
        Swal.fire({
          icon: 'warning',
          title: 'Advertencia',
          text: 'Hubo un problema al verificar duplicados, pero puede continuar.'
        });
      }

      let statusToInsert = this.newStudy.status || 'Sin clasificar'; // Estado predeterminado

      if (existingStudies && existingStudies.length > 0) {
        // Si ya existe un estudio similar, marca como "Duplicado"
        this.duplicatedCount++;
        statusToInsert = 'Duplicado';
      }

      // Crear el objeto Estudio con los campos básicos
      const nuevoEstudio: Estudio = {
        titulo: this.newStudy.title,
        resumen: '', // Valor predeterminado
        autores: this.newStudy.author,
        anio: parseInt(this.newStudy.year) || 0,
        revista: this.newStudy.revista || '',
        doi: this.newStudy.doi,
        id_detalles_revision: this.reviewId, // ID de la revisión actual
        estado: statusToInsert,
        keywords: '', // Valor predeterminado
        fuente_bibliografica: this.newStudy.database || '',
        publisher: this.newStudy.publisher || '',
        document_type: this.newStudy.documentType || '',
        url: this.newStudy.url || '',
        // Propiedades opcionales no incluidas en el modal:
        author_keywords: '',
        bibtex_key: '',
        paginas: '',
        volumen: '',
        afiliacion: '',
        issn: '',
        language: '',
        comentario: ''
      };

      // Inserta el nuevo estudio en la base de datos
      const { data, error } = await this.authService.createEstudio(nuevoEstudio);

      if (error) {
        console.error('Error al insertar estudio:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo insertar el estudio en la base de datos.'
        });
      } else {
        // Inserción exitosa
        console.log('Estudio insertado:', data && data[0]);
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'El estudio se ha guardado correctamente.'
        });
        this.closeAddStudyModal(); // Cierra el modal
        // Opcional: Actualiza la lista de estudios si es necesario
        await this.loadEstudiosForRevision();
      }
    } catch (err) {
      console.error('Error al guardar el nuevo estudio:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar el estudio.'
      });
    }
  }


  // Segunda Pagina
  async loadAcceptedStudies() {
    // 1) Cargar estudios Aceptados filtrados por id_detalles_revision
    const { data: estudiosAceptados, error: errorEst } = await this.authService.getAcceptedStudies(this.reviewId);
    if (errorEst) {
      console.error('Error al cargar estudios aceptados:', errorEst);
    } else {
      this.acceptedStudies = estudiosAceptados ?? [];
    }
  }

  async loadPreguntas() {
    // Cargar solo las preguntas correspondientes a la revisión actual
    const { data: preguntas, error: errorPreg } = await this.authService.getQualityQuestions(this.reviewId);
    if (errorPreg) {
      console.error('Error al cargar preguntas:', errorPreg);
    } else {
      this.qualityQuestions = preguntas ?? [];
    }
  }
  

  async loadRespuestas() {
    // 3) Cargar respuestas
    const { data: respuestas, error: errorResp } = await this.authService.getQualityAnswers();
    if (errorResp) {
      console.error('Error al cargar respuestas:', errorResp);
    } else {
      this.qualityAnswers = respuestas ?? [];
    }
  }

  async loadEvaluationForStudy(study: Estudio): Promise<void> {
    try {
      const evaluaciones = await this.authService.getCalidadEstudiosByStudy(study.id_estudios!);
      const evalMap: { [key: number]: any } = {};
      if (evaluaciones && evaluaciones.length > 0) {
        for (const ev of evaluaciones) {
          evalMap[ev.id_pregunta] = ev;
        }
        this.currentEvaluationSaved = Object.keys(evalMap).length > 0;
      } else {
        // Si no hay evaluaciones, nos aseguramos de que el flag quede en false
        this.currentEvaluationSaved = false;
      }
      study.savedEvaluation = evalMap;
    } catch (error) {
      console.error('Error al cargar evaluación guardada:', error);
      this.currentEvaluationSaved = false;
    }
  }


  selectAnswer(idPregunta: number, answerObj: any): void {
    this.selectedAnswers[idPregunta] = answerObj.id_respuesta;
    // Al modificar una respuesta, indicamos que la evaluación aún no está guardada
    if (this.openedStudy) {
      this.currentEvaluationSaved = false;
    }
  }

  getAnswerDescription(id_respuesta: number): string {
    const answer = this.qualityAnswers.find(r => r.id_respuesta === id_respuesta);
    return answer ? answer.descripcion : '';
  }

  calculateTotalScore(study: Estudio): number {
    let total = 0;
    if (study.savedEvaluation) {
      for (const key in study.savedEvaluation) {
        total += Number(study.savedEvaluation[key].peso) || 0;
      }
    } else {
      // Si no se guardó evaluación, calcula localmente a partir de selectedAnswers
      for (const question of this.qualityQuestions) {
        const answerId = this.selectedAnswers[question.id_pregunta];
        if (answerId) {
          const answer = this.qualityAnswers.find(r =>
            r.id_respuesta === answerId &&
            r.id_detalles_revision === question.id_detalles_revision
          );
          if (answer) {
            total += Number(answer.peso) || 0;
          }
        }
      }
    }
    return total;
  }

  async saveEvaluation(study: Estudio): Promise<void> {
    const idEstudio = study.id_estudios;
    if (!idEstudio) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del estudio.'
      });
      return;
    }
    try {
      // Recorrer cada pregunta y guardar la evaluación en la tabla "calidad_estudios"
      for (const question of this.qualityQuestions) {
        const preguntaId = question.id_pregunta;
        const respuestaId = this.selectedAnswers[preguntaId];
        if (!respuestaId) continue;
        const respuestaObj = this.qualityAnswers.find(r => r.id_respuesta === respuestaId);
        const pesoRespuesta = respuestaObj ? respuestaObj.peso : 0;
        const calidadData = {
          id_estudios: idEstudio,
          id_pregunta: preguntaId,
          id_respuesta: respuestaId,
          peso: pesoRespuesta,
          fecha_evaluacion: new Date().toISOString()
        };
        const { data, error } = await this.authService.createCalidadEstudio(calidadData);
        if (error) {
          console.error('Error al guardar evaluación:', error);
        }
      }

      this.currentEvaluationSaved = true;

      Swal.fire({
        icon: 'success',
        title: 'Evaluación Guardada',
        text: 'La evaluación se guardó correctamente.'
      });
      await this.loadEvaluationForStudy(study);
      this.cancelEvaluation();
    } catch (err) {
      console.error('Error guardando evaluación:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al guardar la evaluación.'
      });
    }
    this.openedStudy = null;
  }

  toggleEvaluation(study: Estudio): void {
    // Solo cambia el estudio abierto sin alterar currentEvaluationSaved
    this.openedStudy = (this.openedStudy === study) ? null : study;
  }


  cancelEvaluation(): void {
    this.openedStudy = null;
    this.selectedAnswers = {};
  }

  getCheckedAnswer(questionId: number): number | undefined {
    if (this.selectedAnswers && this.selectedAnswers[questionId]) {
      return this.selectedAnswers[questionId];
    }
    if (this.openedStudy && this.openedStudy.savedEvaluation && this.openedStudy.savedEvaluation[questionId]) {
      return this.openedStudy.savedEvaluation[questionId].id_respuesta;
    }
    return undefined;
  }

  isEvaluationCompleteForStudy(study: Estudio): boolean {
    // Se considera completa la evaluación si study.savedEvaluation existe
    // y contiene una respuesta para cada pregunta de qualityQuestions.
    if (!study.savedEvaluation) {
      return false;
    }
    return study.savedEvaluation && this.qualityQuestions.every(question => !!study.savedEvaluation![question.id_pregunta]);
  }


















  // Función para subir PDF para un estudio
  uploadPDFForStudy(study: Estudio): void {
    // Creamos un input file de forma dinámica
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.onchange = async (event: any) => {
      const file: File = event.target.files[0];
      if (file) {
        try {
          // Llamamos al servicio para subir el PDF. Se asume que updatePDF retorna la URL.
          const pdfUrl = await this.authService.uploadPDF(file, study.id_estudios!);

          // Actualizamos el estudio únicamente con la nueva URL del PDF
          const updatedStudy: Partial<Estudio> = {
            id_estudios: study.id_estudios,
            url_pdf_articulo: pdfUrl
          };
          await this.authService.updateStudy(updatedStudy as Estudio);

          // Actualizamos localmente el estudio para que la tabla se refresque
          study.url_pdf_articulo = pdfUrl;

          Swal.fire({
            icon: 'success',
            title: 'PDF subido',
            text: 'El PDF se ha subido correctamente.'
          });
          // Llamamos a la función saveStudyEdits para actualizar el estudio en la BD
          // Esto actualizará solo la URL, ya que en saveStudyEdits se verifica si ya existe.
          await this.saveStudyEdits();
        } catch (error) {
          console.error('Error al subir PDF:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo subir el PDF.'
          });
        }
      }
    };
    fileInput.click();
  }

  // Función para eliminar PDF de un estudio eliminando la carpeta correspondiente
  async deletePDF1(study: Estudio): Promise<void> {
    try {
      const confirmResult = await Swal.fire({
        title: 'Eliminar PDF',
        text: '¿Estás seguro de eliminar el PDF?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmResult.isConfirmed) return;

      // En vez de usar study.url_pdf_articulo, definimos la carpeta usando el id del estudio.
      const folderPath = `estudios/${study.id_estudios}`;

      // Llamamos a la función del AuthService que elimina todos los archivos de la carpeta
      await this.authService.removeFolder(folderPath);

      // Actualizamos el estudio para poner la URL del PDF en null
      const updatedStudy: Partial<Estudio> = {
        id_estudios: study.id_estudios,
        url_pdf_articulo: null
      };
      await this.authService.updateStudy(updatedStudy as Estudio);
      study.url_pdf_articulo = null;

      Swal.fire({
        icon: 'success',
        title: 'PDF eliminado',
        text: 'El PDF ha sido eliminado correctamente.'
      });
    } catch (error) {
      console.error('Error al eliminar PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un problema al eliminar el PDF.'
      });
    }
  }

}
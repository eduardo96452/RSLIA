import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from "../../../principal/navbar/navbar.component";
import { FooterComponent } from "../../../principal/footer/footer.component";
import { AuthService } from '../../../auth/data-access/auth.service';
import { OpenAiService } from '../../../conexion/openAi.service';
import { Study } from '../../../auth/data-access/auth.service';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent, FooterComponent],
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

  /*logLibraryName() {
    console.log(this.libraryName);
  }
  

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fileContent = e.target.result;
        console.log('Archivo cargado correctamente:', this.fileContent); // Log de depuración
      };
      reader.readAsText(file);
    } else {
      console.error('No se seleccionó ningún archivo.'); // Log de error
    }
  }

  importStudies(): void {
    if (this.libraryName.trim() && this.fileContent) {
      const lines = this.fileContent.split('\n');
      const data = lines
        .filter(line => line.includes('='))
        .map(line => {
          const [field, value] = line.split('=');
          const cleanedValue = value.trim().replace(/[{}]|\,$/g, ''); // Eliminar llaves y coma al final
          
          return { field: field.trim(), value: cleanedValue };
        });
  
      // Aquí separaremos los campos y valores por "DOI"
      const groupedData: any = {};
      data.forEach(item => {
        const { field, value } = item;
        
        // Si el campo es DOI, no lo agrupamos (es una columna diferente)
        if (field === 'DOI') {
          groupedData[field] = value;
        } else {
          if (!groupedData[field]) {
            groupedData[field] = [];
          }
          
          // Si el valor es una lista de autores, dividimos por coma y agregamos en filas separadas
          if (field === 'authors') {
            const authors = value.split(',').map((author: string) => author.trim());
            groupedData[field].push(...authors);
          } else {
            groupedData[field].push(value);
          }
        }
      });
  
      // Convertimos el objeto agrupado en un arreglo para su visualización
      this.importedData = Object.keys(groupedData).map(key => ({
        field: key,
        value: groupedData[key]
      }));
  
    } else {
      alert('Por favor, complete todos los campos y cargue un archivo válido.');
    }
  }*/

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
   * Lógica para parsear el archivo .bib o .ris y extraer los estudios
   * En la práctica, usarías librerías o tu lógica específica para parsear
   */
  parseFile(file: File, fileType: string, dbName: string) {
    // 1) Leer el archivo
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const fileContent = e.target.result as string;

      // 2) Parsear según el tipo
      let newStudies: Study[] = [];
      if (fileType === 'bib') {
        newStudies = this.parseBib(fileContent);
      } else {
        newStudies = this.parseRis(fileContent);
      }

      // 3) Agregar base de datos y estado inicial
      newStudies = newStudies.map(study => ({
        ...study,
        status: 'Sin clasificar'
      }));

      // 4) Agregar a la lista principal
      this.importedStudies.push(...newStudies);

      // 5) Mostrar un mensaje de éxito
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
   * Ejemplo de parseo .bib (muy simplificado)
   */
  parseBib(content: string): Study[] {
    // Aquí iría la lógica real o librería para parsear
    // Ejemplo ficticio: tomamos lineas y simulamos
    const lines = content.split('\n');
    // Lógica de parse...
    // Retornamos un array simulado
    return [
      {
        author: 'Autor Bib',
        booktitle: 'Book Title Bib',
        title: 'Título Bib',
        year: '2022',
        volume: '1',
        number: '1',
        pages: '1-10',
        keywords: 'bib, sample',
        doi: '10.1234/bib.sample',
        status: 'Sin clasificar'
      }
    ];
  }

  /**
   * Ejemplo de parseo .ris (muy simplificado)
   */
  parseRis(content: string): Study[] {
    // Lógica real o librería para parsear .ris
    // Ejemplo simulado
    return [
      {
        author: 'Autor RIS',
        booktitle: 'Book Title RIS',
        title: 'Título RIS',
        year: '2023',
        volume: '2',
        number: '2',
        pages: '20-30',
        keywords: 'ris, sample',
        doi: '10.1234/ris.sample',
        status: 'Sin clasificar'
      }
    ];
  }




}
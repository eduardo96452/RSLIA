import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';

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
  trabajosText = 'Contenido de Trabajos relacionados...';
  metodologiaText = 'Contenido de la Metodología...';
  resultadosText = 'Contenido de los Resultados...';
  discusionText = 'Contenido de la Discusión...';
  limitacionesText = 'Contenido de las Limitaciones...';
  conclusionText = 'Contenido de la Conclusión...';
  referenciasText = 'Contenido de las Referencias...';

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

    this.checkScreenSize();

    // Nos suscribimos a NavigationEnd, que indica que la navegación ha finalizado.
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        // Llevamos el scroll al tope
        window.scrollTo(0, 0);
      });

    this.introductionText = ''; // o con algún valor predeterminado
    await this.loadSectionDraft();
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

  generateIntroductionWithIA(): void {
    // Muestra el mensaje de carga
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
      }
    } catch (err) {
      Swal.close();
      console.error('Error al guardar el borrador de Introducción:', err);
    }
  }

  async loadSectionDraft(): Promise<void> {
    try {
      const { data, error } = await this.authService.getSectionDraft(this.reviewId);
      if (error) {
        console.error('Error al cargar el borrador de sección:', error);
      } else if (data) {
        // Asigna el contenido de la introducción al input (puedes usar replace para los saltos de línea si es necesario)
        this.introductionText = data.introduccion || '';
      }
    } catch (err) {
      console.error('Excepción al cargar el borrador de sección:', err);
    }
  }







  downloadDraftWord(): void {
    const doc = new Document({
      sections: [
        {
          children: [
            // Introducción
            new Paragraph({
              text: "Introducción",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.introductionText) ]
            }),
            // Trabajos relacionados
            new Paragraph({
              text: "Trabajos relacionados",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.trabajosText) ]
            }),
            // Metodología
            new Paragraph({
              text: "Metodología",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.metodologiaText) ]
            }),
            // Resultados
            new Paragraph({
              text: "Resultados",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.resultadosText) ]
            }),
            // Discusión
            new Paragraph({
              text: "Discusión",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.discusionText) ]
            }),
            // Limitaciones
            new Paragraph({
              text: "Limitaciones",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.limitacionesText) ]
            }),
            // Conclusión
            new Paragraph({
              text: "Conclusión",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.conclusionText) ]
            }),
            // Referencias
            new Paragraph({
              text: "Referencias",
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [ new TextRun(this.referenciasText) ]
            })
          ]
        }
      ]
    });

    // Genera el documento en un Blob y lo descarga
    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, 'Borrador_de_Articulo.docx');
    });
  }
  
}
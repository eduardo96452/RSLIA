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
  trabajosText = 'Contenido de Trabajos relacionados...';
  metodologiaText = 'Contenido de la Metodología...';
  resultadosText = 'Contenido de los Resultados...';
  discusionText = 'Contenido de la Discusión...';
  limitacionesText = 'Contenido de las Limitaciones...';
  conclusionText = 'Contenido de la Conclusión...';
  referenciasText = 'Contenido de las Referencias...';
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
        if(qrData)
        {
          y += 10;
          const qrSize = 50; // Tamaño del QR
          doc.addImage(this.qrImageUrl, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize);
          y += qrSize + 10;
          
          // Agregar el nombre y cargo debajo del QR
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          const textoUsuario = `${this.cargoUsuario.toUpperCase()} ${this.nombreUsuario.toUpperCase()}`;
          doc.text(textoUsuario, pageWidth / 2, y, { align: "center" });
          
          y += 6;
          doc.text("INVESTIGADOR", pageWidth / 2, y, { align: "center" });
          
          y += 10;
          
          // Línea divisoria
          doc.setLineWidth(0.5);
          doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
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

  generarQR()
  {

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
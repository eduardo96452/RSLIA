import { AfterViewInit, Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape from 'cytoscape';
import { FormBuilder, FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { OpenAiService } from '../../../conexion/openAi.service';


@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.css'
})
export class InformesComponent implements OnInit, AfterViewInit {
  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  private cy!: cytoscape.Core;
  locked = false;
  nodeId: string = '';
  nodeLabel: string = '';

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

    if (this.cy) {
      // Centrar la vista y ajustar el grafo para mostrar todos los nodos
      this.cy.resize();
      this.cy.fit();
    }
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

  async ngAfterViewInit() {
    this.cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [
        // Columna 1:
        {
          data: { id: 'node3', label: 'Identificación' },
          position: { x: 50, y: 100 }
        },
        {
          data: { id: 'node4', label: 'Cribado/Selección' },
          position: { x: 50, y: 270 }
        },
        {
          data: { id: 'node5', label: 'Incluidos' },
          position: { x: 50, y: 455 }
        },

        // Columna 2:
        {
          data: { id: 'node6', label: 'Identificación de nuevos estudios a través de bases de datos y registros' },
          position: { x: 300, y: 25 }
        },
        {
          data: { id: 'node8', label: 'Registros identificados de:* \n Bases de datos (n = 0) \n Registros (n = 0)' },
          position: { x: 170, y: 100 }
        },
        {
          data: { id: 'node9', label: 'Registros eliminados antes del cribado: \n Registros duplicados eliminados (n = 0) \n Registros marcados como no elegibles por \n herramientas de automatización (n = 0) \n Registros eliminados por otras razones (n = 0)' },
          position: { x: 400, y: 100 }
        },
        {
          data: { id: 'node10', label: 'Registros cribados (n = 0)' },
          position: { x: 170, y: 200 }
        },
        {
          data: { id: 'node11', label: 'Informes buscados para \n su recuperación (n = 0)' },
          position: { x: 170, y: 265 }
        },
        {
          data: { id: 'node12', label: 'Informes evaluados \n para determinar su \n elegibilidad (n = 0)' },
          position: { x: 170, y: 340 }
        },
        {
          data: { id: 'node13', label: 'Registros excluidos (n = 0)' },
          position: { x: 358, y: 200 }
        },
        {
          data: { id: 'node14', label: 'Informes no recuperados (n = 0)' },
          position: { x: 371, y: 265 }
        },
        {
          data: { id: 'node15', label: 'Informes excluidos: \n Razón 1 (n = ) \n Razón 2 (n = ) \n Razón 3 (n = ) \n etc.' },
          position: { x: 346, y: 340 }
        },
        {
          data: { id: 'node16', label: 'Nuevos estudios incluidos \n en la revisión (n = ) \n Informes de nuevos \n estudios incluidos (n = )' },
          position: { x: 170, y: 440 }
        },

        // Columna 3: node7, node2
        {
          data: { id: 'node7', label: 'Identificación de nuevos estudios a través de otros métodos' },
          position: { x: 700, y: 25 }
        },
        {
          data: { id: 'node1', label: 'Nodo Horizontal\nParte no editable' },
          position: { x: 550, y: 220 }
        },
        {
          data: { id: 'node2', label: 'Nodo Vertical\nParte no editable' },
          position: { x: 550, y: 250 }
        },

        // Mantener la conexión entre node1 y node2
        {
          data: { id: 'edge1', source: 'node1', target: 'node2' }
        },
        {
          data: { id: 'edge2', source: 'node8', target: 'node9' }
        },
        {
          data: { id: 'edge3', source: 'node8', target: 'node10' }
        },
        {
          data: { id: 'edge4', source: 'node10', target: 'node11' }
        },
        {
          data: { id: 'edge5', source: 'node11', target: 'node12' }
        },
        {
          data: { id: 'edge6', source: 'node10', target: 'node13' }
        },
        {
          data: { id: 'edge7', source: 'node11', target: 'node14' }
        },
        {
          data: { id: 'edge8', source: 'node12', target: 'node15' }
        },
        {
          data: { id: 'edge9', source: 'node12', target: 'node16' }
        }
      ],

      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#11479e',
            'label': 'data(label)',
            'shape': 'roundrectangle',
            'padding': '10px',        // propiedad problemática
            'text-wrap': 'wrap',
            'width': 'label',
            'height': 'label',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#fff',
            'font-size': '10px'
          } as any  // Aserción de tipo para ignorar validación en este objeto
        },
        {
          selector: '#node2',
          style: {
            'background-color': '#28a745',  // Color diferente para distinguirlo
            // Otros estilos específicos para node3 si se desean
          }
        },
        {
          selector: '#node3,#node4, #node5',
          style: {
            'background-color': '#ff6347',
            // Forzar forma vertical: ancho fijo, altura basada en contenido
            'width': '10px',            // ancho más reducido
            'height': '85px',           // altura automática según el texto
            'text-wrap': 'wrap',
            'text-max-width': '200px',   // limitar el ancho del texto para forzar múltiples líneas
            'text-valign': 'center',       // alinear el texto en la parte superior
            'text-halign': 'center',
            'color': '#fff',
            'text-rotation': 11,
            'shape': 'roundrectangle'   // forma rectangular redondeada vertical
          }
        } as any,
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#9dbaea',
            'target-arrow-color': '#9dbaea',
            'target-arrow-shape': 'triangle',
            'curve-style': 'taxi',           // Estilo taxi para aristas con esquinas
            'taxi-turn': 90,                 // Ángulo de la vuelta (90° para esquinas rectas)
            'taxi-turn-min-distance': 20     // Distancia mínima para forzar la vuelta
          } as any
        }
      ],
      layout: {
        name: 'preset'  // Usar posiciones definidas manualmente en cada nodo
      }
    });

    // Opcional: ajustar comportamiento de zoom al inicializar
    this.cy.zoomingEnabled(true);
    this.cy.panningEnabled(true);

    // Ajuste inicial para encajar nodos
    this.cy.resize();
    this.cy.fit();
    this.cy.zoom(0.8 * this.cy.zoom());

    // Bloquear permanentemente la interacción del panel y nodos
    this.lockPanel();
  }

  @HostListener('window:resize')
  onResize() {
    if (this.cy) {
      this.cy.resize();  // Ajustar tamaño del lienzo Cytoscape
      this.cy.fit();     // Ajustar vista para que quepan todos los nodos
    }
  }

  zoomIn() {
    const currentZoom = this.cy.zoom();
    this.cy.zoom({ level: currentZoom + 0.2, renderedPosition: { x: 0, y: 0 } });
  }

  zoomOut() {
    const currentZoom = this.cy.zoom();
    this.cy.zoom({ level: currentZoom - 0.2, renderedPosition: { x: 0, y: 0 } });
  }

  private lockPanel() {
    // Indicar que el panel está bloqueado (opcional, para mantener el estado)
    this.locked = true;

    // Deshabilitar la interacción con el panel
    this.cy.userPanningEnabled(true);
    this.cy.userZoomingEnabled(false);

    // Deshabilitar el arrastre de todos los nodos
    this.cy.nodes().forEach((node: cytoscape.NodeSingular) => {
      node.ungrabify();
    });
  }

  private downloadFile(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadPNG() {
    // Exportar PNG con mayor escala para mejorar la calidad
    const pngDataUrl = this.cy.png({ full: true, bg: 'white', scale: 6 });
    // Ajusta scale a un valor mayor según la calidad deseada

    this.downloadFile(pngDataUrl, 'graph.png');
  }

  downloadPDF() {
    // Exportar PNG con mayor escala (por ejemplo, 2x la resolución)
    const pngDataUrl = this.cy.png({ full: true, bg: 'white', scale: 6 });

    // Crear un nuevo PDF con orientación landscape (ancho)
    const doc = new jsPDF('landscape');

    // Determinar dimensiones de la imagen en el PDF
    // Ajusta estos valores según la resolución y tamaño deseado
    const imgWidth = 280;
    const imgHeight = 150;

    // Insertar la imagen en el PDF
    doc.addImage(pngDataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
    doc.save('graph.pdf');
  }

  centerAndUnlock() {
    if (this.cy) {
      // Centrar la vista y ajustar el grafo para mostrar todos los nodos
      this.cy.resize();
      this.cy.fit();
  
      // Habilitar panning y zoom para permitir mover el panel
      this.cy.userPanningEnabled(true);
  
      // (Opcional) Actualizar estado de bloqueo si se gestiona una variable
      this.locked = false;
    }
  }
}
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import cytoscape from 'cytoscape';
import { FormBuilder, FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { OpenAiService } from '../../conexion/openAi.service';

@Component({
  selector: 'app-prisma',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './prisma.component.html',
  styleUrl: './prisma.component.css'
})
export class PrismaComponent implements OnInit, AfterViewInit {
  userData: any = null;
  reviewData: any = {};
  reviewId!: string;
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  locked = false;

  private cy!: cytoscape.Core;
  isLargeScreen = true;
  shortVersionEnabled = false;

  // Métricas cargadas desde AuthService
  metrics: {
    perSource: { fuente: string; count: number }[];
    totalIdentified: number;
    duplicatesCount: number;
    screenedCount: number;
    excludedByCriteria: { code: string; count: number }[];
    includedCount: number;
  } | null = null;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) { }

  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
    this.loadReviewData();
    this.loadUserData();

    const reviewData = await this.authService.getReviewById(this.reviewId);
    if (reviewData) {
      this.titulo_revision = reviewData.titulo_revision || '';
      this.tipo_revision = reviewData.tipo_revision || '';
      this.descripcion = reviewData.descripcion || '';
    }

    // Obtiene métricas y luego inicializa el grafo
    this.metrics = await this.authService.getSectionMetrics(this.reviewId);
    this.initializeCytoscape();

    this.checkScreenSize();

    // Scroll to top tras navegación
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => window.scrollTo(0, 0));
  }

  @HostListener('window:resize', ['$event'])
  onResize1(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768;
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

  @HostListener('window:resize')
  onResize() {
    if (this.cy) {
      this.cy.resize();  // Ajustar tamaño del lienzo Cytoscape
      this.cy.fit();     // Ajustar vista para que quepan todos los nodos
    }
  }

  /** Zoom in/out y export */
  zoomIn() { this.cy.zoom(this.cy.zoom() + 0.1); }
  zoomOut() { this.cy.zoom(this.cy.zoom() - 0.1); }

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
    const png = this.cy.png({ full: true, bg: 'white', scale: 6 });
    const a = document.createElement('a'); a.href = png; a.download = 'graph.png'; a.click();
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

  onCheckboxChange(event: Event) {
    // Cuando el checkbox cambie, reinicializamos Cytoscape con la nueva configuración
    this.initializeCytoscape();
  }

  private initializeCytoscape() {
    if (this.cy) this.cy.destroy();

    const elements = this.shortVersionEnabled
      ? this.getFullVersionElements()
      : this.getShortVersionElements();

    const style = this.shortVersionEnabled
      ? this.getShortVersionStyle()
      : this.getFullVersionStyle();

    this.cy = cytoscape({
      container: document.getElementById('cy')!,
      elements,
      style,
      layout: { name: 'preset', fit: true }
    });

    this.cy.zoomingEnabled(true);
    this.cy.panningEnabled(true);
    this.lockPanel();
    this.cy.resize();
    this.cy.fit();
  }

  // Devuelve los elementos (nodos / edges) de la versión completa
  getFullVersionElements() {
    return [
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
        position: { x: 50, y: 440 }
      },

      // Columna 2:
      {
        data: { id: 'node6', label: 'Identificación de nuevos estudios a través de bases de datos y registros' },
        position: { x: 307, y: 25 }
      },
      {
        data: { id: 'node8', label: 'Registros identificados de:* \n Bases de datos (n = 0) \n Registros (n = 0)' },
        position: { x: 170, y: 100 }
      },
      {
        data: { id: 'node9', label: 'Registros eliminados antes del cribado: \n Registros duplicados eliminados (n = 0) \n Registros marcados como no elegibles por \n herramientas de automatización (n = 0) \n Registros eliminados por otras razones (n = 0)' },
        position: { x: 402, y: 100 }
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
        position: { x: 379, y: 200 }
      },
      {
        data: { id: 'node14', label: 'Informes no recuperados (n = 0)' },
        position: { x: 379, y: 265 }
      },
      {
        data: { id: 'node15', label: 'Informes excluidos: \n Razón 1 (n = 0) \n Razón 2 (n = 0) \n Razón 3 (n = 0) \n etc.' },
        position: { x: 379, y: 340 }
      },
      {
        data: { id: 'node16', label: 'Nuevos estudios incluidos \n en la revisión (n = 0) \n Informes de nuevos \n estudios incluidos (n = 0)' },
        position: { x: 170, y: 440 }
      },

      // Columna 3: node7, node2
      {
        data: { id: 'node7', label: 'Identificación de nuevos estudios a través de otros métodos' },
        position: { x: 755, y: 25 }
      },
      {
        data: { id: 'node1', label: 'Registros identificados de: \n Sitios web (n = 0) \n Organizaciones (n = 0) \n Búsqueda de citas (n = ) \n etc.' },
        position: { x: 650, y: 100 }
      },
      {
        data: { id: 'node2', label: 'Informes buscados para \n recuperación (n = 0)' },
        position: { x: 650, y: 265 }
      },
      {
        data: { id: 'node17', label: 'Informes no recuperados (n = 0)' },
        position: { x: 850, y: 265 }
      },
      {
        data: { id: 'node18', label: 'Informes evaluados para \n elegibilidad (n = 0)' },
        position: { x: 650, y: 350 }
      },
      {
        data: { id: 'node19', label: 'Informes excluidos: \n Motivo 1 (n = 0) \n Motivo 2 (n = 0) \n Motivo 3 (n = 0) \n etc.' },
        position: { x: 850, y: 350 }
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
      },
      {
        data: { id: 'edge10', source: 'node2', target: 'node17' }
      },
      {
        data: { id: 'edge11', source: 'node2', target: 'node18' }
      },
      {
        data: { id: 'edge12', source: 'node18', target: 'node19' }
      },
      {
        data: { id: 'edge13', source: 'node18', target: 'node16' }
      }
    ];
  }

  async loadEstudiosData() {
    const response = await this.authService.getEstudiosByRevision(+this.reviewId);
    if (response.data) {
      const estudios = response.data;
      // Supongamos que cada estudio tiene la propiedad 'database' que indica la base de datos utilizada.
      // Si la propiedad tiene otro nombre, ajústala según corresponda.
      const agrupados = estudios.reduce((acc, estudio) => {
        const db = estudio.fuente_bibliografica || 'Desconocido';
        acc[db] = (acc[db] || 0) + 1;
        return acc;
      }, {} as { [db: string]: number });

      // Armamos la etiqueta con el formato deseado:
      let labelLines: string[] = [];
      labelLines.push("Registros identificados:");
      const dbEntries = Object.entries(agrupados);
      dbEntries.forEach(([db, count], index) => {
        let punctuation = "";
        if (index === 0) {
          // Primer registro: termina con punto.
          punctuation = '.';
        } else if (index < dbEntries.length - 1) {
          // Los intermedios: terminan con coma.
          punctuation = ',';
        } else {
          // El último sin puntuación.
          punctuation = '';
        }
        labelLines.push(`${db} (n = ${count})${punctuation}`);
      });
      labelLines.push(""); // Línea en blanco
      const total = estudios.length;
      labelLines.push(`Total Registros (${total})`);

      // Actualiza el dato del nodo "node8" en Cytoscape, si ya está inicializado:
      /*if (this.cy) {
        const node8 = this.cy.$('#node8');
        node8.data('label', this.node8Label);
      }*/
    } else {
      console.error('Error al cargar estudios:', response.error);
    }
  }

  /** Construye nodos/edges para la versión reducida */
  getShortVersionElements(): cytoscape.ElementDefinition[] {
    if (!this.metrics) return [];

    const m = this.metrics;
    const fuentesText = m.perSource
      .map(ps => `${ps.fuente} (n = ${ps.count})`)
      .join('\n');
    // Ahora sólo mostramos el código ECx y su conteo
    const criteriosText = m.excludedByCriteria
      .map(c => `${c.code} (n = ${c.count})`)
      .join('\n');

    return [
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
        position: { x: 50, y: 440 }
      },
      {
        data: { id: 'node6', label: 'Identificación de nuevos estudios a través de bases de datos y registros' },
        position: { x: 307, y: 25 }
      },
      {
        data: {
          id: 'node8',
          label: `Registros identificados:\n${fuentesText}\nTotal (n = ${m.totalIdentified})`
        },
        position: { x: 170, y: 100 }
      },
      {
        data: {
          id: 'node9',
          label: `Registros eliminados antes del cribado:\nDuplicados (n = ${m.duplicatesCount})`
        },
        position: { x: 402, y: 100 }
      },
      {
        data: {
          id: 'node10',
          label: `Registros cribados (n = ${m.screenedCount})`
        },
        position: { x: 170, y: 265 }
      },
      {
        data: {
          id: 'node15',
          label: `Informes excluidos:\n${criteriosText}`
        },
        position: { x: 379, y: 265 }
      },
      {
        data: {
          id: 'node16',
          label: `Registros incluidos en \nel estudio (n = ${m.includedCount})`
        },
        position: { x: 170, y: 440 }
      },

      // Conexiones
      { data: { id: 'edge2', source: 'node8', target: 'node9' } },
      { data: { id: 'edge3', source: 'node8', target: 'node10' } },
      { data: { id: 'edge6', source: 'node10', target: 'node15' } },
      { data: { id: 'edge9', source: 'node10', target: 'node16' } }
    ];
  }

  // Estilos para la versión completa
  getFullVersionStyle() {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#11479e',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': 'label',
          'height': 'label',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': '10px'
        } as any
      },
      {
        selector: '#node4',
        style: {
          'background-color': '#BCD2EE',
          'width': '10px',
          'height': '210px',
          'text-wrap': 'wrap',
          'text-max-width': '200px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'text-rotation': 11,
          'shape': 'roundrectangle'
        }
      },
      {
        selector: '#node3, #node5',
        style: {
          'background-color': '#BCD2EE',
          'width': '10px',
          'height': '80px',
          'text-wrap': 'wrap',
          'text-max-width': '200px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'text-rotation': 11,
          'shape': 'roundrectangle'
        } as any
      },
      {
        selector: '#node6',
        style: {
          'background-color': '#FFC125',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '392px',
          'height': 'label',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px'
        }
      },
      {
        selector: '#node7',
        style: {
          'background-color': '#DCDCDC',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '340px',
          'height': 'label',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px'
        }
      },
      {
        selector: '#node8, #node16',
        style: {
          'background-color': '#FFFFFF',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': 'label',         // Ancho se calcula en base al contenido
          'height': 'label',        // Altura se calcula en base al contenido
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: '#node10',
        style: {
          'background-color': '#FFFFFF',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '110px',
          'height': '20px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: '#node9',
        style: {
          'background-color': '#FFFFFF',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '203px',
          'height': '40px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: '#node15',
        style: {
          'background-color': '#FFFFFF',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '150px',
          'height': '35px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: '#node1',
        style: {
          'background-color': '#DCDCDC',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '150px',
          'height': '40px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: '#node2',
        style: {
          'background-color': '#DCDCDC',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': '110px',
          'height': '20px',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 3,
          'line-color': '#333a',
          'target-arrow-color': '#333',
          'target-arrow-shape': 'triangle',
          'curve-style': 'taxi',
          'taxi-turn': 90,
          'taxi-turn-min-distance': 20
        } as any
      }
    ];
  }

  // Estilos para la versión reducida
  getShortVersionStyle() {
    return [
      {
        selector: 'node',
        style: {
          'background-color': '#11479e',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': 'label',
          'height': 'label',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': '#fff',
          'font-size': '10px'
        } as any
      },
      {
        selector: '#node3, #node4, #node5',
        style: {
          'background-color': '#BCD2EE',
          'width': 'label',
          'height': 'label',
          'text-wrap': 'wrap',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'shape': 'roundrectangle'
        }
      },
      {
        selector: '#node6',
        style: {
          'background-color': '#FFC125',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'width': 'label',
          'height': 'label',
          'text-wrap': 'wrap',
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px'
        }
      },
      {
        selector: '#node8',
        style: {
          'background-color': '#FFFFFF',
          'label': 'data(label)',
          'shape': 'roundrectangle',
          'padding': '10px',
          'text-wrap': 'wrap',
          'width': 'label',         // Ancho se calcula en base al contenido
          'height': 'label',        // Altura se calcula en base al contenido
          'text-valign': 'center',
          'text-halign': 'center',
          'color': 'black',
          'font-size': '10px',
          'border-width': '2px',
          'border-color': '#000000'
        }
      },
      // Agrega más selectores si es necesario para tu versión reducida

      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#9dbaea',
          'target-arrow-color': '#9dbaea',
          'target-arrow-shape': 'triangle',
          'curve-style': 'taxi',
          'taxi-turn': 90,
          'taxi-turn-min-distance': 20
        } as any
      }
    ];
  }

  async ngAfterViewInit() {
    // Inicializar Cytoscape al cargar la vista
    this.initializeCytoscape();

    this.loadEstudiosData();

  }

}

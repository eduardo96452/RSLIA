import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';
import { OpenAiService } from '../../../conexion/openAi.service';
import { DoiApiService } from '../../../conexion/doiApi.service';

@Component({
  selector: 'app-extraccion-datos',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './extraccion-datos.component.html',
  styleUrl: './extraccion-datos.component.css'
})
export class ExtraccionDatosComponent implements OnInit  {
  reviewId!: string;
  reviewData: any = {};
  titulo_revision = '';
  tipo_revision = '';
  descripcion = '';
  userData: any = null;
  isLargeScreen: boolean = true;

  constructor(
      private route: ActivatedRoute,
      private authService: AuthService,
      private fb: FormBuilder,
      private router: Router,
      private openAiService: OpenAiService
    ) { }

    
  async ngOnInit() {
    this.reviewId = this.route.snapshot.queryParams['id'];
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
}

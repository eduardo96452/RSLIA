import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  activeLink: string = 'inicio';
  userData: any = null;
  isLoggedIn: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación
    this.authService.isAuthenticated().subscribe((loggedIn) => {
      this.isLoggedIn = loggedIn;
      if (loggedIn) {
        // Si está autenticado, cargamos los datos del usuario
        this.loadUserData();
      } else {
        // Si no está autenticado, limpiamos los datos del usuario
        this.userData = null;
      }
    });
  }

  async loadUserData() {
    try {
      this.userData = await this.authService.getCurrentUserData();
    } catch (error) {
      console.error('Error al cargar los datos del usuario:', error);
    }
  }

  async logout() {
    try {
      // Llamada al método de cierre de sesión de tu servicio
      await this.authService.signOut();

      // Limpia la información del navegador
      localStorage.clear();
      sessionStorage.clear();

      // Navega a la pantalla de inicio de sesión
      this.router.navigate(['/log-in']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  setActiveLink(link: string): void {
    this.activeLink = link; // Cambia el enlace activo
  }
}

import { Component, HostListener, OnInit } from '@angular/core';
import { AuthService } from '../../auth/data-access/auth.service';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  activeLink: string = 'inicio';
  userData: any = null;
  isLoggedIn: boolean = false;
  isLargeScreen: boolean = true;
  isDarkModeEnabled: boolean = false;

  constructor(private authService: AuthService, private router: Router) { }

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
    this.checkScreenSize();

    // Recupera el valor del localStorage y actualiza la variable
    const darkMode = localStorage.getItem('darkMode') === 'true';
    this.isDarkModeEnabled = darkMode;
    this.applyDarkMode(this.isDarkModeEnabled);
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  toggleDarkMode(): void {
    // Como estamos usando [(ngModel)], la variable ya se actualizó
    localStorage.setItem('darkMode', this.isDarkModeEnabled.toString());
    this.applyDarkMode(this.isDarkModeEnabled);
  }

  applyDarkMode(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
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

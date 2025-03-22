import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

export interface logIn {
  email: string;
  password: string;
}

@Component({
  selector: 'app-auth-log-in',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './auth-log-in.component.html',
  styleUrl: './auth-log-in.component.scss'
})
export class AuthLogInComponent {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;
  acceptTerms: boolean = false;
  isModalOpen: boolean = false;

  constructor(private _authService: AuthService, private router: Router) { }
  
  openTermsModal(event: Event): void {
    event.preventDefault(); // Evita que el enlace recargue la página
    this.isModalOpen = true; // Abre el modal
  }

  closeTermsModal(): void {
    this.isModalOpen = false; // Cierra el modal
  }

  async handleEmailLogin() {
    if (this.email && this.password) {
      try {
        this._authService.logIn({ email: this.email, password: this.password })
          .then(({ data, error }) => {
            if (error) {
              const errorMsg = this.getErrorMessage(error);
              Swal.fire({
                icon: 'error',
                title: 'Error en el inicio de sesión',
                text: errorMsg,
              });
              return;
            }
            
            // Si llega aquí, significa que no hubo error
            Swal.fire({
              icon: 'success',
              title: '¡Inicio de sesión exitoso!',
              text: 'Bienvenido a tu panel principal.',
            }).then(() => {
              this.router.navigate(['/panel_principal']);
            });
          })
          .catch(error => {
            const errorMsg = this.getErrorMessage(error);
            console.error('Error en el inicio de sesión:', errorMsg);
            Swal.fire({
              icon: 'error',
              title: 'Error en el inicio de sesión',
              text: errorMsg,
            });
          });
      } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error inesperado',
          text: 'Ocurrió un problema. Por favor, inténtalo nuevamente.',
        });
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos.',
      });
    }
  }
  
  // Función para traducir los mensajes de error
  private getErrorMessage(error: any): string {
    // Si no existe el objeto error o no tiene message, retornamos un mensaje genérico
    if (!error || !error.message) {
      return 'Error desconocido. Por favor, inténtalo nuevamente.';
    }
  
    // Dependiendo del mensaje de error original, devolvemos su traducción
    switch (error.message) {
      case 'Invalid login credentials':
        return 'Credenciales de inicio de sesión inválidas.';
      case 'Email not confirmed':
        return 'El correo electrónico no está confirmado.';
      // Agrega más casos si detectas otros mensajes en inglés que quieras traducir
      default:
        // Si no coincide con ningún caso, podrías devolver el mensaje original
        // o un mensaje genérico en español
        return 'Ocurrió un error al iniciar sesión. Por favor, revisa tus datos.';
    }
  }

  handleGoogleLogin() {
    // TODO: Implement Google authentication
    console.log('Google login initiated');
    // For now, just show a success message
    alert('Google login successful!');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

}

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
            // Verificar si Supabase retorna error en la respuesta
            if (error) {
              // Manejar la presencia de error
              Swal.fire({
                icon: 'error',
                title: 'Error en el inicio de sesión',
                text: error.message,
              });
              return; 
            }
            
            // Si no hay error, significa que el login fue exitoso
            Swal.fire({
              icon: 'success',
              title: '¡Inicio de sesión exitoso!',
              text: 'Bienvenido a tu panel principal.',
            }).then(() => {
              this.router.navigate(['/panel_principal']);
            });
          })
          .catch(error => {
            // Este catch se ejecutará si ocurre un error inesperado en la comunicación
            console.error('Error en el inicio de sesión:', error.message);
            Swal.fire({
              icon: 'error',
              title: 'Error en el inicio de sesión',
              text: error.message,
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

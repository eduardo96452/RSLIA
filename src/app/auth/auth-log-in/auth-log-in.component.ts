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

  constructor(private _authService: AuthService, private router: Router) { }


  //verificar alerta que sale al iniciar sesion
  async handleEmailLogin() {
    if (this.email && this.password) {
      try {
        this._authService.logIn({ email: this.email, password: this.password })
          .then(response => {
            // Manejar respuesta sin mostrar datos
            // Por ejemplo, redirigir al usuario sin mostrar el contenido del response
            Swal.fire({
              icon: 'success',
              title: '¡Inicio de sesión exitoso!',
              text: 'Bienvenido a tu panel principal.',
            }).then(() => {
              // Redirige a la página deseada
              this.router.navigate(['/panel_principal']);
            });
          })
          .catch(error => {
            // Manejar errores sin mostrar datos sensibles
            console.error('Error en el inicio de sesión:', error.message);
            Swal.fire({
              icon: 'error',
              title: 'Error en el inicio de sesión',
              text: error.message,
            });
            return; // O muestra un mensaje amigable
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

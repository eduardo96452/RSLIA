import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../modelo/usuario.model';
import { AuthService } from '../data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { NavbarComponent } from '../../principal/navbar/navbar.component';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-auth-sign-up',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './auth-sign-up.component.html',
  styleUrl: './auth-sign-up.component.css'
})
export class AuthSignUpComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(private _authService: AuthService, private router: Router) { }


  async handleEmailSignup() {
    if (this.email && this.password && this.name) {
      try {
        // Configura las credenciales para el registro
        const credentials: SignUpWithPasswordCredentials = {
          email: this.email,
          password: this.password,
          options: {
            data: {
              name: this.name
            }
          }
        };
  
        const { data: authData, error: authError } = await this._authService.signUp(credentials);
  
        if (authError) {
          console.error('Error en el registro:', authError.message);
          Swal.fire({
            icon: 'error',
            title: 'Error en el registro',
            text: authError.message,
          });
          return;
        }
  
        if (authData?.user) {
          const id_usuario = authData.user.id; // Paso 2: Obtén la UID generada
          console.log('UID obtenida:', id_usuario);
  
          // Paso 3: Inserta el usuario en la tabla de Supabase
          const { error: dbError } = await this._authService.addUserToDatabase(
            id_usuario,
            this.name,
            this.email,
            this.password
          );
  
          if (dbError) {
            console.error('Error al guardar el usuario en la base de datos:', dbError.message);
            Swal.fire({
              icon: 'error',
              title: 'Error al guardar el usuario',
              text: dbError.message,
            });
            return;
          }
  
          console.log('Usuario guardado en la base de datos.');
  
          // Paso 4: Guarda la UID en el localStorage y redirige
          localStorage.setItem('session_ID', id_usuario); // Guarda solo la UID
          Swal.fire({
            icon: 'success',
            title: 'Cuenta creada con éxito',
            text: 'Revisa tu correo para verificar tu cuenta.',
          }).then(() => {
            this.router.navigate(['/log-in']);
          });
        }
      } catch (error) {
        console.error('Error en el registro:', error);
        Swal.fire({
          icon: 'error',
          title: 'Ocurrió un error inesperado',
          text: 'Por favor, inténtalo nuevamente.',
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

  handleGoogleSignup() {
    // TODO: Implement Google signup
    console.log('Registro con Google iniciado.');
    // For now, just show a success message
    alert('¡Registro con Google exitoso!');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}

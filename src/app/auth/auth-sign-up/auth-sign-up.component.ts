import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../modelo/usuario.model';
import { AuthService } from '../data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-auth-sign-up',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth-sign-up.component.html',
  styleUrl: './auth-sign-up.component.css'
})
export class AuthSignUpComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  // Objeto para almacenar el estado (true/false) de cada política
  policyChecks = {
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  };

  constructor(private _authService: AuthService, private router: Router) { }

  async handleEmailSignup() {
    // 1. Validar campos básicos
    if (!this.name || !this.email || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos.',
      });
      return;
    }
  
    // 2. Validar políticas de contraseña
    // (Asegúrate de haber llamado a checkPasswordPolicy() en (input) de tu password
    // para que se actualicen las políticas cada vez que se escribe)
    if (!this.allPoliciesMet()) {
      Swal.fire({
        icon: 'error',
        title: 'Políticas de contraseña',
        text: 'La contraseña no cumple con todas las políticas requeridas.',
      });
      return;
    }
  
    try {
      // 3. Configura las credenciales para el registro en Supabase
      const credentials: SignUpWithPasswordCredentials = {
        email: this.email,
        password: this.password,
        options: {
          data: {
            name: this.name
          }
        }
      };
  
      // 4. Realiza el registro en Auth
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
  
      // 5. Si se creó el usuario correctamente, guardamos en la DB
      if (authData?.user) {
        const id_usuario = authData.user.id; // UID en Supabase
        console.log('UID obtenida:', id_usuario);
  
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
  
        // 6. Guarda la UID en localStorage y redirige
        localStorage.setItem('session_ID', id_usuario);
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

  // Verificar políticas de contraseña conforme el usuario escribe
  checkPasswordPolicy(): void {
    const pwd = this.password || '';
    this.policyChecks.minLength = pwd.length >= 8;
    this.policyChecks.uppercase = /[A-Z]/.test(pwd);
    this.policyChecks.number = /\d/.test(pwd);
    this.policyChecks.specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  }

  // Validar que todas las políticas se cumplan
  allPoliciesMet(): boolean {
    return (
      this.policyChecks.minLength &&
      this.policyChecks.uppercase &&
      this.policyChecks.number &&
      this.policyChecks.specialChar
    );
  }
}

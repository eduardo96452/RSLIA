import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../modelo/usuario.model';
import { AuthService } from '../data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';


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

    constructor(private _authService: AuthService, private router: Router) {}

  
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
  
          // Llama al servicio para el registro
          const { data, error } = await this._authService.signUp(credentials);
  
          // Verifica si el registro fue exitoso
          if (error) {
            console.error('Error en el registro:', error.message);
            alert('Error en el registro: ' + error.message);
          } else if (data?.user) {
            // Obtiene el ID del usuario registrado
            const id_usuario = data.user.id;
  
            // Llama a la función para agregar al usuario en la base de datos
            const { error: dbError } = await this._authService.addUserToDatabase(
              id_usuario,
              this.name,
              this.email,
              this.password
            );
  
            if (dbError) {
              console.error('Error al guardar el usuario en la base de datos:', dbError.message);
            } else {
              console.log('Usuario guardado en la base de datos');
              alert('¡Cuenta creada con éxito! Revisa tu correo para verificar tu cuenta.');
              this.router.navigate(['/log-in']);
            }
          }
        } catch (error) {
          console.error('Error en el registro:', error);
        }
      } else {
        alert('Por favor completa todos los campos.');
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

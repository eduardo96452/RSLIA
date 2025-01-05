import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/data-access/auth.service';
import { SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { NavbarComponent } from '../../principal/navbar/navbar.component';

export interface logIn {
  email: string;
  password: string;
}

@Component({
  selector: 'app-auth-log-in',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule, NavbarComponent],
  templateUrl: './auth-log-in.component.html',
  styleUrl: './auth-log-in.component.scss'
})
export class AuthLogInComponent {
  email: string = '';
  password: string = '';
  showPassword: boolean = false;

  constructor(private _authService: AuthService, private router: Router) {}
  
  async handleEmailLogin() {
    if (this.email && this.password) {
      try {
        
        const { error, data } = await this._authService.logIn({
          email: this.email,
          password: this.password,
        });

        if (error) {
          console.error('Error en el inicio de sesión:', error.message);
          alert('Error en el inicio de sesión: ' + error.message);
        } else {
          console.log('Usuario autenticado:', data);
          alert('¡Inicio de sesión exitoso!');

          // Redirige a la página de inicio o a la ruta deseada
          this.router.navigate(['/panel_principal']);
        }
        
      } catch (error) {
        console.error('Error en el inicio de sesión:', error);
      }
    } else {
      alert('Por favor completa todos los campos.');
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

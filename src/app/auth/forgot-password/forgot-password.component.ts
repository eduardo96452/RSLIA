import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import Swal from 'sweetalert2';
import { AuthService } from '../data-access/auth.service'; // Ajusta la ruta
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  forgotForm!: FormGroup;
  loading = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email() {
    return this.forgotForm.get('email')!;
  }

  async onSubmit() {
    if (this.forgotForm.valid) {
      this.loading = true;
      const emailValue = this.email.value;

      const { error } = await this.authService.sendResetEmail(emailValue);
      this.loading = false;
      if (error) {
        console.error('Error al enviar correo de reseteo:', error);
        Swal.fire('Error', 'No se pudo enviar el enlace de reseteo. Intenta de nuevo.', 'error');
      } else {
        Swal.fire(
          '¡Enviado!',
          'Revisa tu correo (incluida la carpeta de Spam o Correos no deseados) para el enlace de reseteo.',
          'success'
        );
      }
    }
  }
}


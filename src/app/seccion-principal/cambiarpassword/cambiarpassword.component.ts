import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { AuthService } from '../../auth/data-access/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cambiarpassword',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    RouterLink,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule],
  templateUrl: './cambiarpassword.component.html',
  styleUrl: './cambiarpassword.component.css'
})
export class CambiarpasswordComponent implements OnInit {
  changePasswordForm!: FormGroup;
  isLargeScreen: boolean = true;
  // Objeto para chequear políticas de la contraseña
  policyChecks: {
    minLength: boolean;
    uppercase: boolean;
    number: boolean;
    specialChar: boolean;
  } = {
      minLength: false,
      uppercase: false,
      number: false,
      specialChar: false
    };

  showPassword: boolean = false;
  showPassword1: boolean = false;
  showPassword2: boolean = false;

  constructor(private fb: FormBuilder, private authService: AuthService,) { }

  ngOnInit(): void {
    this.buildForm();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isLargeScreen = window.innerWidth >= 768; // Cambia a true si la pantalla es md o más grande
  }


  buildForm(): void {
    this.changePasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required]],
        confirmPassword: ['', [Validators.required]]
      },
      {
        validators: [this.passwordsMatchValidator]
      }
    );
  }

  passwordsMatchValidator(formGroup: AbstractControl) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;
    if (newPassword !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ mustMatch: true });
    } else {
      formGroup.get('confirmPassword')?.setErrors(null);
    }
    return null;
  }

  // Chequear políticas cada vez que el usuario escribe en "nueva contraseña"
  checkPasswordPolicy() {
    const pwd = this.newPassword.value || '';

    this.policyChecks.minLength = pwd.length >= 8;
    this.policyChecks.uppercase = /[A-Z]/.test(pwd);
    this.policyChecks.number = /\d/.test(pwd);
    this.policyChecks.specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  }

  // Si todas las políticas están cumplidas (true), devolvemos true
  allPoliciesMet(): boolean {
    return (
      this.policyChecks.minLength &&
      this.policyChecks.uppercase &&
      this.policyChecks.number &&
      this.policyChecks.specialChar
    );
  }

  get newPassword() {
    return this.changePasswordForm.get('newPassword')!;
  }

  get confirmPassword() {
    return this.changePasswordForm.get('confirmPassword')!;
  }

  // Dentro de la función onSubmit o similar:
  async onSubmit(): Promise<void> {
    if (this.changePasswordForm.valid && this.allPoliciesMet()) {
      const newPassword = this.changePasswordForm.value.newPassword;

      const { error } = await this.authService.changePassword(newPassword);

      if (error) {
        // Maneja el error, por ejemplo:
        console.error('Error al cambiar contraseña:', error);
        Swal.fire('Error', 'No se pudo cambiar la contraseña.', 'error');
      } else {
        // Éxito
        Swal.fire('¡Listo!', 'La contraseña se cambió correctamente.', 'success');
        this.changePasswordForm.reset();
      }
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordVisibility1() {
    this.showPassword1 = !this.showPassword1;
  }

  togglePasswordVisibility2() {
    this.showPassword2 = !this.showPassword2;
  }
}
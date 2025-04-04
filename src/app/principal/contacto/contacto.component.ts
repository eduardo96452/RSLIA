import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [FormsModule, HttpClientModule],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.css'
})
export class ContactoComponent {
  // Objeto para almacenar los datos del formulario
  contactData = {
    name: '',
    email: '',
    message: ''
  };

  // Inyectamos HttpClient para hacer la petición
  constructor(private http: HttpClient) { }

  // Método que se ejecuta al enviar el formulario
  onSubmit(): void {
    console.log('Datos de contacto:', this.contactData);

    // Llamada POST al backend
    this.http.post('https://backend-chatgpt-g3rn.onrender.com/api/contact', this.contactData)
      .subscribe({
        next: (response: any) => {
          // Manejo de respuesta exitosa
          Swal.fire({
            icon: 'success',
            title: 'Mensaje enviado',
            text: 'Gracias por contactarnos',
            confirmButtonText: 'OK'
          });

          // Limpiar el formulario
          this.contactData = { name: '', email: '', message: '' };
        },
        error: (error) => {
          // Manejo de error
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo enviar el mensaje',
            confirmButtonText: 'OK'
          });
          console.error('Error al enviar mensaje de contacto:', error);
        }
      });
  }
}

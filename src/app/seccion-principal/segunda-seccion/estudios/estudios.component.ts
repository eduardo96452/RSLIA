import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [RouterLink,CommonModule, FormsModule],
  templateUrl: './estudios.component.html',
  styleUrl: './estudios.component.css'
})
export class EstudiosComponent {
  libraryName: string = ''; // Nombre de la biblioteca
  importedData: { field: string; value: string }[] = []; // Datos importados del archivo
  tabs: string[] = ['Selección de estudios']; // Tabs dinámicos
  fileContent: string = ''; // Contenido del archivo cargado

  // Manejar cambio en el input de archivo
  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  // Procesar e importar estudios
  importStudies(): void {
    if (this.libraryName.trim() && this.fileContent) {
      // Procesar el archivo cargado (ejemplo simple)
      const lines = this.fileContent.split('\n');
      this.importedData = lines
        .filter(line => line.includes('='))
        .map(line => {
          const [field, value] = line.split('=');
          return { field: field.trim(), value: value.trim() };
        });

      // Agregar un nuevo tab
      this.tabs.push(this.libraryName.trim());

      // Limpiar modal
      this.libraryName = '';
      this.fileContent = '';
      const modal = document.getElementById('staticBackdrop') as any;
      if (modal) modal.classList.remove('show'); // Cerrar el modal manualmente
    } else {
      alert('Por favor, complete todos los campos y cargue un archivo válido.');
    }
  }
}

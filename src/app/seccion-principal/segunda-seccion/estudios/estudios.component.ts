import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from "../../../principal/navbar/navbar.component";
declare var bootstrap: any;

@Component({
  selector: 'app-estudios',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent],
  templateUrl: './estudios.component.html',
  styleUrl: './estudios.component.css'
})
export class EstudiosComponent {
  libraryName: string = '';
  importedData: { field: string; value: string }[] = [];
  tabs: string[] = ['Selección de estudios'];
  fileContent: string = '';

  logLibraryName() {
    console.log(this.libraryName);
  }
  

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fileContent = e.target.result;
        console.log('Archivo cargado correctamente:', this.fileContent); // Log de depuración
      };
      reader.readAsText(file);
    } else {
      console.error('No se seleccionó ningún archivo.'); // Log de error
    }
  }

  importStudies(): void {
    if (this.libraryName.trim() && this.fileContent) {
      const lines = this.fileContent.split('\n');
      const data = lines
        .filter(line => line.includes('='))
        .map(line => {
          const [field, value] = line.split('=');
          const cleanedValue = value.trim().replace(/[{}]|\,$/g, ''); // Eliminar llaves y coma al final
          
          return { field: field.trim(), value: cleanedValue };
        });
  
      // Aquí separaremos los campos y valores por "DOI"
      const groupedData: any = {};
      data.forEach(item => {
        const { field, value } = item;
        
        // Si el campo es DOI, no lo agrupamos (es una columna diferente)
        if (field === 'DOI') {
          groupedData[field] = value;
        } else {
          if (!groupedData[field]) {
            groupedData[field] = [];
          }
          
          // Si el valor es una lista de autores, dividimos por coma y agregamos en filas separadas
          if (field === 'authors') {
            const authors = value.split(',').map((author: string) => author.trim());
            groupedData[field].push(...authors);
          } else {
            groupedData[field].push(value);
          }
        }
      });
  
      // Convertimos el objeto agrupado en un arreglo para su visualización
      this.importedData = Object.keys(groupedData).map(key => ({
        field: key,
        value: groupedData[key]
      }));
  
    } else {
      alert('Por favor, complete todos los campos y cargue un archivo válido.');
    }
  }
}
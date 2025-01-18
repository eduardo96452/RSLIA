import { AfterViewInit, Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as go from 'gojs';

@Component({
  selector: 'app-informes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './informes.component.html',
  styleUrl: './informes.component.css'
})
export class InformesComponent {
  constructor(private renderer: Renderer2, private el: ElementRef) {}

  crearNodo() {
    // Crea un elemento <p>
    const parrafo = this.renderer.createElement('p');

    // Crea un nodo de texto
    const texto = this.renderer.createText('Este es un párrafo creado dinámicamente');

    // Añade el texto al elemento <p>
    this.renderer.appendChild(parrafo, texto);

    // Encuentra el elemento contenedor en el DOM
    const contenedor = this.el.nativeElement.querySelector('#contenedor');

    // Añade el nuevo párrafo al contenedor
    this.renderer.appendChild(contenedor, parrafo);
  }
}